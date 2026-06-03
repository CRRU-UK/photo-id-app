import type { BrowserWindow } from "electron";

import { IPC_EVENTS, PROGRESS_ERROR_FLASH_MS } from "@/constants";
import type { LoadingData } from "@/types";

/**
 * Translates a {@link LoadingData} payload into the OS-level progress bar state.
 */
const applyProgressBar = (window: BrowserWindow, data: LoadingData): void => {
  if (!data.show) {
    window.setProgressBar(-1);
    return;
  }

  if (data.progressValue === null || data.progressValue === undefined) {
    // > 1 with no mode is treated as "indeterminate"
    window.setProgressBar(2);
    return;
  }

  const fraction = Math.max(0, Math.min(1, data.progressValue / 100));
  window.setProgressBar(fraction);
};

/**
 * Single source of truth for emitting a loading update: sends the {@link IPC_EVENTS.SET_LOADING}
 * IPC to the renderer and mirrors the same state to the OS taskbar/dock progress bar.
 */
export const sendLoading = (window: BrowserWindow, data: LoadingData): void => {
  window.webContents.send(IPC_EVENTS.SET_LOADING, data);
  applyProgressBar(window, data);
};

/**
 * Briefly puts the OS taskbar/dock progress bar into its "error" state, then clears it. Used to
 * surface failed long-running operations (exports, imports) at the OS level.
 */
export const showProgressError = (window: BrowserWindow): void => {
  window.setProgressBar(1, { mode: "error" });

  setTimeout(() => {
    if (!window.isDestroyed()) {
      window.setProgressBar(-1);
    }
  }, PROGRESS_ERROR_FLASH_MS);
};

/**
 * Flashes the taskbar/dock icon to draw the user's attention if the window is not currently
 * focused. On macOS this bounces the dock icon; on Windows it flashes the taskbar button.
 */
export const flashWindow = (window: BrowserWindow): void => {
  if (!window.isFocused()) {
    window.flashFrame(true);
  }
};

/**
 * Wires per-window shell-integration behaviours. Currently: clear any lingering flash state once
 * the window regains focus.
 */
export const setupShellIntegration = (window: BrowserWindow): void => {
  window.on("focus", () => {
    window.flashFrame(false);
  });
};

/**
 * macOS-only: associates the window's title bar with the project's `.photoid` file so cmd-click
 * reveals the path popover and the small icon can be dragged out to Finder. No-op on other
 * platforms.
 */
export const setRepresentedProject = (
  window: BrowserWindow,
  projectFilePath: string | null,
): void => {
  if (process.platform !== "darwin") {
    return;
  }

  window.setRepresentedFilename(projectFilePath ?? "");
  window.setDocumentEdited(false);
};
