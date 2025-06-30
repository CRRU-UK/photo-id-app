import type { PhotoBody, RecentProject } from "@/types";

import { contextBridge, ipcRenderer } from "electron";

import { IPC_EVENTS } from "@/constants";

contextBridge.exposeInMainWorld("electronAPI", {
  // Invocations (main and renderer)
  getRecentProjects: (): Promise<RecentProject[]> =>
    ipcRenderer.invoke(IPC_EVENTS.GET_RECENT_PROJECTS),
  removeRecentProject: (path: string): Promise<RecentProject[]> =>
    ipcRenderer.invoke(IPC_EVENTS.REMOVE_RECENT_PROJECT, path),
  exportMatches: (data: string): Promise<void> =>
    ipcRenderer.invoke(IPC_EVENTS.EXPORT_MATCHES, data),
  savePhotoFile: (data: PhotoBody, photo: ArrayBuffer): Promise<void> =>
    ipcRenderer.invoke(IPC_EVENTS.SAVE_PHOTO_FILE, data, photo),
  revertPhotoFile: (data: PhotoBody): Promise<void> =>
    ipcRenderer.invoke(IPC_EVENTS.REVERT_PHOTO_FILE, data),
  duplicatePhotoFile: (data: PhotoBody): Promise<PhotoBody> =>
    ipcRenderer.invoke(IPC_EVENTS.DUPLICATE_PHOTO_FILE, data),

  // Methods (renderer-to-main)
  openProjectFolder: () => ipcRenderer.send(IPC_EVENTS.OPEN_FOLDER),
  openProjectFile: () => ipcRenderer.send(IPC_EVENTS.OPEN_FILE),
  openRecentProject: (path: string) => ipcRenderer.send(IPC_EVENTS.OPEN_PROJECT_FILE, path),
  saveProject: (data: string) => ipcRenderer.send(IPC_EVENTS.SAVE_PROJECT, data),
  openEditWindow: (data: PhotoBody) => ipcRenderer.send(IPC_EVENTS.OPEN_EDIT_WINDOW, data),

  // Listeners (main-to-renderer)
  onLoading: (callback: (...params: unknown[]) => void) =>
    ipcRenderer.on(IPC_EVENTS.SET_LOADING, (_event, ...value) => callback(...value)),
  onLoadProject: (callback: (...params: unknown[]) => void) =>
    ipcRenderer.on(IPC_EVENTS.LOAD_PROJECT, (_event, value) => callback(value)),
  onRefreshStackImages: (callback: (...params: unknown[]) => void) =>
    ipcRenderer.on(IPC_EVENTS.REFRESH_STACK_IMAGES, (_event, value) => callback(value)),
});
