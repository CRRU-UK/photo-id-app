import type {
  ProjectBody,
  EditWindowData,
  RevertPhotoData,
  DuplicatePhotoData,
  RecentProject,
} from "./src/types";

export interface IElectronAPI {
  // Invocations (main and renderer)
  getRecentProjects: () => Promise<RecentProject[]>;
  removeRecentProject: (path: string) => Promise<RecentProject[]>;
  duplicatePhotoFile: (data: DuplicatePhotoData) => Promise<DuplicatePhotoData>;
  exportMatches: (data: string) => Promise<void>;
  savePhotoFile: (data: EditWindowData, photo: ArrayBuffer) => Promise<void>;
  revertPhotoFile: (data: RevertPhotoData) => Promise<void>;

  // Methods (renderer-to-main)
  openProjectFolder: () => void;
  openProjectFile: () => void;
  openRecentProject: (path: string) => void;
  saveProject: (data: string) => void;
  openEditWindow: (data: string) => void;

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
