import type { ProjectBody, PhotoBody, RecentProject } from "./src/types";

export interface IElectronAPI {
  // Invocations (main and renderer)
  getRecentProjects: () => Promise<RecentProject[]>;
  removeRecentProject: (path: string) => Promise<RecentProject[]>;
  exportMatches: (data: string) => Promise<void>;
  savePhotoFile: (data: PhotoBody, photo: ArrayBuffer) => Promise<void>;
  revertPhotoFile: (data: PhotoBody) => Promise<void>;
  duplicatePhotoFile: (data: PhotoBody) => Promise<PhotoBody>;

  // Methods (renderer-to-main)
  openProjectFolder: () => void;
  openProjectFile: () => void;
  openRecentProject: (path: string) => void;
  saveProject: (data: string) => void;
  openEditWindow: (data: PhotoBody) => void;

  // Listeners (main-to-renderer)
  onLoading: (callback: (show: boolean, text?: string) => void) => void;
  onLoadProject: (callback: (value: ProjectBody) => void) => void;
  onRefreshStackImages: (callback: (name: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
