import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test as base, type ElectronApplication, type Locator, type Page } from "@playwright/test";
import { _electron as electron } from "playwright";

const APP_DIR = path.join(__dirname, "..");
const TEST_DATA_DIR = path.join(__dirname, "data");

/**
 * Resolves the packaged binary produced by `npm run test:e2e:build` (electron-forge
 * package). The build sets `E2E=true` so the EnableNodeCliInspectArguments fuse is
 * enabled — required for Playwright's CDP attach. See forge.config.ts.
 * @returns The path to the packaged binary.
 */
export function getPackagedBinaryPath(): string {
  const productName = "Photo ID";
  const executableName = "photo-id";

  const platformDir = path.join(
    APP_DIR,
    "out",
    `${productName}-${process.platform}-${process.arch}`,
  );

  if (process.platform === "darwin") {
    return path.join(platformDir, `${productName}.app`, "Contents", "MacOS", executableName);
  }

  if (process.platform === "win32") {
    return path.join(platformDir, `${executableName}.exe`);
  }

  return path.join(platformDir, executableName);
}

/**
 * The app treats either Alt or Control as the duplicate modifier. Alt is the one used here because
 * a ctrl-click opens the context menu on macOS.
 */
const COPY_MODIFIER = "Alt";

/**
 * Drags from the centre of `source` to the centre of `target` using pointer events. Moves slightly
 * off-centre first to exceed activation constraint. Passing `copy` holds the duplicate modifier for
 * the duration of the drag, so the app duplicates the photo rather than moving it.
 */
export const drag = async (
  source: Locator,
  target: Locator,
  options?: { copy?: boolean },
): Promise<void> => {
  /**
   * Both ends have to be on screen before the boxes are measured. A target below the fold drags
   * towards the edge of the scrolling stack list, which triggers dnd-kit's auto-scroll and moves
   * the stacks out from under the measured coordinates mid-drag, dropping the photo on a
   * neighbouring stack. Prefer stacks on the first rows in tests for the same reason.
   */
  await target.scrollIntoViewIfNeeded();
  await source.scrollIntoViewIfNeeded();

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error("drag: source or target element not found / not visible");
  }

  const fromX = sourceBox.x + sourceBox.width / 2;
  const fromY = sourceBox.y + sourceBox.height / 2;
  const toX = targetBox.x + targetBox.width / 2;
  const toY = targetBox.y + targetBox.height / 2;

  const page = source.page();

  if (options?.copy) {
    await page.keyboard.down(COPY_MODIFIER);
  }

  await page.mouse.move(fromX, fromY);
  await page.mouse.down();

  // Exceed dnd-kit activationConstraint distance
  await page.mouse.move(fromX + 12, fromY + 12);

  if (options?.copy) {
    await waitForCopyMode(page);
  }

  await page.mouse.move(toX, toY, { steps: 8 });
  await page.mouse.up();

  if (options?.copy) {
    await page.keyboard.up(COPY_MODIFIER);
  }
};

/**
 * The app tracks copy mode from a document keydown listener, which is occasionally missed when
 * focus has just moved. Copy mode shows up as a `copying` class on the body, so re-press the
 * modifier until it is active rather than silently dropping the photo as a plain move.
 */
const waitForCopyMode = async (page: Page): Promise<void> => {
  const isCopying = () => page.evaluate(() => document.body.classList.contains("copying"));

  for (let attempt = 0; attempt < 5; attempt = attempt + 1) {
    if (await isCopying()) {
      return;
    }

    await page.keyboard.down(COPY_MODIFIER);
  }

  throw new Error("drag: copy mode did not activate");
};

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
    // Linux CI lacks a properly configured SUID sandbox
    const args = process.platform === "linux" ? ["--no-sandbox"] : [];

    const app = await electron.launch({
      executablePath: getPackagedBinaryPath(),
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
