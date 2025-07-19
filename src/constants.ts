export enum IPC_EVENTS {
  // Projects
  OPEN_FOLDER = "project:openFolderPrompt",
  OPEN_FILE = "project:openFilePrompt",
  OPEN_PROJECT_FILE = "project:openProjectFile",
  GET_RECENT_PROJECTS = "project:getRecentProjects",
  REMOVE_RECENT_PROJECT = "project:removeRecentProject",
  SAVE_PROJECT = "project:saveProject",
  LOAD_PROJECT = "project:loadProject",
  LOAD_RECENT_PROJECTS = "project:loadRecentProjects",

  // Photos
  SAVE_PHOTO_FILE = "photos:savePhotoFile",
  REVERT_PHOTO_FILE = "photos:revertPhotoFile",
  DUPLICATE_PHOTO_FILE = "photos:duplicatePhotoFile",
  EXPORT_MATCHES = "photos:exportMatches",
  UPDATE_PHOTO = "photos:updatePhoto",

  // UI
  SET_LOADING = "ui:setLoading",
  OPEN_EDIT_WINDOW = "edit:openEditWindow",
}

export const DEFAULT_WINDOW_TITLE = "Photo ID";

export const PHOTO_FILE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".tiff"];

export const EXISTING_DATA_MESSAGE =
  "A data file already exists for this folder - choose whether to resume the existing data, replace/reset the existing data, or cancel.";

export const EXISTING_DATA_BUTTONS = ["Cancel", "Open Existing Data", "Replace Existing Data"];

export enum DragAreas {
  MainSelection = "main-selection",
  DiscardedSelection = "discarded-selection",
}

export const BOX_HOVER_STYLES = {
  backgroundColor: "var(--bgColor-neutral-muted)",
  boxShadow: "0 0 0 3px var(--borderColor-done-emphasis)",
};

export const PROJECT_FILE_NAME = "data.json";

export const PROJECT_STORAGE_NAME = "currentProject";

export const PROJECT_EDITS_DIRECTORY = ".edits";

export const PROJECT_THUMBNAIL_DIRECTORY = ".thumbnails";

export const PROJECT_EXPORT_DIRECTORY = "matched";

export const THUMBNAIL_SIZE = 1000;

export const RECENT_PROJECTS_FILE_NAME = "recent-projects.json";

export const MAX_RECENT_PROJECTS = 5;

export const MATCHED_STACKS_PER_PAGE = 8;

export const INITIAL_MATCHED_STACKS = 52;

export enum LINE_SIZES {
  LIGHT = 10,
  NORMAL = 20,
  HEAVY = 50,
}

export const DEFAULT_LINE_COLOR = "#FF0000";
