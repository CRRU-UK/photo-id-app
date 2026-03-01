import type {
  EditorNavigation,
  ExternalLinks,
  LoadingData,
  MLMatchResponse,
  PhotoBody,
  ProjectBody,
  RecentProject,
  SettingsData,
} from "./src/types";

export interface IElectronAPI {
  // Invocations (main and renderer)
  getCurrentProject: () => Promise<ProjectBody | null>;
  getRecentProjects: () => Promise<RecentProject[]>;
  removeRecentProject: (path: string) => Promise<RecentProject[]>;
  exportMatches: (data: string) => Promise<void>;
  savePhotoFile: (data: PhotoBody) => Promise<void>;
  revertPhotoFile: (data: PhotoBody) => Promise<PhotoBody>;
  navigateEditorPhoto: (data: PhotoBody, direction: EditorNavigation) => Promise<string | null>;
  duplicatePhotoFile: (data: PhotoBody) => Promise<PhotoBody>;
  getSettings: () => Promise<SettingsData>;
  updateSettings: (settings: SettingsData) => Promise<void>;
  analyseStack: (photos: PhotoBody[]) => Promise<MLMatchResponse | null>;

  // Methods (renderer-to-main)
  openProjectFolder: () => void;
  openProjectFile: () => void;
  openRecentProject: (path: string) => void;
  saveProject: (data: string) => void;
  closeProject: () => void;
  openEditWindow: (data: PhotoBody) => void;
  openExternalLink: (link: ExternalLinks) => void;
  cancelAnalyseStack: () => void;

  // Listeners (main-to-renderer)
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
