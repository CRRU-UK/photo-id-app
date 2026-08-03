import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type ElectronApplication, expect, type Locator, type Page, test } from "@playwright/test";
import { _electron as electron } from "playwright";

import {
  DUPLICATE_LIMIT_ERROR,
  EXISTING_DATA_RESPONSE,
  PROJECT_THUMBNAIL_DIRECTORY,
  PROJECT_TOOLTIPS,
} from "../src/constants";
import { drag, getPackagedBinaryPath } from "./electron.fixture";

const TEST_DATA_DIR = path.join(__dirname, "data");

/**
 * A CRRU-format name (`YYYYMMDD_NNND_AAA`) and a plain one, so both naming rules are exercised
 * through the real drag-and-drop flow, and fixed so each photo can be picked out of a stack whose
 * order follows the directory listing.
 */
const CRRU_PHOTO = "20240708_1420_ABC.jpg";
const PLAIN_PHOTO = "photo.jpg";

type ErrorBoxGlobal = typeof globalThis & {
  errorBoxes?: { title: string; content: string }[];
};

let app: ElectronApplication;
let page: Page;
let projectDir: string;
let userDataDir: string;

/** Records `showErrorBox` calls in the main process so tests can assert on them. */
const captureErrorBoxes = async (): Promise<void> => {
  await app.evaluate(({ dialog }) => {
    (globalThis as ErrorBoxGlobal).errorBoxes = [];

    dialog.showErrorBox = (title: string, content: string) => {
      (globalThis as ErrorBoxGlobal).errorBoxes?.push({ title, content });
    };
  });
};

const getErrorBoxes = async (): Promise<{ title: string; content: string }[]> =>
  app.evaluate(() => (globalThis as ErrorBoxGlobal).errorBoxes ?? []);

/** Advances a stack until `fileName` is the photo on show, identified by its thumbnail alt text. */
const showPhoto = async (section: Locator, fileName: string): Promise<void> => {
  for (let attempt = 0; attempt < 3; attempt = attempt + 1) {
    if (await section.getByRole("img", { name: fileName }).isVisible()) {
      return;
    }

    await section.getByRole("button", { name: PROJECT_TOOLTIPS.NEXT_PHOTO }).click();
  }

  throw new Error(`showPhoto: ${fileName} is not in this stack`);
};

const fileExists = (...parts: string[]): boolean => fs.existsSync(path.join(projectDir, ...parts));

test.describe
  .serial("Photo duplication", () => {
    test.beforeAll(async () => {
      projectDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "photo-id-e2e-"));
      userDataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "photo-id-e2e-userdata-"));

      await fs.promises.copyFile(
        path.join(TEST_DATA_DIR, "test-image-1.jpg"),
        path.join(projectDir, CRRU_PHOTO),
      );
      await fs.promises.copyFile(
        path.join(TEST_DATA_DIR, "test-image-2.jpg"),
        path.join(projectDir, PLAIN_PHOTO),
      );

      const args = [`--user-data-dir=${userDataDir}`];
      // Linux CI lacks a properly configured SUID sandbox
      if (process.platform === "linux") {
        args.push("--no-sandbox");
      }

      app = await electron.launch({
        executablePath: getPackagedBinaryPath(),
        args,
        env: { ...process.env, E2E: "true" },
      });

      await app.evaluate(
        ({ dialog }, { dir, response }) => {
          dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [dir] });
          dialog.showMessageBox = () => Promise.resolve({ response, checkboxChecked: false });
        },
        { dir: projectDir, response: EXISTING_DATA_RESPONSE.REPLACE },
      );

      await captureErrorBoxes();

      page = await app.firstWindow();
      await page.waitForLoadState("domcontentloaded");

      await page.getByRole("button", { name: "Start New Project" }).click();
      await expect(page.getByTestId("project-page")).toBeVisible({ timeout: 30_000 });
    });

    test.afterAll(async () => {
      if (process.platform === "linux") {
        try {
          /**
           * On Linux under xvfb-run, the Electron process stops responding to Playwright's CDP
           * protocol after tests complete, causing app.close() to hang indefinitely. Kill the
           * entire process group instead. See README for details.
           */
          const pid = app?.process()?.pid;

          if (pid) {
            process.kill(-pid, "SIGKILL");
          }
        } catch {
          // ESRCH: process group already exited
        }
      } else {
        await app?.close();
      }

      await fs.promises.rm(projectDir, { recursive: true, force: true });
      await fs.promises.rm(userDataDir, { recursive: true, force: true });
    });

    test("duplicates a CRRU photo into a matched stack, leaving the original in place", async () => {
      const unassigned = page.getByTestId("unassigned-section");
      await showPhoto(unassigned, CRRU_PHOTO);

      await drag(unassigned.getByTestId("photo-draggable"), page.getByTestId("match-1-left"), {
        copy: true,
      });

      await expect(
        page.getByTestId("match-1-left").getByText("1 / 1", { exact: true }),
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByTestId("match-1-left").getByRole("img", { name: "20240708_1421_ABC.jpg" }),
      ).toBeVisible();

      // The counter digit advances, and the thumbnail follows the new name
      expect(fileExists("20240708_1421_ABC.jpg")).toBe(true);
      expect(fileExists(PROJECT_THUMBNAIL_DIRECTORY, "20240708_1421_ABC.jpg")).toBe(true);

      // The original is copied, not moved
      expect(fileExists(CRRU_PHOTO)).toBe(true);
      await expect(unassigned.getByRole("img", { name: CRRU_PHOTO })).toBeVisible();
    });

    test("continues from the highest counter already on disk", async () => {
      const unassigned = page.getByTestId("unassigned-section");
      await showPhoto(unassigned, CRRU_PHOTO);

      await drag(unassigned.getByTestId("photo-draggable"), page.getByTestId("match-1-right"), {
        copy: true,
      });

      await expect(
        page.getByTestId("match-1-right").getByText("1 / 1", { exact: true }),
      ).toBeVisible({ timeout: 10_000 });

      expect(fileExists("20240708_1422_ABC.jpg")).toBe(true);
    });

    test("shows an error and writes nothing once the CRRU counter is exhausted", async () => {
      // Placed on disk only: the counter is scanned from the directory, not the project data
      await fs.promises.copyFile(
        path.join(projectDir, CRRU_PHOTO),
        path.join(projectDir, "20240708_1429_ABC.jpg"),
      );

      await captureErrorBoxes();

      const unassigned = page.getByTestId("unassigned-section");
      await showPhoto(unassigned, CRRU_PHOTO);

      await drag(unassigned.getByTestId("photo-draggable"), page.getByTestId("match-2-left"), {
        copy: true,
      });

      await expect
        .poll(getErrorBoxes, { timeout: 10_000 })
        .toContainEqual({ title: "Cannot duplicate photo", content: DUPLICATE_LIMIT_ERROR });

      expect(fileExists("20240708_1423_ABC.jpg")).toBe(false);
      await expect(
        page.getByTestId("match-2-left").getByText("1 / 1", { exact: true }),
      ).not.toBeVisible();
    });

    test("duplicates a non-CRRU photo with a numbered suffix", async () => {
      const unassigned = page.getByTestId("unassigned-section");
      await showPhoto(unassigned, PLAIN_PHOTO);

      await drag(unassigned.getByTestId("photo-draggable"), page.getByTestId("match-3-left"), {
        copy: true,
      });

      await expect(
        page.getByTestId("match-3-left").getByText("1 / 1", { exact: true }),
      ).toBeVisible({ timeout: 10_000 });

      expect(fileExists("photo_2.jpg")).toBe(true);
      expect(fileExists(PROJECT_THUMBNAIL_DIRECTORY, "photo_2.jpg")).toBe(true);
    });

    test("moves a photo normally without the copy modifier", async () => {
      const unassigned = page.getByTestId("unassigned-section");
      await showPhoto(unassigned, PLAIN_PHOTO);

      await drag(unassigned.getByTestId("photo-draggable"), page.getByTestId("match-4-left"));

      await expect(
        page.getByTestId("match-4-left").getByText("1 / 1", { exact: true }),
      ).toBeVisible({ timeout: 10_000 });

      // A move copies no file
      expect(fileExists("photo_3.jpg")).toBe(false);
      await expect(unassigned.getByRole("img", { name: PLAIN_PHOTO })).not.toBeVisible();
    });
  });
