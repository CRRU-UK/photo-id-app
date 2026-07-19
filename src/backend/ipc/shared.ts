import path from "node:path";
import { BrowserWindow, dialog } from "electron";
import { ZodError } from "zod";

import { handleOpenProjectFile } from "@/backend/projects";
import { windowManager } from "@/backend/WindowManager";
import { createProjectWindow } from "@/backend/windows";
import {
  CORRUPTED_DATA_MESSAGE,
  EXTERNAL_LINKS,
  PROJECT_FILE_EXTENSION,
  ROUTES,
} from "@/constants";
import type { ExternalLinks } from "@/types";

import { version } from "../../../package.json";

/**
 * Resolves the BrowserWindow from an IPC event sender.
 */
export const getWindowFromSender = (webContents: Electron.WebContents): BrowserWindow | null =>
  BrowserWindow.fromWebContents(webContents);

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
export const findProjectFileArg = (argv: string[]): string | undefined =>
  argv.find((arg) => path.extname(arg).toLowerCase() === `.${PROJECT_FILE_EXTENSION}`);

/**
 * Brings an existing window to the front. Restores it if minimised, then focuses it. Used when
 * the user tries to open a project that is already loaded in another window.
 */
export const focusExistingWindow = (window: BrowserWindow): void => {
  if (window.isDestroyed()) {
    return;
  }

  if (window.isMinimized()) {
    window.restore();
  }

  window.focus();
};

/**
 * If the project at the given directory is already open in some window, focuses that window and
 * returns true so the caller can short-circuit. Returns false otherwise. Shared by the in-app
 * open flow (`projectHandlers`) and the file-association / argv flow (`openProjectFromPath`).
 */
export const focusIfAlreadyOpen = (directory: string): boolean => {
  const existingWindow = windowManager.findWindowForProject(directory);
  if (!existingWindow) {
    return false;
  }

  focusExistingWindow(existingWindow);

  return true;
};

/**
 * Closes a freshly-spawned project window if the load did not register a project, avoiding the
 * user being stuck on the "Opening project" overlay forever. Only fresh windows are closed, a
 * reused window (sender on index, or an idle window) is left alone.
 */
export const closeFreshOnLoadFail = (window: BrowserWindow, isFresh: boolean): void => {
  if (!isFresh || window.isDestroyed()) {
    return;
  }

  if (windowManager.getDirectoryForWindow(window) !== null) {
    return;
  }

  window.close();
};

/**
 * Opens a project file from a file path. If the project is already open in a window, that window
 * is focused instead. Otherwise, an idle (empty) window is reused if available, or a fresh window
 * is spawned mounted directly at the project route. If the load fails on a freshly-spawned
 * window, that window is closed to avoid leaving the user stuck on a loading placeholder. Used
 * for file associations, second-instance argv, and macOS open-file events.
 */
export const openProjectFromPath = async (filePath: string): Promise<void> => {
  /**
   * Validate the extension up front so an invalid path doesn't briefly spawn a window only to close
   * it immediately after `handleOpenProjectFile` shows its error dialog (which would look like a
   * crash to the user). `handleOpenProjectFile` keeps the same check as defence in depth.
   */
  if (path.extname(filePath).toLowerCase() !== `.${PROJECT_FILE_EXTENSION}`) {
    console.error("Refused to open non-.photoid file path:", filePath);
    dialog.showErrorBox("Invalid file", "Only .photoid project files can be opened.");

    return;
  }

  const directory = path.dirname(filePath);

  if (focusIfAlreadyOpen(directory)) {
    return;
  }

  const idleWindow = windowManager.findIdleProjectWindow();
  const isFresh = !idleWindow;
  const targetWindow = idleWindow ?? (await createProjectWindow({ initialRoute: ROUTES.PROJECT }));

  await handleOpenProjectFile(targetWindow, filePath);

  if (windowManager.getDirectoryForWindow(targetWindow) === null) {
    closeFreshOnLoadFail(targetWindow, isFresh);
    return;
  }

  targetWindow.focus();
};

const EXTERNAL_LINK_MAP: Record<string, string> = {
  website: EXTERNAL_LINKS.WEBSITE,
  "user-guide": EXTERNAL_LINKS.USER_GUIDE,
  "user-guide-analysis": EXTERNAL_LINKS.USER_GUIDE_ANALYSIS,
  "user-guide-analysis-tokens": EXTERNAL_LINKS.USER_GUIDE_ANALYSIS_TOKENS,
  privacy: EXTERNAL_LINKS.PRIVACY,
  "keyboard-shortcuts": EXTERNAL_LINKS.KEYBOARD_SHORTCUTS,
  changelog: EXTERNAL_LINKS.CHANGELOG,
};

/**
 * Maps an {@link EXTERNAL_LINK_MAP} value to its URL and opens it in the default browser. Returns
 * the URL string for `shell.openExternal`, or undefined if the link is not recognised.
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
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return CORRUPTED_DATA_MESSAGE;
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
