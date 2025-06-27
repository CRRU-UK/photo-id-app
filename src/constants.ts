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

export const PROJECT_THUMBNAIL_DIRECTORY = ".thumbnails";

export const THUMBNAIL_SIZE = 1000;

export const RECENT_PROJECTS_FILE_NAME = "recent-projects.json";

export const MAX_RECENT_PROJECTS = 5;

export const MATCHED_STACKS_PER_PAGE = 6;

export const INITIAL_MATCHED_STACKS = 52;

export enum LINE_SIZES {
  LIGHT = 20,
  NORMAL = 100,
  HEAVY = 180,
}

export const DEFAULT_LINE_COLOR = "#FFFFFF";
