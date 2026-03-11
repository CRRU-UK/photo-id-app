import { type IpcMainEvent, type IpcMainInvokeEvent, dialog, shell } from "electron";
import path from "node:path";

import { closeCurrentProject, getWindowFromSender } from "@/backend/ipc/shared";
import {
  getCurrentProjectDirectory,
  handleExportMatches,
  handleOpenDirectoryPrompt,
  handleOpenFilePrompt,
  handleOpenProjectFile,
  handleSaveProject,
  parseProjectFile,
} from "@/backend/projects";
import { getRecentProjects, removeRecentProject } from "@/backend/recents";
import { windowManager } from "@/backend/WindowManager";
import { IPC_EVENTS, PROJECT_EXPORT_DIRECTORY, PROJECT_FILE_NAME } from "@/constants";
import type { ExportTypes, ProjectBody, RecentProject } from "@/types";

export const handleOpenFolder = async (event: IpcMainEvent): Promise<void> => {
  const window = getWindowFromSender(event.sender);
  if (!window) {
    return;
  }

  try {
    await handleOpenDirectoryPrompt(window);
  } catch (error) {
    console.error("Failed to open folder:", error);
    dialog.showErrorBox("Failed to open folder", String(error));
  }
};

export const handleOpenFile = async (event: IpcMainEvent): Promise<void> => {
  const window = getWindowFromSender(event.sender);
  if (!window) {
    return;
  }

  try {
    await handleOpenFilePrompt(window);
  } catch (error) {
    console.error("Failed to open file:", error);
    dialog.showErrorBox("Failed to open file", String(error));
  }
};

export const handleOpenProjectFileInvoke = async (
  _event: IpcMainInvokeEvent,
  file: string,
): Promise<void> => {
  const mainWindow = windowManager.getMainWindow();
  if (!mainWindow) {
    throw new Error("Main window not available");
  }

  try {
    await handleOpenProjectFile(mainWindow, file);
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

export const handleGetCurrentProject = async (): Promise<ProjectBody | null> => {
  const directory = getCurrentProjectDirectory();

  if (directory === null) {
    return null;
  }

  try {
    return await parseProjectFile(path.join(directory, PROJECT_FILE_NAME));
  } catch (error) {
    console.error("Failed to restore current project:", error);
    return null;
  }
};

export const handleSaveProjectInvoke = async (
  _event: IpcMainInvokeEvent,
  data: string,
): Promise<void> => {
  try {
    await handleSaveProject(data);
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

  const directory = await handleExportMatches(window, data, type);

  if (type === "csv") {
    void shell.openPath(directory);
  } else {
    void shell.openPath(path.join(directory, PROJECT_EXPORT_DIRECTORY));
  }
};

export const registerProjectHandlers = (ipcMain: Electron.IpcMain): void => {
  ipcMain.on(IPC_EVENTS.OPEN_FOLDER, (event) => void handleOpenFolder(event));
  ipcMain.on(IPC_EVENTS.OPEN_FILE, (event) => void handleOpenFile(event));
  ipcMain.on(IPC_EVENTS.CLOSE_PROJECT, () => closeCurrentProject());
  ipcMain.handle(IPC_EVENTS.OPEN_PROJECT_FILE, handleOpenProjectFileInvoke);
  ipcMain.handle(IPC_EVENTS.GET_RECENT_PROJECTS, handleGetRecentProjects);
  ipcMain.handle(IPC_EVENTS.REMOVE_RECENT_PROJECT, handleRemoveRecentProject);
  ipcMain.handle(IPC_EVENTS.GET_CURRENT_PROJECT, handleGetCurrentProject);
  ipcMain.handle(IPC_EVENTS.SAVE_PROJECT, handleSaveProjectInvoke);
  ipcMain.handle(IPC_EVENTS.EXPORT_MATCHES, handleExportMatchesInvoke);
};
