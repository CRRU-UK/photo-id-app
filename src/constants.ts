import type { PhotoEdits, SettingsData } from "@/types";

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
  OPEN_SETTINGS = "ui:openSettings",
  GET_SETTINGS = "ui:getSettings",
  UPDATE_SETTINGS = "ui:updateSettings",
  SETTINGS_UPDATED = "ui:settingsUpdated",

  // Editor
  OPEN_EDIT_WINDOW = "edit:openEditWindow",
  NAVIGATE_EDITOR_PHOTO = "edit:navigateEditorPhoto",
}

export const DEFAULT_WINDOW_TITLE = "Photo ID";

export const PHOTO_FILE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

export const EXISTING_DATA_MESSAGE =
  "A data file already exists for this folder - choose whether to resume the existing data, replace/reset the existing data, or cancel.";

export const EXISTING_DATA_BUTTONS = ["Cancel", "Open Existing Data", "Replace Existing Data"];

export const MISSING_RECENT_PROJECT_MESSAGE =
  "Project not found, directory or data file may have been deleted.";

export const GLOBAL_KEYBOARD_HINTS = {
  OPEN_SETTINGS: "Mod+,",
};

export const PROJECT_KEYBOARD_HINTS = {
  OPEN_PROJECT_FOLDER: "Mod+O",
  OPEN_PROJECT_FILE: "Mod+Shift+O",
  CLOSE_PROJECT: "Mod+W",
};

export const EDITOR_TOOLTIPS = {
  ENABLE_EDGE_DETECTION: "Enable edge detection",
  DISABLE_EDGE_DETECTION: "Disable edge detection",
  PAN_LEFT: "Pan left",
  PAN_UP: "Pan up",
  PAN_DOWN: "Pan down",
  PAN_RIGHT: "Pan right",
  ZOOM_OUT: "Zoom out",
  ZOOM_IN: "Zoom in",
  PREVIOUS_PHOTO: "Previous photo",
  NEXT_PHOTO: "Next photo",
  RESET: "Reset",
  SAVE: "Save",
};

export const EDITOR_KEYBOARD_HINTS = {
  TOGGLE_EDGE_DETECTION: "E",
  PAN_LEFT: "ArrowLeft",
  PAN_UP: "ArrowUp",
  PAN_DOWN: "ArrowDown",
  PAN_RIGHT: "ArrowRight",
  ZOOM_OUT: "Mod+-",
  ZOOM_IN: "Mod+=",
  PREVIOUS_PHOTO: "p",
  NEXT_PHOTO: "n",
  RESET: "Mod+R",
  SAVE: "Mod+S",
};

export const EDITOR_KEYBOARD_CODES = {
  PREVIOUS_PHOTO: "p",
  NEXT_PHOTO: "n",
  PAN_LEFT: "ArrowLeft",
  PAN_UP: "ArrowUp",
  PAN_DOWN: "ArrowDown",
  PAN_RIGHT: "ArrowRight",
  TOGGLE_EDGE_DETECTION: "e",
  RESET: "r",
  SAVE: "s",
  ZOOM_OUT: "-",
  ZOOM_IN: "=",
};

export enum EditorPanDirection {
  LEFT = "left",
  RIGHT = "right",
  UP = "up",
  DOWN = "down",
}

export const KEYBOARD_CODE_TO_PAN_DIRECTION: Record<string, EditorPanDirection> = {
  [EDITOR_KEYBOARD_CODES.PAN_LEFT]: EditorPanDirection.LEFT,
  [EDITOR_KEYBOARD_CODES.PAN_RIGHT]: EditorPanDirection.RIGHT,
  [EDITOR_KEYBOARD_CODES.PAN_UP]: EditorPanDirection.UP,
  [EDITOR_KEYBOARD_CODES.PAN_DOWN]: EditorPanDirection.DOWN,
};

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

export const PROJECT_THUMBNAIL_DIRECTORY = ".thumbnails";

export const PROJECT_EXPORT_DIRECTORY = "matched";

export const THUMBNAIL_SIZE = 1000;

export const RECENT_PROJECTS_FILE_NAME = "recent-projects.json";

export const SETTINGS_FILE_NAME = "settings.json";

export const MAX_RECENT_PROJECTS = 5;

export const MATCHED_STACKS_PER_PAGE = 8;

export const INITIAL_MATCHED_STACKS = 52;

export enum EXTERNAL_LINKS {
  WEBSITE = "https://crru.org.uk",
  USER_GUIDE = "https://photoidapp.crru.org.uk",
  CHANGELOG = "https://github.com/CRRU-UK/photo-id-app/releases/$VERSION",
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

export const DEFAULT_PHOTO_EDITS: PhotoEdits = {
  brightness: IMAGE_FILTERS.BRIGHTNESS.DEFAULT,
  contrast: IMAGE_FILTERS.CONTRAST.DEFAULT,
  saturate: IMAGE_FILTERS.SATURATE.DEFAULT,
  zoom: IMAGE_EDITS.ZOOM,
  pan: { x: IMAGE_EDITS.PAN_X, y: IMAGE_EDITS.PAN_Y },
};

export const ZOOM_FACTORS = {
  BUTTON: 1.2,
  WHEEL: 1.02,
};

export const PAN_AMOUNT = 50;

export const EDGE_DETECTION = {
  MIN: 0,
  MAX: 100,
  DEFAULT: 50,
  CONTRAST: 50,
};

export const DEFAULT_SETTINGS: SettingsData = {
  themeMode: "dark",
  telemetry: "disabled",
};
