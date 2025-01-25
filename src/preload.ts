import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Methods (main)
  openFolder: () => ipcRenderer.send('open-folder'),

  // Listeners (renderer)
  onLoadProject: (callback: any) => ipcRenderer.on('load-project', (_event, value) => callback(value)),
});
