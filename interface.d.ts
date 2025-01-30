import type { PROJECT_JSON_BODY, RECENT_PROJECTS } from "./src/helpers/types";

export interface IElectronAPI {
  // Methods (main)
  openProjectFolder: () => Promise<void>;
  openProjectFile: () => Promise<void>;
  openRecentProject: (path: string) => Promise<void>;
  saveProject: (data: string) => Promise<void>;
  getRecentProjects: () => Promise<void>;

  // Listeners (renderer)
  onLoadProject: (callback: (value: PROJECT_JSON_BODY) => void) => void;
  onLoadRecentProjects: (callback: (value: RECENT_PROJECTS) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
