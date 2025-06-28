import type { EditWindowData } from "@/types";

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // Methods (main)
  openProjectFolder: () => ipcRenderer.send("open-folder-prompt"),
  openProjectFile: () => ipcRenderer.send("open-file-prompt"),
  openRecentProject: (path: string) => ipcRenderer.send("open-project-file", path),
  saveProject: (data: string) => ipcRenderer.send("save-project", data),
  getRecentProjects: () => ipcRenderer.send("get-recent-projects"),
  removeRecentProject: (path: string) => ipcRenderer.send("remove-recent-project", path),
  openEditWindow: (data: string) => ipcRenderer.send("open-edit-window", data),
  savePhotoFile: (data: EditWindowData, photo: ArrayBuffer) =>
    ipcRenderer.send("save-photo-file", data, photo),
  exportMatches: (data: string) => ipcRenderer.send("export-matches", data),

  // Listeners (renderer)
  onLoading: (callback: (...params: unknown[]) => void) =>
    ipcRenderer.on("set-loading", (_event, ...value) => callback(...value)),
  onLoadProject: (callback: (...params: unknown[]) => void) =>
    ipcRenderer.on("load-project", (_event, value) => callback(value)),
  onLoadRecentProjects: (callback: (...params: unknown[]) => void) =>
    ipcRenderer.on("load-recent-projects", (_event, value) => callback(value)),
  onRefreshStackImages: (callback: (...params: unknown[]) => void) =>
    ipcRenderer.on("refresh-stack-images", (_event, value) => callback(value)),
});
