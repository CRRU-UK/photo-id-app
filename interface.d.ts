import type {
  EditorNavigation,
  ExportTypes,
  ExternalLinks,
  LoadingData,
  MLMatchResponse,
  MLModelDraft,
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
  exportMatches: (data: string, type: ExportTypes) => Promise<void>;
  savePhotoFile: (data: PhotoBody) => Promise<void>;
  revertPhotoFile: (data: PhotoBody) => Promise<PhotoBody>;
  navigateEditorPhoto: (data: PhotoBody, direction: EditorNavigation) => Promise<string | null>;
  duplicatePhotoFile: (data: PhotoBody) => Promise<PhotoBody>;
  getSettings: () => Promise<SettingsData>;
  updateSettings: (settings: SettingsData) => Promise<void>;
  analyseStack: (photos: PhotoBody[]) => Promise<MLMatchResponse | null>;
  saveModel: (draft: MLModelDraft) => Promise<void>;
  deleteModel: (modelId: string) => Promise<void>;

  // Methods (renderer-to-main)
  openProjectFolder: () => void;
  openProjectFile: () => void;
  openRecentProject: (path: string) => Promise<void>;
  saveProject: (data: string) => Promise<void>;
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
