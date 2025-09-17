import type {
  EditorNavigation,
  LoadingData,
  PhotoBody,
  ProjectBody,
  RecentProject,
} from "./src/types";

export interface IElectronAPI {
  // Invocations (main and renderer)
  getRecentProjects: () => Promise<RecentProject[]>;
  removeRecentProject: (path: string) => Promise<RecentProject[]>;
  exportMatches: (data: string) => Promise<void>;
  savePhotoFile: (data: PhotoBody, photo: ArrayBuffer) => Promise<void>;
  revertPhotoFile: (data: PhotoBody) => Promise<PhotoBody>;
  navigateEditorPhoto: (data: PhotoBody, direction: EditorNavigation) => Promise<string | null>;
  duplicatePhotoFile: (data: PhotoBody) => Promise<PhotoBody>;

  // Methods (renderer-to-main)
  openProjectFolder: () => void;
  openProjectFile: () => void;
  openRecentProject: (path: string) => void;
  saveProject: (data: string) => void;
  closeProject: () => void;
  openEditWindow: (data: PhotoBody) => void;
  openUserGuide: () => void;

  // Listeners (main-to-renderer)
  onLoading: (callback: (data: LoadingData) => void) => void;
  onLoadProject: (callback: (value: ProjectBody) => void) => void;
  onUpdatePhoto: (callback: (data: PhotoBody) => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
