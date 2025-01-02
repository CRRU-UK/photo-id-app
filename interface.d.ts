import type { PHOTO_DATA } from './src/helpers/types';

export interface IElectronAPI {
  // Methods (main)
  openFolder: () => Promise<void>,

  // Listeners (renderer)
  onLoadData: (callback: (value: PHOTO_DATA) => void) => void,
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
