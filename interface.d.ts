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
  analyseStack: (photos: PhotoBody[]) => Promise<MLMatchResponse | null>;
  cancelAnalyseStack: () => void;
  closeProject: () => void;
  deleteModel: (modelId: string) => Promise<void>;
  duplicatePhotoFile: (data: PhotoBody) => Promise<PhotoBody>;
  exportMatches: (data: string, type: ExportTypes) => Promise<void>;
  flushSaveProject: (data: string) => boolean;
  getCurrentProject: () => Promise<ProjectBody | null>;
  getEncryptionAvailability: () => Promise<boolean>;
  getRecentProjects: () => Promise<RecentProject[]>;
  getSettings: () => Promise<SettingsData>;
  navigateEditorPhoto: (data: PhotoBody, direction: EditorNavigation) => Promise<string | null>;
  onLoading: (callback: (data: LoadingData) => void) => () => void;
  onLoadProject: (callback: (value: ProjectBody) => void) => () => void;
  onOpenSettings: (callback: () => void) => () => void;
  onSettingsUpdated: (callback: (data: SettingsData) => void) => () => void;
  onUpdatePhoto: (callback: (data: PhotoBody) => void) => () => void;
  openEditWindow: (data: PhotoBody) => void;
  openExternalLink: (link: ExternalLinks) => void;
  openProjectFile: () => void;
  openProjectFolder: () => void;
  openRecentProject: (path: string) => Promise<void>;
  removeRecentProject: (path: string) => Promise<RecentProject[]>;
  revertPhotoFile: (data: PhotoBody) => Promise<PhotoBody>;
  saveModel: (draft: MLModelDraft) => Promise<void>;
  savePhotoFile: (data: PhotoBody) => Promise<void>;
  saveProject: (data: string) => Promise<void>;
  updateSettings: (settings: SettingsData) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
