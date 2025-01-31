import type { ProjectJSONBody } from "./src/helpers/types";

export interface IElectronAPI {
  // Methods (main)
  openProjectFolder: () => Promise<void>;
  openProjectFile: () => Promise<void>;
  saveProject: (data: string) => Promise<void>;

  // Listeners (renderer)
  onLoadProject: (callback: (value: ProjectJSONBody) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
