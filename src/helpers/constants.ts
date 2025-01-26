export const DEFAULT_WINDOW_TITLE = "CRRU Photo ID";

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
