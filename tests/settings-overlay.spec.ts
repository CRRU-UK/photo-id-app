import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type ElectronApplication, expect, type Page, test } from "@playwright/test";
import { _electron as electron } from "playwright";

import { getPackagedBinaryPath } from "./electron.fixture";

let app: ElectronApplication;
let page: Page;
let userDataDir: string;

test.describe
  .serial("Settings overlay", () => {
    test.beforeAll(async () => {
      userDataDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "photo-id-e2e-userdata-"));

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

      page = await app.firstWindow();
      await page.waitForLoadState("domcontentloaded");
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

      await fs.promises.rm(userDataDir, { recursive: true, force: true });
    });

    test("opens the settings overlay and renders panel content", async () => {
      await page.getByRole("button", { name: "Settings" }).click();

      const dialog = page.getByRole("dialog", { name: "App Settings" });
      await expect(dialog).toBeVisible();

      await expect(dialog.getByText("Theme Mode")).toBeVisible();
      await expect(dialog.getByText("Telemetry")).toBeVisible();

      // Switching tabs swaps the visible panel content
      await dialog.getByRole("link", { name: "Analysis" }).click();
      await expect(dialog.getByRole("button", { name: "Add Provider" })).toBeVisible();
      await expect(dialog.getByText("Theme Mode")).toHaveCount(0);
    });

    test("resets to the General tab when closed and reopened", async () => {
      // Continues from the previous test, which left the Analysis tab active.
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "App Settings" })).toHaveCount(0);

      await page.getByRole("button", { name: "Settings" }).click();

      const dialog = page.getByRole("dialog", { name: "App Settings" });
      await expect(dialog.getByText("Theme Mode")).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Add Provider" })).toHaveCount(0);
    });
  });
