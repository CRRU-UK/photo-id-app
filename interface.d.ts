import type { ProjectBody, PhotoBody, RecentProject, LoadingData } from "./src/types";

export interface IElectronAPI {
  // Invocations (main and renderer)
  getRecentProjects: () => Promise<RecentProject[]>;
  removeRecentProject: (path: string) => Promise<RecentProject[]>;
  exportMatches: (data: string) => Promise<void>;
  savePhotoFile: (data: EditData, photo: ArrayBuffer) => Promise<void>;
  revertPhotoFile: (data: PhotoBody) => Promise<void>;
  duplicatePhotoFile: (data: PhotoBody) => Promise<PhotoBody>;

  // Methods (renderer-to-main)
  openProjectFolder: () => void;
  openProjectFile: () => void;
  openRecentProject: (path: string) => void;
  saveProject: (data: string) => void;
  openEditWindow: (data: EditData) => void;

  // Listeners (main-to-renderer)
  onLoading: (callback: (data: LoadingData) => void) => void;
  onLoadProject: (callback: (value: ProjectBody) => void) => void;
  onUpdatePhotoData: (callback: (data: PhotoBody) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
