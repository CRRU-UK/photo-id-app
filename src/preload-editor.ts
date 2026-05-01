import { contextBridge, ipcRenderer } from "electron";
import { IPC_EVENTS } from "@/constants";
import type {
  AnalysisMatchResponse,
  EditorNavigation,
  PhotoBody,
  ProjectBody,
  SettingsData,
} from "@/types";

/**
 * Subscribe to an IPC channel and return an unsubscribe function.
 */
const subscribeIpc = <T>(channel: string, callback: (data: T) => void): (() => void) => {
  const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(args[0] as T);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
};

/**
 * Narrowed preload for edit windows. Exposes only the IPC the editor renderer uses.
 */
contextBridge.exposeInMainWorld("electronAPI", {
  // Project bootstrap
  getCurrentProject: (): Promise<ProjectBody | null> =>
    ipcRenderer.invoke(IPC_EVENTS.GET_CURRENT_PROJECT),
  onLoadProject: (callback: (value: ProjectBody) => void) =>
    subscribeIpc<ProjectBody>(IPC_EVENTS.LOAD_PROJECT, callback),

  // Settings (read + observe)
  getSettings: (): Promise<SettingsData> => ipcRenderer.invoke(IPC_EVENTS.GET_SETTINGS),
  onSettingsUpdated: (callback: (data: SettingsData) => void) =>
    subscribeIpc<SettingsData>(IPC_EVENTS.SETTINGS_UPDATED, callback),

  // Photo save + navigation
  savePhotoFile: (data: PhotoBody): Promise<void> =>
    ipcRenderer.invoke(IPC_EVENTS.SAVE_PHOTO_FILE, data),
  navigateEditorPhoto: (data: PhotoBody, direction: EditorNavigation) =>
    ipcRenderer.invoke(IPC_EVENTS.NAVIGATE_EDITOR_PHOTO, data, direction),

  // Analysis
  analyseMatches: (photos: PhotoBody[]): Promise<AnalysisMatchResponse | null> =>
    ipcRenderer.invoke(IPC_EVENTS.ANALYSE_MATCHES, photos),
  cancelAnalyseMatches: () => ipcRenderer.send(IPC_EVENTS.CANCEL_ANALYSE_MATCHES),
});
