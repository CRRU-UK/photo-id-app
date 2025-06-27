import type { ProjectBody, RecentProjects, EditWindowData } from "./src/types";

export interface IElectronAPI {
  // Methods (main)
  openProjectFolder: () => Promise<void>;
  openProjectFile: () => Promise<void>;
  openRecentProject: (path: string) => Promise<void>;
  saveProject: (data: string) => Promise<void>;
  getRecentProjects: () => Promise<void>;
  openEditWindow: (data: string) => Promise<void>;
  savePhotoFile: (data: EditWindowData, photo: ArrayBuffer) => Promise<void>;

  // Listeners (renderer)
  onLoadProject: (callback: (value: ProjectBody) => void) => void;
  onLoadRecentProjects: (callback: (value: RecentProjects) => void) => void;
  onRefreshStackImages: (callback: (name: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
