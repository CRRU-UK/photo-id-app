import path from "node:path";
import {
  type BrowserWindow,
  dialog,
  type IpcMainEvent,
  type IpcMainInvokeEvent,
  shell,
} from "electron";

import { handleExportMatches } from "@/backend/exports";
import { focusExistingWindow, getWindowFromSender } from "@/backend/ipc/shared";
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
 * If the project at the given directory is already open in some window, focuses that window and
 * returns true so the caller can short-circuit. Returns false otherwise.
 */
const focusIfAlreadyOpen = (directory: string): boolean => {
  const existingWindow = windowManager.findWindowForProject(directory);
  if (!existingWindow) {
    return false;
  }

  focusExistingWindow(existingWindow);

  return true;
};

/**
 * Returns the window into which the caller should load a project. When the sender already has a
 * project, spawns a fresh window mounted directly at the project route (so the user never sees
 * the index page first), otherwise reuses the sender, which is already on the index page.
 */
const resolveTargetWindow = async (senderWindow: BrowserWindow): Promise<BrowserWindow> => {
  const senderHasProject = windowManager.getDirectoryForWindow(senderWindow) !== null;

  if (senderHasProject) {
    return createProjectWindow({ initialRoute: ROUTES.PROJECT });
  }

  return senderWindow;
};

/**
 * Shows the folder picker and loads the chosen folder into either the sender window (if it has no
 * project loaded) or a new window. Used by both the IPC handler and the application menu so
 * behaviour stays in lockstep.
 */
export const openProjectFolderForWindow = async (senderWindow: BrowserWindow): Promise<void> => {
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

    const targetWindow = await resolveTargetWindow(senderWindow);

    if (choice === "existing") {
      await loadExistingProject(targetWindow, directory);
      return;
    }

    await processProjectFolder(targetWindow, directory);
  } catch (error) {
    console.error("Failed to open folder:", error);
    dialog.showErrorBox("Failed to open folder", String(error));
  }
};

/**
 * Shows the file picker and loads the chosen file into either the sender window or a new window.
 */
export const openProjectFileForWindow = async (senderWindow: BrowserWindow): Promise<void> => {
  try {
    const filePath = await promptForProjectFile();
    if (!filePath) {
      return;
    }

    if (focusIfAlreadyOpen(path.dirname(filePath))) {
      return;
    }

    const targetWindow = await resolveTargetWindow(senderWindow);
    await handleOpenProjectFile(targetWindow, filePath);
  } catch (error) {
    console.error("Failed to open file:", error);
    dialog.showErrorBox("Failed to open file", String(error));
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

  try {
    const targetWindow = await resolveTargetWindow(senderWindow);
    await handleOpenProjectFile(targetWindow, file);
  } catch (error) {
    console.error("Failed to open project file:", error);
    throw error;
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
  return result;
};

export const handleGetCurrentProject = async (
  event: IpcMainInvokeEvent,
): Promise<ProjectPayload | null> => {
  const directory = windowManager.getDirectoryForSender(event.sender);

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
  const window = getWindowFromSender(event.sender);
  if (!window) {
    return;
  }

  const directory = windowManager.getDirectoryForSender(event.sender);
  if (directory === null) {
    throw new Error("No project open");
  }

  await handleExportMatches(window, directory, data, type);

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
 * Closes the project for the sender's window: closes the project's edit windows, clears the
 * project state in `WindowManager`, and resets the window title. The window itself stays open;
 * the renderer is responsible for navigating back to the index page.
 */
export const handleCloseProject = (event: IpcMainEvent): void => {
  const senderWindow = windowManager.getProjectWindowForSender(event.sender);
  if (!senderWindow || senderWindow.isDestroyed()) {
    return;
  }

  windowManager.clearProject(senderWindow);
  senderWindow.setTitle(DEFAULT_WINDOW_TITLE);
};

export const registerProjectHandlers = (ipcMain: Electron.IpcMain): void => {
  ipcMain.on(IPC_EVENTS.OPEN_FOLDER, (event) => void handleOpenFolder(event));
  ipcMain.on(IPC_EVENTS.OPEN_FILE, (event) => void handleOpenFile(event));
  ipcMain.on(IPC_EVENTS.CLOSE_PROJECT, handleCloseProject);
  ipcMain.handle(IPC_EVENTS.OPEN_PROJECT_FILE, handleOpenProjectFileInvoke);
  ipcMain.handle(IPC_EVENTS.GET_RECENT_PROJECTS, handleGetRecentProjects);
  ipcMain.handle(IPC_EVENTS.REMOVE_RECENT_PROJECT, handleRemoveRecentProject);
  ipcMain.handle(IPC_EVENTS.GET_CURRENT_PROJECT, handleGetCurrentProject);
  ipcMain.handle(IPC_EVENTS.SAVE_PROJECT, handleSaveProjectInvoke);
  ipcMain.handle(IPC_EVENTS.EXPORT_MATCHES, handleExportMatchesInvoke);

  // Synchronous save for `beforeunload`, guarantees write completes before the process exits
  ipcMain.on(IPC_EVENTS.FLUSH_SAVE_PROJECT, handleFlushSaveProjectSync);
};
