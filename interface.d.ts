import type {
  ProjectBody,
  RecentProjects,
  EditWindowData,
  RevertPhotoData,
  DuplicatePhotoData,
} from "./src/types";

export interface IElectronAPI {
  // Methods (main)
  openProjectFolder: () => Promise<void>;
  openProjectFile: () => Promise<void>;
  openRecentProject: (path: string) => Promise<void>;
  removeRecentProject: (path: string) => Promise<void>;
  saveProject: (data: string) => Promise<void>;
  getRecentProjects: () => Promise<void>;
  openEditWindow: (data: string) => Promise<void>;
  savePhotoFile: (data: EditWindowData, photo: ArrayBuffer) => Promise<void>;
  duplicatePhotoFile: (data: DuplicatePhotoData) => Promise<DuplicatePhotoData>;
  revertPhotoFile: (data: RevertPhotoData) => Promise<void>;
  exportMatches: (data: string) => Promise<void>;

  // Listeners (renderer)
  onLoading: (callback: (show: boolean, text?: string) => void) => void;
  onLoadProject: (callback: (value: ProjectBody) => void) => void;
  onLoadRecentProjects: (callback: (value: RecentProjects) => void) => void;
  onRefreshStackImages: (callback: (name: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
