import path from "node:path";
import { app, type BrowserWindow } from "electron";

import { getRecentProjects } from "@/backend/recents";
import { IPC_EVENTS, JUMP_LIST_ARGS, PROGRESS_ERROR_FLASH_MS } from "@/constants";
import type { LoadingData } from "@/types";

/**
 * Single source of truth for emitting a loading update: sends the {@link IPC_EVENTS.SET_LOADING}
 * IPC to the renderer and mirrors the same state to the OS taskbar/dock progress bar.
 */
export const sendLoading = (window: BrowserWindow, data: LoadingData): void => {
  /**
   * The window can be closed mid-operation (e.g. during long thumbnail generation), touching a
   * destroyed window's webContents/progress bar throws "Object has been destroyed".
   */
  if (window.isDestroyed()) {
    return;
  }

  window.webContents.send(IPC_EVENTS.SET_LOADING, data);

  if (!data.show) {
    window.setProgressBar(-1);
    return;
  }

  if (data.progressValue === null || data.progressValue === undefined) {
    // > 1 with no mode is treated as "indeterminate"
    window.setProgressBar(2);
    return;
  }

  window.setProgressBar(Math.max(0, Math.min(1, data.progressValue / 100)));
};

/**
 * Hides the renderer loading overlay and briefly flashes the OS taskbar/dock progress bar in its
 * "error" state before clearing it. Used to surface failed long-running operations (exports,
 * imports) without leaving the user stuck behind the overlay.
 */
export const showProgressError = (window: BrowserWindow): void => {
  if (window.isDestroyed()) {
    return;
  }

  window.webContents.send(IPC_EVENTS.SET_LOADING, { show: false });
  window.setProgressBar(1, { mode: "error" });

  setTimeout(() => {
    if (!window.isDestroyed()) {
      window.setProgressBar(-1);
    }
  }, PROGRESS_ERROR_FLASH_MS);
};

/**
 * Flashes the taskbar/dock icon to draw the user's attention if the window is not currently
 * focused. On macOS this bounces the dock icon, on Windows it flashes the taskbar button.
 */
export const flashWindow = (window: BrowserWindow): void => {
  if (!window.isFocused()) {
    window.flashFrame(true);
  }
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

/**
 * Resolves the absolute path of a bundled `.ico` icon. In development the icons live in the source
 * `resources/icons` directory, in production they're copied into `process.resourcesPath` by
 * `forge.config.ts`.
 */
const getJumpListIconPath = (name: string): string => {
  const filename = `${name}.ico`;
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "icons", filename);
  }

  return path.join(__dirname, "..", "..", "resources", "icons", filename);
};

/**
 * Windows-only: applies the full Jump List — Tasks ("New Project", "Open Project File") plus a
 * custom "Recent Projects" category populated with the in-app recents list. The custom category
 * is used instead of the OS-managed `recent` placeholder so each entry can use the project's
 * folder name as its title (the OS-managed list would show every entry as "project" because every
 * project file is called `project.photoid`).
 */
export const applyWindowsJumpList = async (): Promise<void> => {
  if (process.platform !== "win32") {
    return;
  }

  const recents = await getRecentProjects();

  const tasksCategory: Electron.JumpListCategory = {
    type: "tasks",
    items: [
      {
        type: "task",
        title: "New Project",
        description: "Start a new Photo ID project from a folder",
        program: process.execPath,
        args: JUMP_LIST_ARGS.NEW_PROJECT,
        iconPath: getJumpListIconPath("new-project"),
        iconIndex: 0,
      },
      {
        type: "task",
        title: "Open Project File",
        description: "Open an existing Photo ID project file",
        program: process.execPath,
        args: JUMP_LIST_ARGS.OPEN_PROJECT_FILE,
        iconPath: getJumpListIconPath("open-project-file"),
        iconIndex: 0,
      },
    ],
  };

  const categories: Electron.JumpListCategory[] =
    recents.length === 0
      ? [tasksCategory]
      : [
          {
            type: "custom",
            name: "Recent Projects",
            items: recents.map((recent) => ({
              type: "task",
              title: recent.name,
              description: recent.path,
              program: process.execPath,
              args: `"${recent.path}"`,
              iconPath: process.execPath,
              iconIndex: 0,
            })),
          },
          tasksCategory,
        ];

  try {
    app.setJumpList(categories);
  } catch (error) {
    console.error("Failed to set Windows Jump List:", error);
  }
};
