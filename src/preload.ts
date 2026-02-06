import type { EditorNavigation, ExternalLinks, PhotoBody, RecentProject } from "@/types";

import { contextBridge, ipcRenderer } from "electron";

import { IPC_EVENTS } from "@/constants";

/**
 * Subscribe to an IPC channel and return an unsubscribe function. Ensures listeners are removed
 * when the renderer cleans up (e.g. on route change), avoiding duplicate handlers and
 * setState-on-unmounted warnings.
 */
function subscribeIpc(channel: string, callback: (...args: unknown[]) => void): () => void {
  const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld("electronAPI", {
  // Invocations (main and renderer)
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

  // Methods (renderer-to-main)
  openProjectFolder: () => ipcRenderer.send(IPC_EVENTS.OPEN_FOLDER),
  openProjectFile: () => ipcRenderer.send(IPC_EVENTS.OPEN_FILE),
  openRecentProject: (path: string) => ipcRenderer.send(IPC_EVENTS.OPEN_PROJECT_FILE, path),
  saveProject: (data: string) => ipcRenderer.send(IPC_EVENTS.SAVE_PROJECT, data),
  closeProject: () => ipcRenderer.send(IPC_EVENTS.CLOSE_PROJECT),
  openEditWindow: (data: PhotoBody) => ipcRenderer.send(IPC_EVENTS.OPEN_EDIT_WINDOW, data),
  openExternalLink: (link: ExternalLinks) => ipcRenderer.send(IPC_EVENTS.OPEN_EXTERNAL_LINK, link),

  // Listeners (main-to-renderer); each returns an unsubscribe function for cleanup
  onLoading: (callback: (...params: unknown[]) => void) =>
    subscribeIpc(IPC_EVENTS.SET_LOADING, callback),
  onLoadProject: (callback: (...params: unknown[]) => void) =>
    subscribeIpc(IPC_EVENTS.LOAD_PROJECT, callback),
  onOpenSettings: (callback: () => void) =>
    subscribeIpc(IPC_EVENTS.OPEN_SETTINGS, () => callback()),
  onUpdatePhoto: (callback: (...params: unknown[]) => void) =>
    subscribeIpc(IPC_EVENTS.UPDATE_PHOTO, callback),
});
