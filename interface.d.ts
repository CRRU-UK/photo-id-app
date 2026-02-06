import type {
  EditorNavigation,
  LoadingData,
  PhotoBody,
  ProjectBody,
  RecentProject,
  SettingsData,
} from "./src/types";

export interface IElectronAPI {
  // Invocations (main and renderer)
  getRecentProjects: () => Promise<RecentProject[]>;
  removeRecentProject: (path: string) => Promise<RecentProject[]>;
  exportMatches: (data: string) => Promise<void>;
  savePhotoFile: (data: PhotoBody) => Promise<void>;
  revertPhotoFile: (data: PhotoBody) => Promise<PhotoBody>;
  navigateEditorPhoto: (data: PhotoBody, direction: EditorNavigation) => Promise<string | null>;
  duplicatePhotoFile: (data: PhotoBody) => Promise<PhotoBody>;
  getSettings: () => Promise<SettingsData>;
  updateSettings: (settings: SettingsData) => Promise<void>;

  // Methods (renderer-to-main)
  openProjectFolder: () => void;
  openProjectFile: () => void;
  openRecentProject: (path: string) => void;
  saveProject: (data: string) => void;
  closeProject: () => void;
  openEditWindow: (data: PhotoBody) => void;
  openExternalLink: (link: ExternalLinks) => void;

  // Listeners (main-to-renderer); each returns an unsubscribe function for cleanup
  onLoading: (callback: (data: LoadingData) => void) => () => void;
  onLoadProject: (callback: (value: ProjectBody) => void) => () => void;
  onOpenSettings: (callback: () => void) => () => void;
  onUpdatePhoto: (callback: (data: PhotoBody) => void) => () => void;
  onSettingsUpdated: (callback: (data: SettingsData) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
