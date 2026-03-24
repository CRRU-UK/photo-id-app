import { BrowserWindow, dialog } from "electron";
import path from "node:path";

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
 * Finds a .photoid file path in an argv array. Checks the full extension rather than just the
 * suffix to avoid matching non-file arguments.
 */
export const findPhotoidArg = (argv: string[]): string | undefined =>
  argv.find((arg) => path.extname(arg).toLowerCase() === `.${PROJECT_FILE_EXTENSION}`);

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

const EXTERNAL_LINK_MAP: Record<string, string> = {
  website: EXTERNAL_LINKS.WEBSITE,
  "user-guide": EXTERNAL_LINKS.USER_GUIDE,
  "user-guide-ml": EXTERNAL_LINKS.USER_GUIDE_ML,
  "user-guide-ml-tokens": EXTERNAL_LINKS.USER_GUIDE_ML_TOKENS,
  privacy: EXTERNAL_LINKS.PRIVACY,
  "keyboard-shortcuts": EXTERNAL_LINKS.KEYBOARD_SHORTCUTS,
  changelog: EXTERNAL_LINKS.CHANGELOG,
};

/**
 * Maps an ExternalLinks value to its URL and opens it in the default browser.
 * Returns the URL string for shell.openExternal, or undefined if the link is not recognised.
 */
export const resolveExternalLinkUrl = (link: ExternalLinks): string | undefined => {
  const url = EXTERNAL_LINK_MAP[link];

  if (!url) {
    return undefined;
  }

  return url.replace("$VERSION", `v${version}`);
};

/**
 * Extracts a user-friendly message from an error. Zod validation errors are simplified to avoid
 * showing raw schema details to users.
 */
export const getUserErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.name === "ZodError") {
    return "The file contains invalid or corrupted data. It may have been modified outside the app.";
  }

  if (error instanceof SyntaxError) {
    return "The file contains invalid data and could not be read.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
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
      dialog.showErrorBox(`Failed to ${label}`, getUserErrorMessage(error));
    }
  };
