export interface IElectronAPI {
  setTitle: (title: string) => Promise<void>,
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
