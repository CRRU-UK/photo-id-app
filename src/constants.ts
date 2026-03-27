import type { MLModel } from "@/types";

export enum IPC_EVENTS {
  // Projects
  OPEN_FOLDER = "project:openFolderPrompt",
  OPEN_FILE = "project:openFilePrompt",
  OPEN_PROJECT_FILE = "project:openProjectFile",
  GET_CURRENT_PROJECT = "project:getCurrentProject",
  GET_RECENT_PROJECTS = "project:getRecentProjects",
  REMOVE_RECENT_PROJECT = "project:removeRecentProject",
  SAVE_PROJECT = "project:saveProject",
  LOAD_PROJECT = "project:loadProject",
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

  // Save
  FLUSH_SAVE_PROJECT = "project:flushSaveProject",

  // Machine Learning
  SAVE_MODEL = "ml:saveModel",
  DELETE_MODEL = "ml:deleteModel",
  ANALYSE_STACK = "ml:analyseStack",
  CANCEL_ANALYSE_STACK = "ml:cancelAnalyseStack",
  GET_ENCRYPTION_AVAILABILITY = "ml:getEncryptionAvailability",
}

export const ROUTES = {
  INDEX: "/",
  PROJECT: "/project",
  EDIT: "/edit",
} as const;

export const DEFAULT_WINDOW_TITLE = "Photo ID";

export const PHOTO_FILE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

export const PHOTO_PROTOCOL_SCHEME = "photo";

export const CSP_HEADERS = [
  `default-src 'self'`,
  `script-src 'self'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' ${PHOTO_PROTOCOL_SCHEME}: data: blob:`,
  `connect-src 'self' ${PHOTO_PROTOCOL_SCHEME}: https://*.sentry.io https://*.ingest.sentry.io`,
  `worker-src 'self' blob:`,
].join("; ");

export const THUMBNAIL_GENERATION_CONCURRENCY = 3;

export const SAVE_PROJECT_DEBOUNCE_MS = 1000;

export const UNSAVED_EDITS_MESSAGE =
  "This photo has unsaved edits. Are you sure you want to discard your changes?";

export const CORRUPTED_DATA_MESSAGE =
  "The file contains corrupted data. It may have been modified outside the app.";

export const EXISTING_DATA_MESSAGE =
  "A data file already exists for this folder - choose whether to resume the existing data, replace/reset the existing data, or cancel.";

export const EXISTING_DATA_BUTTONS = ["Cancel", "Open Existing Data", "Replace Existing Data"];

export const EXISTING_DATA_RESPONSE = {
  CANCEL: 0,
  OPEN_EXISTING: 1,
  REPLACE: 2,
} as const;

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

export const PROJECT_TOOLTIPS = {
  EDIT_PHOTO: "Edit photo",
  PREVIOUS_PHOTO: "Previous photo",
  NEXT_PHOTO: "Next photo",
  MORE_OPTIONS: "More options",
  REVERT_PHOTO: "Revert to original",
  REVERTING_PHOTO: "Reverting...",
  ANALYSE_PHOTOS: "Analyse photos",
};

export const EDITOR_TOOLTIPS = {
  ENABLE_EDGE_DETECTION: "Enable edge detection",
  DISABLE_EDGE_DETECTION: "Disable edge detection",
  ENABLE_LOUPE: "Enable loupe",
  DISABLE_LOUPE: "Disable loupe",
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

/**
 * Editor keyboard bindings. Each entry has a `hint` (display string for `KeybindingHint`) and a
 * `code` (lowercase key value used in the keydown handler).
 */
export const EDITOR_KEYS: {
  [key: string]: {
    hint: string;
    code: string;
  };
} = {
  TOGGLE_EDGE_DETECTION: { hint: "E", code: "e" },
  TOGGLE_LOUPE: { hint: "Space", code: "Space" },
  PAN_LEFT: { hint: "ArrowLeft", code: "ArrowLeft" },
  PAN_UP: { hint: "ArrowUp", code: "ArrowUp" },
  PAN_DOWN: { hint: "ArrowDown", code: "ArrowDown" },
  PAN_RIGHT: { hint: "ArrowRight", code: "ArrowRight" },
  ZOOM_OUT: { hint: "Mod+-", code: "-" },
  ZOOM_IN: { hint: "Mod+=", code: "=" },
  PREVIOUS_PHOTO: { hint: "p", code: "p" },
  NEXT_PHOTO: { hint: "n", code: "n" },
  RESET: { hint: "Mod+R", code: "r" },
  SAVE: { hint: "Mod+S", code: "s" },
} as const;

export enum EditorPanDirection {
  LEFT = "left",
  RIGHT = "right",
  UP = "up",
  DOWN = "down",
}

export const KEYBOARD_CODE_TO_PAN_DIRECTION: Record<string, EditorPanDirection> = {
  [EDITOR_KEYS.PAN_LEFT.code]: EditorPanDirection.LEFT,
  [EDITOR_KEYS.PAN_RIGHT.code]: EditorPanDirection.RIGHT,
  [EDITOR_KEYS.PAN_UP.code]: EditorPanDirection.UP,
  [EDITOR_KEYS.PAN_DOWN.code]: EditorPanDirection.DOWN,
};

export enum DragAreas {
  MainSelection = "main-selection",
  DiscardedSelection = "discarded-selection",
}

export const BOX_HOVER_STYLES = {
  backgroundColor: "var(--bgColor-neutral-muted)",
  boxShadow: "0 0 0 3px var(--borderColor-done-emphasis)",
};

export const PROJECT_FILE_EXTENSION = "photoid";

export const PROJECT_FILE_NAME = `project.${PROJECT_FILE_EXTENSION}`;

export const PROJECT_THUMBNAIL_DIRECTORY = "thumbnails";

export const PROJECT_EXPORT_DIRECTORY = "matched";

export const PROJECT_EXPORT_DATA_DIRECTORY = "data";

export const PROJECT_EXPORT_CSV_FILE_NAME = "matches.csv";

export const THUMBNAIL_SIZE = 1000;

export const RECENT_PROJECTS_FILE_NAME = "recent-projects.json";

export const SETTINGS_FILE_NAME = "settings.json";

export const TOKENS_FILE_NAME = "tokens.json";

export const MAX_RECENT_PROJECTS = 5;

export const MATCHED_STACKS_PER_PAGE = 8;

export const INITIAL_MATCHED_STACKS = 52;

export enum EXTERNAL_LINKS {
  WEBSITE = "https://crru.org.uk",
  USER_GUIDE = "https://photoidapp.crru.org.uk/user-guide/usage/",
  USER_GUIDE_ML = "https://photoidapp.crru.org.uk/user-guide/machine-learning/",
  USER_GUIDE_ML_TOKENS = "https://photoidapp.crru.org.uk/user-guide/machine-learning/#api-tokens",
  KEYBOARD_SHORTCUTS = "https://photoidapp.crru.org.uk/user-guide/keyboard-shortcuts/",
  CHANGELOG = "https://github.com/CRRU-UK/photo-id-app/releases/$VERSION",
  PRIVACY = "https://photoidapp.crru.org.uk/privacy/",
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

export const DEFAULT_PHOTO_EDITS = {
  brightness: IMAGE_FILTERS.BRIGHTNESS.DEFAULT,
  contrast: IMAGE_FILTERS.CONTRAST.DEFAULT,
  saturate: IMAGE_FILTERS.SATURATE.DEFAULT,
  zoom: IMAGE_EDITS.ZOOM,
  pan: { x: IMAGE_EDITS.PAN_X, y: IMAGE_EDITS.PAN_Y },
} as const;

export const ZOOM_FACTORS = {
  BUTTON: 1.2,
  WHEEL_DELTA_PIXEL_FACTOR: 1.02, // Trackpad
  WHEEL_DELTA_LINE_FACTOR: 1.08, // Mouse wheel
};

export const PAN_AMOUNT = 50;

export const LOUPE = {
  SIZE: 450, // Maximum size in CSS pixels
  MIN_SIZE: 150, // Minimum size in CSS pixels
  ZOOM: 2,
};

export const EDGE_DETECTION = {
  MIN: 0,
  MAX: 100,
  DEFAULT: 50,
  CONTRAST: 50,
};

export const DEFAULT_SETTINGS = {
  version: "v1" as const,
  themeMode: "dark" as const,
  telemetry: "disabled" as const,
  mlModels: [] as MLModel[],
  selectedModelId: null,
};

// Machine Learning

export const ANALYSIS_API_IMAGE_SIZE = 1000;

export const ANALYSIS_API_IMAGE_JPEG_QUALITY = 85;

export const ANALYSIS_API_REQUEST_TIMEOUT_MS = 120_000; // 2 minutes

export const ANALYSIS_RESULTS_PER_PAGE = 10;

export const RATING_THRESHOLDS = {
  GOOD: 82,
  AVERAGE: 70,
};
