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
  CLOSE_PROJECT = "project:closeProject",

  // Photos
  SAVE_PHOTO_FILE = "photos:savePhotoFile",
  REVERT_PHOTO_FILE = "photos:revertPhotoFile",
  DUPLICATE_PHOTO_FILE = "photos:duplicatePhotoFile",
  EXPORT_MATCHES = "photos:exportMatches",
  UPDATE_PHOTO = "photos:updatePhoto",

  // UI
  SET_LOADING = "ui:setLoading",
  OPEN_EXTERNAL_LINK = "ui:openExternalLink",

  // Editor
  OPEN_EDIT_WINDOW = "edit:openEditWindow",
  NAVIGATE_EDITOR_PHOTO = "edit:navigateEditorPhoto",
}

export const DEFAULT_WINDOW_TITLE = "Photo ID";

export const PHOTO_FILE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".tiff"];

export const EXISTING_DATA_MESSAGE =
  "A data file already exists for this folder - choose whether to resume the existing data, replace/reset the existing data, or cancel.";

export const EXISTING_DATA_BUTTONS = ["Cancel", "Open Existing Data", "Replace Existing Data"];

export const MISSING_RECENT_PROJECT_MESSAGE =
  "Project not found, directory or data file may have been deleted.";

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

export enum EXTERNAL_LINKS {
  WEBSITE = "https://crru.org.uk",
  USER_GUIDE = "https://photoidapp.crru.org.uk",
  CHANGELOG = "https://github.com/CRRU-UK/photo-id-app/releases/latest",
}

export const IMAGE_FILTERS = {
  BRIGHTNESS: {
    MIN: 0,
    MAX: 200,
    DEFAULT: 100,
  },
  CONTRAST: {
    MIN: 0,
    MAX: 200,
    DEFAULT: 100,
  },
  SATURATE: {
    MIN: 0,
    MAX: 200,
    DEFAULT: 100,
  },
};

export const IMAGE_EDITS = {
  ZOOM: 1,
  PAN_X: 0,
  PAN_Y: 0,
};

export const ZOOM_FACTORS = {
  BUTTON: 1.2,
  WHEEL: 1.02,
};

export const EDGE_DETECTION = {
  MIN: 0,
  MAX: 100,
  DEFAULT: 50,
  CONTRAST: 50,
};
