import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // Methods (main)
  openProjectFolder: () => ipcRenderer.send("open-folder-prompt"),
  openProjectFile: () => ipcRenderer.send("open-file-prompt"),
  openRecentProject: (path: string) => ipcRenderer.send("open-project-file", path),
  saveProject: (data: string) => ipcRenderer.send("save-project", data),
  getRecentProjects: () => ipcRenderer.send("get-recent-projects"),

  // Listeners (renderer)
  onLoadProject: (callback: (...params: unknown[]) => void) =>
    ipcRenderer.on("load-project", (_event, value) => callback(value)),

  onLoadRecentProjects: (callback: (...params: unknown[]) => void) =>
    ipcRenderer.on("load-recent-projects", (_event, value) => callback(value)),
});
