import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test as base, type ElectronApplication, type Page } from "@playwright/test";
import { _electron as electron } from "playwright";

const APP_DIR = path.join(__dirname, "..");
const TEST_DATA_DIR = path.join(__dirname, "data");

type E2EFixtures = {
  testProjectDir: string;
  electronApp: ElectronApplication;
  page: Page;
};

export const test = base.extend<E2EFixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixture pattern requires empty destructuring
  testProjectDir: async ({}, use) => {
    const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), "photo-id-e2e-"));

    const files = await fs.promises.readdir(TEST_DATA_DIR);
    for (const file of files) {
      await fs.promises.copyFile(path.join(TEST_DATA_DIR, file), path.join(directory, file));
    }

    await use(directory);

    await fs.promises.rm(directory, { recursive: true, force: true });
  },

  electronApp: async ({ testProjectDir }, use) => {
    // Launch Electron from the Vite-built output (not the packaged binary). The packaged binary has EnableNodeCliInspectArguments fuse disabled, which blocks Playwright's CDP connection.
    const args = [APP_DIR];

    // Linux CI lacks a properly configured SUID sandbox
    if (process.platform === "linux") {
      args.push("--no-sandbox");
    }

    const app = await electron.launch({
      args,
      env: {
        ...process.env,
        E2E: "true",
      },
    });

    const exportPath = path.join(testProjectDir, "export.csv");

    // Mock native dialogues in the main process via CDP
    await app.evaluate(
      ({ dialog }, { projectDir, savePath }) => {
        dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [projectDir] });

        // "Existing project file" confirmation, choose "Replace Existing Data"
        dialog.showMessageBoxSync = () => 2;
        dialog.showMessageBox = () => Promise.resolve({ response: 2, checkboxChecked: false });

        dialog.showSaveDialog = () => Promise.resolve({ canceled: false, filePath: savePath });

        dialog.showErrorBox = (title: string, content: string) => {
          console.error(`[E2E dialog.showErrorBox] ${title}: ${content}`);
        };
      },
      { projectDir: testProjectDir, savePath: exportPath },
    );

    await use(app);

    await app.close();
  },

  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    await use(page);
  },
});

export { expect } from "@playwright/test";
