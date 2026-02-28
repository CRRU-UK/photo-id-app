import type {
  EditorNavigation,
  ExternalLinks,
  LoadingData,
  MLMatchResponse,
  PhotoBody,
  ProjectBody,
  RecentProject,
  SettingsData,
} from "@/types";

import { contextBridge, ipcRenderer } from "electron";

import { IPC_EVENTS } from "@/constants";

/**
 * Subscribe to an IPC channel and return an unsubscribe function. Ensures listeners are removed
 * when the renderer cleans up (e.g. on route change), avoiding duplicate handlers and
 * setState-on-unmounted warnings.
 */
function subscribeIpc<T>(channel: string, callback: (data: T) => void): () => void {
  const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(args[0] as T);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld("electronAPI", {
  // Invocations (main and renderer)
  getCurrentProject: (): Promise<ProjectBody | null> =>
    ipcRenderer.invoke(IPC_EVENTS.GET_CURRENT_PROJECT),
  getRecentProjects: (): Promise<RecentProject[]> =>
    ipcRenderer.invoke(IPC_EVENTS.GET_RECENT_PROJECTS),
  removeRecentProject: (path: string): Promise<RecentProject[]> =>
    ipcRenderer.invoke(IPC_EVENTS.REMOVE_RECENT_PROJECT, path),
  exportMatches: (data: string): Promise<void> =>
    ipcRenderer.invoke(IPC_EVENTS.EXPORT_MATCHES, data),
  savePhotoFile: (data: PhotoBody): Promise<void> =>
    ipcRenderer.invoke(IPC_EVENTS.SAVE_PHOTO_FILE, data),
  revertPhotoFile: (data: PhotoBody): Promise<PhotoBody> =>
    ipcRenderer.invoke(IPC_EVENTS.REVERT_PHOTO_FILE, data),
  navigateEditorPhoto: (data: PhotoBody, direction: EditorNavigation) =>
    ipcRenderer.invoke(IPC_EVENTS.NAVIGATE_EDITOR_PHOTO, data, direction),
  duplicatePhotoFile: (data: PhotoBody): Promise<PhotoBody> =>
    ipcRenderer.invoke(IPC_EVENTS.DUPLICATE_PHOTO_FILE, data),
  getSettings: (): Promise<SettingsData> => ipcRenderer.invoke(IPC_EVENTS.GET_SETTINGS),
  updateSettings: (settings: SettingsData): Promise<void> =>
    ipcRenderer.invoke(IPC_EVENTS.UPDATE_SETTINGS, settings),
  analyseStack: (photos: PhotoBody[]): Promise<MLMatchResponse | null> =>
    ipcRenderer.invoke(IPC_EVENTS.ANALYSE_STACK, photos),

  // Methods (renderer-to-main)
  openProjectFolder: () => ipcRenderer.send(IPC_EVENTS.OPEN_FOLDER),
  openProjectFile: () => ipcRenderer.send(IPC_EVENTS.OPEN_FILE),
  openRecentProject: (path: string) => ipcRenderer.send(IPC_EVENTS.OPEN_PROJECT_FILE, path),
  saveProject: (data: string) => ipcRenderer.send(IPC_EVENTS.SAVE_PROJECT, data),
  closeProject: () => ipcRenderer.send(IPC_EVENTS.CLOSE_PROJECT),
  openEditWindow: (data: PhotoBody) => ipcRenderer.send(IPC_EVENTS.OPEN_EDIT_WINDOW, data),
  openExternalLink: (link: ExternalLinks) => ipcRenderer.send(IPC_EVENTS.OPEN_EXTERNAL_LINK, link),
  cancelAnalyseStack: () => ipcRenderer.send(IPC_EVENTS.CANCEL_ANALYSE_STACK),

  // Listeners (main-to-renderer)
  onLoading: (callback: (data: LoadingData) => void) =>
    subscribeIpc<LoadingData>(IPC_EVENTS.SET_LOADING, callback),
  onLoadProject: (callback: (value: ProjectBody) => void) =>
    subscribeIpc<ProjectBody>(IPC_EVENTS.LOAD_PROJECT, callback),
  onOpenSettings: (callback: () => void) =>
    subscribeIpc<undefined>(IPC_EVENTS.OPEN_SETTINGS, () => callback()),
  onUpdatePhoto: (callback: (data: PhotoBody) => void) =>
    subscribeIpc<PhotoBody>(IPC_EVENTS.UPDATE_PHOTO, callback),
  onSettingsUpdated: (callback: (data: SettingsData) => void) =>
    subscribeIpc<SettingsData>(IPC_EVENTS.SETTINGS_UPDATED, callback),
});
