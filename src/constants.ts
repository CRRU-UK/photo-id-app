export const DEFAULT_WINDOW_TITLE = "Photo ID";

export const PHOTO_FILE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".tiff"];

export const EXISTING_DATA_MESSAGE =
  "Data file already exists for this folder - choose whether to open the existing data, replace/reset the existing data, or cancel.";

export const EXISTING_DATA_BUTTONS = ["Cancel", "Open Existing Data", "Replace Existing Data"];

export const SIDEBAR_WIDTHS = {
  MIN: 300,
  MAX: 500,
  DEFAULT: 400,
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

export const RECENT_PROJECTS_FILE_NAME = "recent-projects.json";

export const MAX_RECENT_PROJECTS = 5;
