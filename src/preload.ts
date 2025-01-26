import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // Methods (main)
  openProjectFolder: () => ipcRenderer.send("open-project-folder"),
  openProjectFile: () => ipcRenderer.send("open-project-file"),
  openRecentProject: (path: string) => ipcRenderer.send("open-recent-project", path),
  saveProject: (data: string) => ipcRenderer.send("save-project", data),

  // Listeners (renderer)
  onLoadProject: (callback: (...params: unknown[]) => void) =>
    ipcRenderer.on("load-project", (_event, value) => callback(value)),
});
