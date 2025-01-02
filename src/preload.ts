import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Methods (main)
  openFolder: () => ipcRenderer.send('open-folder'),

  // Listeners (renderer)
  onLoadData: (callback: Function) => ipcRenderer.on('load-data', (_event, value) => callback(value)),
});
