import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type ElectronApplication, expect, type Page, test } from "@playwright/test";
import { _electron as electron } from "playwright";

import { EXISTING_DATA_RESPONSE } from "../src/constants";

const APP_DIR = path.join(__dirname, "..");
const TEST_DATA_DIR = path.join(__dirname, "data");

const FETCH_ERROR_PATTERN = /CORS|ERR_FAILED|Failed to fetch|Photo load failed|Failed to load/i;

let app: ElectronApplication;
let mainPage: Page;
let projectDir: string;
let userDataDir: string;

test.describe
  .serial("Edit window", () => {
    test.beforeAll(async () => {
      projectDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "photo-id-e2e-"));
      userDataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "photo-id-e2e-userdata-"));

      const files = await fs.promises.readdir(TEST_DATA_DIR);
      for (const file of files) {
        await fs.promises.copyFile(path.join(TEST_DATA_DIR, file), path.join(projectDir, file));
      }

      const args = [APP_DIR, `--user-data-dir=${userDataDir}`];
      if (process.platform === "linux") {
        args.push("--no-sandbox");
      }

      app = await electron.launch({
        args,
        env: { ...process.env, E2E: "true" },
      });

      await app.evaluate(
        ({ dialog }, { dir, response }) => {
          dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [dir] });
          dialog.showMessageBox = () => Promise.resolve({ response, checkboxChecked: false });
          dialog.showErrorBox = (title: string, content: string) => {
            console.error(`[E2E dialog.showErrorBox] ${title}: ${content}`);
          };
        },
        { dir: projectDir, response: EXISTING_DATA_RESPONSE.REPLACE },
      );

      mainPage = await app.firstWindow();
      await mainPage.waitForLoadState("domcontentloaded");
    });

    test.afterAll(async () => {
      if (process.platform === "linux") {
        try {
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

    test("opens the edit window and loads the photo successfully", async () => {
      await mainPage.getByRole("button", { name: "Start New Project" }).click();
      await expect(mainPage.getByTestId("project-page")).toBeVisible({ timeout: 30_000 });

      const editButton = mainPage
        .getByTestId("unassigned-section")
        .getByTestId("edit-photo-button");
      await expect(editButton).toBeEnabled();

      // Diagnostic: capture what `waitForEvent("window")` returns so we can compare against the
      // polled result below. Failing CI on Windows/macOS showed `editorPage` ending up with main
      // window content, but we never confirmed what URL waitForEvent actually resolved with.
      const waitForEventResult = app
        .waitForEvent("window", { timeout: 15_000 })
        .then((page) => `resolved url=${page.url()}`)
        .catch((error: Error) => `rejected: ${error.message}`);

      await editButton.click();

      console.log(`[diagnostic] waitForEvent("window") ${await waitForEventResult}`);
      console.log(
        `[diagnostic] all windows after click: ${app
          .windows()
          .map((page) => page.url())
          .join(" | ")}`,
      );

      /**
       * Edit windows are created with `show: false` and shown when ready, which makes
       * `electronApp.waitForEvent("window")` flaky on macOS/Windows (it can resolve with the main
       * window before the editor is registered). Poll `app.windows()` for the URL instead.
       */
      let editorPage: Page | undefined;
      await expect
        .poll(
          () => {
            editorPage = app.windows().find((page) => page.url().includes("#/edit"));
            return editorPage !== undefined;
          },
          { timeout: 15_000 },
        )
        .toBe(true);

      if (!editorPage) {
        throw new Error("Editor window did not open");
      }

      const errors: string[] = [];
      editorPage.on("pageerror", (error) => errors.push(error.message));
      editorPage.on("console", (message) => {
        if (message.type() === "error") {
          errors.push(message.text());
        }
      });

      await editorPage.waitForLoadState("domcontentloaded");

      // Editor should not surface the "Failed to load photo" error div from edit.tsx
      await expect(editorPage.getByText("Failed to load photo")).toHaveCount(0);
      await expect(
        editorPage.getByText("Failed to load image: the file may be corrupt"),
      ).toHaveCount(0);

      // Canvas is drawn only after image.onload fires, so non-zero dimensions prove the bytes
      // reached the renderer
      const canvas = editorPage.locator("canvas.canvas-photo");
      await expect(canvas).toBeVisible({ timeout: 15_000 });

      await expect
        .poll(
          async () =>
            canvas.evaluate(
              (el) => (el as HTMLCanvasElement).width > 0 && (el as HTMLCanvasElement).height > 0,
            ),
          { timeout: 15_000 },
        )
        .toBe(true);

      const fetchErrors = errors.filter((message) => FETCH_ERROR_PATTERN.test(message));
      expect(fetchErrors, `Unexpected fetch errors:\n${fetchErrors.join("\n")}`).toEqual([]);
    });
  });
