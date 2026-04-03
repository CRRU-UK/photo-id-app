import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type ElectronApplication, expect, type Locator, type Page, test } from "@playwright/test";
import { _electron as electron } from "playwright";

import { EXISTING_DATA_RESPONSE } from "../src/constants";

const APP_DIR = path.join(__dirname, "..");
const TEST_DATA_DIR = path.join(__dirname, "data");

const PROJECT_EXPORT_DATA_DIRECTORY = "data";
const PROJECT_EXPORT_CSV_FILE_NAME = "matches.csv";
const PROJECT_EXPORT_DIRECTORY = "matched";

let app: ElectronApplication;
let page: Page;
let projectDir: string;

/**
 * Drags from the centre of `source` to the centre of `target` using pointer events. Moves slightly
 * off-centre first to exceed activation constraint.
 */
async function drag(source: Locator, target: Locator): Promise<void> {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error("drag: source or target element not found / not visible");
  }

  const fromX = sourceBox.x + sourceBox.width / 2;
  const fromY = sourceBox.y + sourceBox.height / 2;
  const toX = targetBox.x + targetBox.width / 2;
  const toY = targetBox.y + targetBox.height / 2;

  await source.page().mouse.move(fromX, fromY);
  await source.page().mouse.down();

  // Exceed dnd-kit activationConstraint distance
  await source.page().mouse.move(fromX + 12, fromY + 12);
  await source.page().mouse.move(toX, toY, { steps: 8 });
  await source.page().mouse.up();
}

test.describe
  .serial("Project lifecycle", () => {
    test.beforeAll(async () => {
      projectDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "photo-id-e2e-"));

      const files = await fs.promises.readdir(TEST_DATA_DIR);
      for (const file of files) {
        await fs.promises.copyFile(path.join(TEST_DATA_DIR, file), path.join(projectDir, file));
      }

      const args = [APP_DIR];
      // Linux CI lacks a properly configured SUID sandbox
      if (process.platform === "linux") {
        args.push("--no-sandbox");
      }

      app = await electron.launch({
        args,
        env: { ...process.env, E2E: "true" },
      });

      // Default dialog mock: open dialog returns project dir, message box replaces existing data
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

      page = await app.firstWindow();
      await page.waitForLoadState("domcontentloaded");
    });

    test.afterAll(async () => {
      if (process.platform === "linux") {
        try {
          /**
           * On Linux under xvfb-run, the Electron process stops responding to Playwright's CDP protocol
           * after tests complete, causing app.close() to hang indefinitely. Kill the entire process
           * group instead. See README for details.
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
    });

    // ── Project creation ──────────────────────────────────────────────────────

    test("creates a new project from a folder", async () => {
      await expect(page.getByRole("heading", { name: "Photo ID" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Start New Project" })).toBeVisible();

      await page.getByRole("button", { name: "Start New Project" }).click();

      await expect(page.getByTestId("project-page")).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByTestId("sidebar")).toBeVisible();

      // Unassigned stack shows 2 photos (counter "1 / 2") and progress "0 of 2 assigned"
      await expect(
        page.getByTestId("unassigned-section").getByText("1 / 2", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByTestId("unassigned-section").getByText("0 of 2 assigned", { exact: true }),
      ).toBeVisible();
    });

    // ── Closing projects ──────────────────────────────────────────────────────

    test("closes the project and returns to index", async () => {
      await page.getByRole("button", { name: "Close project" }).click();
      await expect(page.getByRole("heading", { name: "Photo ID" })).toBeVisible();
    });

    // ── Opening a recent project ──────────────────────────────────────────────

    test("shows the recent project on the index screen", async () => {
      const projectName = path.basename(projectDir);
      await expect(page.getByRole("link", { name: projectName })).toBeVisible();
    });

    test("opens the recent project", async () => {
      const projectName = path.basename(projectDir);
      await page.getByRole("link", { name: projectName }).click();

      await expect(page.getByTestId("project-page")).toBeVisible({
        timeout: 30_000,
      });
      await expect(
        page.getByTestId("unassigned-section").getByText("1 / 2", { exact: true }),
      ).toBeVisible();
    });

    // ── Opening an existing project ───────────────────────────────────────────

    test("opens existing project data when choosing 'open'", async () => {
      await page.getByRole("button", { name: "Close project" }).click();
      await expect(page.getByRole("heading", { name: "Photo ID" })).toBeVisible();

      // Override the message box to return EXISTING_DATA_RESPONSE.OPEN_EXISTING so the saved project is loaded
      await app.evaluate(
        ({ dialog }, { dir, response }) => {
          dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [dir] });
          dialog.showMessageBox = () => Promise.resolve({ response, checkboxChecked: false });
        },
        { dir: projectDir, response: EXISTING_DATA_RESPONSE.OPEN_EXISTING },
      );

      await page.getByRole("button", { name: "Start New Project" }).click();

      await expect(page.getByTestId("project-page")).toBeVisible({
        timeout: 30_000,
      });
      await expect(
        page.getByTestId("unassigned-section").getByText("1 / 2", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByTestId("unassigned-section").getByText("0 of 2 assigned", { exact: true }),
      ).toBeVisible();
    });

    test("overwrites existing project when choosing 'replace'", async () => {
      await page.getByRole("button", { name: "Close project" }).click();
      await expect(page.getByRole("heading", { name: "Photo ID" })).toBeVisible();

      // Restore the default mock (REPLACE)
      await app.evaluate(
        ({ dialog }, { dir, response }) => {
          dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [dir] });
          dialog.showMessageBox = () => Promise.resolve({ response, checkboxChecked: false });
        },
        { dir: projectDir, response: EXISTING_DATA_RESPONSE.REPLACE },
      );

      await page.getByRole("button", { name: "Start New Project" }).click();

      await expect(page.getByTestId("project-page")).toBeVisible({
        timeout: 30_000,
      });
      await expect(
        page.getByTestId("unassigned-section").getByText("1 / 2", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByTestId("unassigned-section").getByText("0 of 2 assigned", { exact: true }),
      ).toBeVisible();
    });

    // ── Dragging photos ───────────────────────────────────────────────────────

    test("drags a photo from unassigned to the first matched stack", async () => {
      await drag(
        page.getByTestId("unassigned-section").getByTestId("photo-draggable"),
        page.getByTestId("match-1-left"),
      );

      // Unassigned now has 1 photo, A-Left has 1 photo, progress advances
      await expect(
        page.getByTestId("unassigned-section").getByText("1 of 2 assigned", { exact: true }),
      ).toBeVisible({
        timeout: 5_000,
      });
      await expect(
        page.getByTestId("match-1-left").getByText("1 / 1", { exact: true }),
      ).toBeVisible();
    });

    test("drags a photo from the matched stack to discarded", async () => {
      await drag(
        page.getByTestId("match-1-left").getByTestId("photo-draggable"),
        page.getByTestId("discarded-section"),
      );

      // A-Left should now be empty (no counter), discarded should show 1 photo
      await expect(
        page.getByTestId("discarded-section").getByText("1 / 1", { exact: true }),
      ).toBeVisible({
        timeout: 5_000,
      });
    });

    test("drags a photo from discarded back to unassigned", async () => {
      await drag(
        page.getByTestId("discarded-section").getByTestId("photo-draggable"),
        page.getByTestId("unassigned-section"),
      );

      // Both photos should be back in unassigned
      await expect(
        page.getByTestId("unassigned-section").getByText("0 of 2 assigned", { exact: true }),
      ).toBeVisible({
        timeout: 5_000,
      });
    });

    // ── Pagination ────────────────────────────────────────────────────────────

    test("switches to a different page using the page tabs", async () => {
    // With 52 initial stacks and 8 per page, the second tab is "I-P"
      await expect(page.getByRole("navigation", { name: "Pages" }).getByText("I-P")).toBeVisible();

      // Use the keyboard shortcut to switch pages. Pressing "2" triggers handleKeyDown in
      // project.tsx, which calls setCurrentPage(1). Clicking the tab link directly causes the
      // hash router (createHashHistory) to navigate to "#", root route, then index page.
      await page.keyboard.press("2");

      // First stack on page 2 should be labelled "I" (match-9-left), not "A" (match-1-left)
      await expect(page.getByTestId("match-9-left")).toBeVisible();
      await expect(page.getByTestId("match-1-left")).not.toBeVisible();

      // Navigate back to page 1
      await page.keyboard.press("1");
      await expect(page.getByTestId("match-1-left")).toBeVisible();
    });

    // ── Exporting ─────────────────────────────────────────────────────────────

    test("exports a CSV of the matched data", async () => {
      await page.getByRole("button", { name: "Actions" }).click();
      await page.getByRole("menuitem", { name: "Export CSV" }).click();

      const csvPath = path.join(
        projectDir,
        PROJECT_EXPORT_DATA_DIRECTORY,
        PROJECT_EXPORT_CSV_FILE_NAME,
      );
      await expect.poll(() => fs.existsSync(csvPath), { timeout: 15_000 }).toBe(true);

      const content = await fs.promises.readFile(csvPath, "utf8");
      expect(content).toContain("match_id,original_file_name");
    });

    test("exports matches without edits", async () => {
      await page.getByRole("button", { name: "Actions" }).click();
      await page.getByRole("menuitem").filter({ hasText: "without edits" }).click();

      const exportDir = path.join(projectDir, PROJECT_EXPORT_DIRECTORY);
      await expect.poll(() => fs.existsSync(exportDir), { timeout: 15_000 }).toBe(true);
    });

    test("exports matches with edits", async () => {
      await page.getByRole("button", { name: "Actions" }).click();
      await page.getByRole("menuitem").filter({ hasText: "with edits" }).click();

      const exportDir = path.join(projectDir, PROJECT_EXPORT_DIRECTORY);
      await expect.poll(() => fs.existsSync(exportDir), { timeout: 15_000 }).toBe(true);
    });

    // ── Recent projects management ────────────────────────────────────────────

    test("removes a project from the recent projects list", async () => {
      await page.getByRole("button", { name: "Close project" }).click();
      await expect(page.getByRole("heading", { name: "Photo ID" })).toBeVisible();

      const projectName = path.basename(projectDir);
      await expect(page.getByRole("link", { name: projectName })).toBeVisible();

      await page.getByRole("button", { name: "Remove from recent projects" }).click();

      await expect(page.getByRole("link", { name: projectName })).not.toBeVisible();
    });
  });
