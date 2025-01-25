import type { PROJECT_JSON } from './src/helpers/types';

export interface IElectronAPI {
  // Methods (main)
  openFolder: () => Promise<void>,

  // Listeners (renderer)
  onLoadProject: (callback: (value: PROJECT_JSON) => void) => void,
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
