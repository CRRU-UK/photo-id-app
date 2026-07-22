import path from "node:path";
import {
  type BrowserWindow,
  dialog,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
  shell,
} from "electron";

import { handleExportMatches } from "@/backend/exports";
import { closeFreshOnLoadFail, focusIfAlreadyOpen } from "@/backend/ipc/shared";
import { notifyRecentProjectsChanged } from "@/backend/menu";
import {
  checkExistingProjectChoice,
  handleFlushSaveProject,
  handleOpenProjectFile,
  handleSaveProject,
  loadExistingProject,
  parseProjectFile,
  processProjectFolder,
  promptForProjectFile,
  promptForProjectFolder,
} from "@/backend/projects";
import { getRecentProjects, removeRecentProject } from "@/backend/recents";
import { setRepresentedProject, showProgressError } from "@/backend/shellIntegration";
import { windowManager } from "@/backend/WindowManager";
import { createProjectWindow } from "@/backend/windows";
import {
  DEFAULT_WINDOW_TITLE,
  IPC_EVENTS,
  PROJECT_EXPORT_CSV_FILE_NAME,
  PROJECT_EXPORT_DATA_DIRECTORY,
  PROJECT_EXPORT_DIRECTORY,
  PROJECT_FILE_NAME,
  ROUTES,
} from "@/constants";
import type { ExportTypes, ProjectPayload, RecentProject } from "@/types";

/**
 * Returns [target window, isFresh]. When the sender already has a project (or the sender window
 * was closed while the picker dialog was open), spawns a fresh window mounted directly at the
 * project route so the user never sees the index page first, otherwise reuses the sender. Only
 * fresh windows are closed by `closeFreshOnLoadFail` if the load doesn't register a project.
 */
const resolveTargetWindow = async (
  senderWindow: BrowserWindow,
): Promise<[BrowserWindow, boolean]> => {
  if (senderWindow.isDestroyed() || windowManager.getDirectoryForWindow(senderWindow) !== null) {
    return [await createProjectWindow({ initialRoute: ROUTES.PROJECT }), true];
  }

  return [senderWindow, false];
};

/**
 * Shows the folder picker and loads the chosen folder into either the sender window (if it has no
 * project loaded) or a new window. Used by both the IPC handler and the application menu so
 * behaviour stays in lockstep.
 */
export const openProjectFolderForWindow = async (senderWindow: BrowserWindow): Promise<void> => {
  let target: BrowserWindow | undefined;
  let isFresh = false;

  try {
    const directory = await promptForProjectFolder();
    if (!directory) {
      return;
    }

    if (focusIfAlreadyOpen(directory)) {
      return;
    }

    /**
     * Resolve the existing-data choice BEFORE creating a target window so the user can cancel
     * without leaving an empty window behind.
     */
    const choice = await checkExistingProjectChoice(directory);
    if (choice === "cancel") {
      return;
    }

    /**
     * Re-check after the modal: another window may have opened this project while the dialog was
     * up. Without this, both flows would load the same project.photoid into two windows whose
     * debounced saves then clobber each other.
     */
    if (focusIfAlreadyOpen(directory)) {
      return;
    }

    [target, isFresh] = await resolveTargetWindow(senderWindow);

    if (choice === "existing") {
      await loadExistingProject(target, directory);
    } else {
      await processProjectFolder(target, directory);
    }
  } catch (error) {
    console.error("Failed to open folder:", error);
    dialog.showErrorBox("Failed to open folder", String(error));
  } finally {
    if (target) {
      closeFreshOnLoadFail(target, isFresh);
    }
  }
};

/**
 * Shows the file picker and loads the chosen file into either the sender window or a new window.
 */
export const openProjectFileForWindow = async (senderWindow: BrowserWindow): Promise<void> => {
  let target: BrowserWindow | undefined;
  let isFresh = false;

  try {
    const filePath = await promptForProjectFile();
    if (!filePath) {
      return;
    }

    if (focusIfAlreadyOpen(path.dirname(filePath))) {
      return;
    }

    [target, isFresh] = await resolveTargetWindow(senderWindow);
    await handleOpenProjectFile(target, filePath);
  } catch (error) {
    console.error("Failed to open file:", error);
    dialog.showErrorBox("Failed to open file", String(error));
  } finally {
    if (target) {
      closeFreshOnLoadFail(target, isFresh);
    }
  }
};

export const handleOpenFolder = async (event: IpcMainEvent): Promise<void> => {
  const senderWindow = windowManager.getProjectWindowForSender(event.sender);
  if (!senderWindow) {
    return;
  }
  await openProjectFolderForWindow(senderWindow);
};

export const handleOpenFile = async (event: IpcMainEvent): Promise<void> => {
  const senderWindow = windowManager.getProjectWindowForSender(event.sender);
  if (!senderWindow) {
    return;
  }
  await openProjectFileForWindow(senderWindow);
};

export const handleOpenProjectFileInvoke = async (
  event: IpcMainInvokeEvent,
  file: string,
): Promise<void> => {
  const senderWindow = windowManager.getProjectWindowForSender(event.sender);
  if (!senderWindow) {
    throw new Error("Sender window not found");
  }

  if (focusIfAlreadyOpen(path.dirname(file))) {
    return;
  }

  let target: BrowserWindow | undefined;
  let isFresh = false;

  try {
    [target, isFresh] = await resolveTargetWindow(senderWindow);
    await handleOpenProjectFile(target, file);
  } catch (error) {
    console.error("Failed to open project file:", error);
    throw error;
  } finally {
    if (target) {
      closeFreshOnLoadFail(target, isFresh);
    }
  }
};

export const handleGetRecentProjects = async (): Promise<RecentProject[]> => {
  const result = await getRecentProjects();
  return result;
};

export const handleRemoveRecentProject = async (
  _event: IpcMainInvokeEvent,
  projectPath: string,
): Promise<RecentProject[]> => {
  const result = await removeRecentProject(projectPath);

  await notifyRecentProjectsChanged();

  return result;
};

export const handleGetCurrentProject = async (
  event: IpcMainInvokeEvent,
): Promise<ProjectPayload | null> => {
  const projectWindow = windowManager.getProjectWindowForSender(event.sender);
  if (!projectWindow) {
    return null;
  }

  /**
   * While a project is still loading (thumbnail generation / file parse) its `project.photoid` may
   * be stale or not yet written. Return null and let the `LOAD_PROJECT` event deliver the project
   * once it's committed, so a freshly-spawned window doesn't mount the old file.
   */
  if (windowManager.isProjectLoading(projectWindow)) {
    return null;
  }

  const directory = windowManager.getDirectoryForWindow(projectWindow);
  if (directory === null) {
    return null;
  }

  try {
    const body = await parseProjectFile(path.join(directory, PROJECT_FILE_NAME));
    return { body, directory };
  } catch (error) {
    console.error("Failed to restore current project:", error);
    return null;
  }
};

export const handleSaveProjectInvoke = async (
  event: IpcMainInvokeEvent,
  data: string,
): Promise<void> => {
  const directory = windowManager.getDirectoryForSender(event.sender);
  if (directory === null) {
    throw new Error("No project open");
  }

  try {
    await handleSaveProject(directory, data);
  } catch (error) {
    console.error("Failed to save project:", error);
    throw error;
  }
};

export const handleExportMatchesInvoke = async (
  event: IpcMainInvokeEvent,
  data: string,
  type: ExportTypes,
): Promise<void> => {
  const projectWindow = windowManager.getProjectWindowForSender(event.sender);
  if (!projectWindow) {
    throw new Error("No project window");
  }

  const directory = windowManager.getDirectoryForWindow(projectWindow);
  if (directory === null) {
    throw new Error("No project open");
  }

  try {
    await handleExportMatches(projectWindow, directory, data, type);
  } catch (error) {
    showProgressError(projectWindow);
    throw error;
  }

  if (type === "csv") {
    const csvPath = path.join(
      directory,
      PROJECT_EXPORT_DATA_DIRECTORY,
      PROJECT_EXPORT_CSV_FILE_NAME,
    );

    return shell.showItemInFolder(csvPath);
  }

  return void shell.openPath(path.join(directory, PROJECT_EXPORT_DIRECTORY));
};

export const handleFlushSaveProjectSync = (event: IpcMainEvent, data: string): void => {
  const directory = windowManager.getDirectoryForSender(event.sender);
  if (directory === null) {
    event.returnValue = false;
    return;
  }

  try {
    handleFlushSaveProject(directory, data);
    event.returnValue = true;
  } catch (error) {
    console.error("Failed to flush save project:", error);
    event.returnValue = false;
  }
};

/**
 * Closes the project for the sender's window: sequentially closes each edit window so the user
 * can resolve unsaved edits, then clears the project state and resets the window title. The
 * window itself stays open, the renderer is responsible for navigating back to the index page.
 * If the user cancels an unsaved-edits prompt, the project state is left intact and the window
 * stays on the project view.
 */
export const handleCloseProject = async (event: IpcMainInvokeEvent): Promise<boolean> => {
  const senderWindow = windowManager.getProjectWindowForSender(event.sender);
  if (!senderWindow || senderWindow.isDestroyed()) {
    return false;
  }

  const closed = await windowManager.closeProjectInWindow(senderWindow);
  if (!closed) {
    return false;
  }

  senderWindow.setTitle(DEFAULT_WINDOW_TITLE);
  setRepresentedProject(senderWindow, null);
  return true;
};

export const registerProjectHandlers = (ipcMain: Electron.IpcMain): void => {
  ipcMain.on(IPC_EVENTS.OPEN_FOLDER, (event) => void handleOpenFolder(event));
  ipcMain.on(IPC_EVENTS.OPEN_FILE, (event) => void handleOpenFile(event));
  ipcMain.handle(IPC_EVENTS.CLOSE_PROJECT, handleCloseProject);
  ipcMain.handle(IPC_EVENTS.OPEN_PROJECT_FILE, handleOpenProjectFileInvoke);
  ipcMain.handle(IPC_EVENTS.GET_RECENT_PROJECTS, handleGetRecentProjects);
  ipcMain.handle(IPC_EVENTS.REMOVE_RECENT_PROJECT, handleRemoveRecentProject);
  ipcMain.handle(IPC_EVENTS.GET_CURRENT_PROJECT, handleGetCurrentProject);
  ipcMain.handle(IPC_EVENTS.SAVE_PROJECT, handleSaveProjectInvoke);
  ipcMain.handle(IPC_EVENTS.EXPORT_MATCHES, handleExportMatchesInvoke);

  // Synchronous save for `beforeunload`, guarantees write completes before the process exits
  ipcMain.on(IPC_EVENTS.FLUSH_SAVE_PROJECT, handleFlushSaveProjectSync);
};
