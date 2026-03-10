import { BrowserWindow, dialog } from "electron";

import {
  getCurrentProjectDirectory,
  handleOpenProjectFile,
  setCurrentProject,
} from "@/backend/projects";
import { windowManager } from "@/backend/WindowManager";
import { DEFAULT_WINDOW_TITLE, EXTERNAL_LINKS, PROJECT_FILE_EXTENSION } from "@/constants";
import type { ExternalLinks } from "@/types";

import { version } from "../../../package.json";

/**
 * Resolves the BrowserWindow from an IPC event sender.
 */
export const getWindowFromSender = (webContents: Electron.WebContents): BrowserWindow | null =>
  BrowserWindow.fromWebContents(webContents);

/**
 * Closes the current project by resetting state, closing any and all edit windows, and resetting
 * the window title.
 */
export const closeCurrentProject = (): void => {
  setCurrentProject(null);

  windowManager.closeAllEditWindows();

  const mainWindow = windowManager.getMainWindow();
  if (mainWindow) {
    mainWindow.setTitle(DEFAULT_WINDOW_TITLE);
  }
};

/**
 * Sends an IPC event with data to all open BrowserWindows.
 */
export const broadcastToAllWindows = (channel: string, data: unknown): void => {
  const allWindows = BrowserWindow.getAllWindows();

  for (const window of allWindows) {
    window.webContents.send(channel, data);
  }
};

/**
 * Finds a .photoid file path in an argv array.
 */
export const findPhotoidArg = (argv: string[]): string | undefined =>
  argv.find((arg) => arg.endsWith(`.${PROJECT_FILE_EXTENSION}`));

/**
 * Opens a project file from a file path. Closes the current project and any edit windows first if a
 * project is already open.
 */
export const openProjectFromPath = async (filePath: string): Promise<void> => {
  const mainWindow = windowManager.getMainWindow();
  if (!mainWindow) {
    return;
  }

  if (getCurrentProjectDirectory() !== null) {
    closeCurrentProject();
  }

  await handleOpenProjectFile(mainWindow, filePath);

  mainWindow.focus();
};

/**
 * Maps an ExternalLinks value to its URL and opens it in the default browser.
 * Returns the URL string for shell.openExternal, or undefined if the link is not recognised.
 */
export const resolveExternalLinkUrl = (link: ExternalLinks): string | undefined => {
  if (link === "website") {
    return EXTERNAL_LINKS.WEBSITE;
  }

  if (link === "user-guide") {
    return EXTERNAL_LINKS.USER_GUIDE;
  }

  if (link === "user-guide-ml") {
    return EXTERNAL_LINKS.USER_GUIDE_ML;
  }

  if (link === "user-guide-ml-tokens") {
    return EXTERNAL_LINKS.USER_GUIDE_ML_TOKENS;
  }

  if (link === "privacy") {
    return EXTERNAL_LINKS.PRIVACY;
  }

  if (link === "changelog") {
    return EXTERNAL_LINKS.CHANGELOG.replace("$VERSION", `v${version}`);
  }

  return undefined;
};

/**
 * Wraps an async IPC `.on` handler with try/catch and shows an error dialog on failure.
 */
export const withErrorDialog =
  (label: string, handler: () => Promise<void>): (() => Promise<void>) =>
  async () => {
    try {
      await handler();
    } catch (error) {
      console.error(`Failed to ${label}:`, error);
      dialog.showErrorBox(`Failed to ${label}`, String(error));
    }
  };
