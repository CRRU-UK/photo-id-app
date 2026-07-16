import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { app, dialog } from "electron";
import { ZodError } from "zod";
import { notifyRecentProjectsChanged } from "@/backend/menu";
import { createPhotoThumbnail } from "@/backend/photos";
import { addRecentProject } from "@/backend/recents";
import {
  flashWindow,
  sendLoading,
  setRepresentedProject,
  showProgressError,
} from "@/backend/shellIntegration";
import { windowManager } from "@/backend/WindowManager";
import {
  CORRUPTED_DATA_MESSAGE,
  DEFAULT_PHOTO_EDITS,
  DEFAULT_WINDOW_TITLE,
  EXISTING_DATA_BUTTONS,
  EXISTING_DATA_MESSAGE,
  EXISTING_DATA_RESPONSE,
  INITIAL_MATCHED_STACKS,
  IPC_EVENTS,
  MISSING_RECENT_PROJECT_MESSAGE,
  PHOTO_FILE_EXTENSIONS,
  PROJECT_FILE_EXTENSION,
  PROJECT_FILE_NAME,
  PROJECT_THUMBNAIL_DIRECTORY,
  THUMBNAIL_GENERATION_CONCURRENCY,
} from "@/constants";
import { projectBodySchema } from "@/schemas";
import type {
  CollectionBody,
  EditorNavigation,
  PhotoBody,
  ProjectBody,
  ProjectPayload,
} from "@/types";

/**
 * Validates that a filename does not escape the given directory via path traversal sequences.
 * Returns the resolved absolute path if valid, otherwise throws.
 */
export const resolvePhotoPath = (directory: string, fileName: string): string => {
  const resolved = path.resolve(directory, fileName);
  const resolvedDirectory = path.resolve(directory);

  if (!resolved.startsWith(resolvedDirectory + path.sep)) {
    throw new Error("Invalid photo path: escapes project directory");
  }

  return resolved;
};

/**
 * Reads and validates a `.photoid` file. The directory is derived by callers from the file's path.
 */
export const parseProjectFile = async (filePath: string): Promise<ProjectBody> => {
  const raw = await fs.promises.readFile(filePath, "utf8");
  const json: unknown = JSON.parse(raw);

  return projectBodySchema.parse(json);
};

const sendData = async (
  projectWindow: Electron.BrowserWindow,
  body: ProjectBody,
  directory: string,
) => {
  windowManager.setProject(projectWindow, directory);

  const projectFilePath = path.join(directory, PROJECT_FILE_NAME);
  setRepresentedProject(projectWindow, projectFilePath);

  projectWindow.setTitle(`${path.basename(directory)} - ${DEFAULT_WINDOW_TITLE}`);
  const payload: ProjectPayload = { body, directory };
  projectWindow.webContents.send(IPC_EVENTS.LOAD_PROJECT, payload);
  projectWindow.focus();

  await addRecentProject({
    name: path.basename(directory),
    path: projectFilePath,
  });

  await notifyRecentProjectsChanged();

  sendLoading(projectWindow, { show: false });
};

const homePath = app.getPath("home");
const desktopPath = path.resolve(homePath, "Desktop");

/**
 * Shows the folder-picker dialog and returns the chosen directory, or null if the dialog was
 * cancelled. Kept separate from the project-processing flow so the caller can decide which window
 * the project should load into after a directory is chosen.
 */
const promptForProjectFolder = async (): Promise<string | null> => {
  const event = await dialog.showOpenDialog({
    title: "Open Project Folder",
    properties: ["openDirectory"],
    defaultPath: desktopPath,
  });

  if (event.canceled) {
    return null;
  }

  return event.filePaths[0];
};

/**
 * Shows the project-file picker dialog and returns the chosen file path, or null if the dialog
 * was cancelled.
 */
const promptForProjectFile = async (): Promise<string | null> => {
  const event = await dialog.showOpenDialog({
    title: "Open Project File",
    properties: ["openFile"],
    filters: [{ name: "Photo ID Projects", extensions: [PROJECT_FILE_EXTENSION] }],
    defaultPath: desktopPath,
  });

  if (event.canceled) {
    return null;
  }

  return event.filePaths[0];
};

export type ExistingProjectChoice = "new" | "existing" | "cancel";

/**
 * Inspects a directory for a `.photoid` file. If found, prompts the user to open the existing
 * project, replace it, or cancel. Returns "new" if the directory has no existing project file
 * (no dialog needed). Run this BEFORE creating a target window so the user can cancel without
 * leaving an empty window behind.
 */
const checkExistingProjectChoice = async (directory: string): Promise<ExistingProjectChoice> => {
  const files = await fs.promises.readdir(directory);

  if (!files.includes(PROJECT_FILE_NAME)) {
    return "new";
  }

  const { response } = await dialog.showMessageBox({
    message: EXISTING_DATA_MESSAGE,
    type: "question",
    buttons: EXISTING_DATA_BUTTONS,
  });

  if (response === EXISTING_DATA_RESPONSE.CANCEL) {
    return "cancel";
  }

  if (response === EXISTING_DATA_RESPONSE.OPEN_EXISTING) {
    return "existing";
  }

  return "new";
};

/**
 * Loads an existing project file from a directory (assumes `<directory>/project.photoid` exists
 * and is valid) into the given window. Shows a user-friendly error dialog if the file is
 * corrupted.
 */
const loadExistingProject = async (
  projectWindow: Electron.BrowserWindow,
  directory: string,
): Promise<void> => {
  windowManager.setProject(projectWindow, directory);

  try {
    const filePath = path.join(directory, PROJECT_FILE_NAME);
    const body = await parseProjectFile(filePath);
    await sendData(projectWindow, body, directory);
  } catch (error) {
    windowManager.clearProject(projectWindow);
    console.error("Failed to load existing project file:", error);

    const message =
      error instanceof ZodError || error instanceof SyntaxError
        ? CORRUPTED_DATA_MESSAGE
        : String(error);

    dialog.showErrorBox("Invalid project file", message);
  }
};

/**
 * Creates a new project in a directory: scans for image files, generates thumbnails, writes the
 * `.photoid` file, and notifies the renderer. The caller is responsible for choosing the
 * directory and the target window, and for resolving the existing-project-file choice up-front
 * via `checkExistingProjectChoice`.
 *
 * Reserves the directory in `WindowManager` immediately so a concurrent open of the same folder
 * sees this load in flight (via `findWindowForProject`) and focuses this window instead of
 * starting a second copy. The reservation is cleared on failure.
 */
const processProjectFolder = async (projectWindow: Electron.BrowserWindow, directory: string) => {
  windowManager.setProject(projectWindow, directory);

  try {
    return await runProcessProjectFolder(projectWindow, directory);
  } catch (error) {
    windowManager.clearProject(projectWindow);
    throw error;
  }
};

const runProcessProjectFolder = async (
  projectWindow: Electron.BrowserWindow,
  directory: string,
) => {
  const files = await fs.promises.readdir(directory);

  sendLoading(projectWindow, {
    show: true,
    text: "Preparing project",
    progressValue: 0,
  });

  try {
    return await prepareNewProject(projectWindow, directory, files);
  } catch (error) {
    showProgressError(projectWindow);
    throw error;
  }
};

const prepareNewProject = async (
  projectWindow: Electron.BrowserWindow,
  directory: string,
  files: string[],
) => {
  const photoChecks = await Promise.all(
    files.map(async (fileName) => {
      // Filter non-images based on file extension
      if (
        !PHOTO_FILE_EXTENSIONS.some(
          (extension) => extension.toLowerCase() === path.extname(fileName.toLowerCase()),
        )
      ) {
        return false;
      }

      // Filter directories
      const stat = await fs.promises.lstat(path.join(directory, fileName));
      return stat.isFile();
    }),
  );

  const photos = files.filter((_, index) => photoChecks[index]);

  const thumbnailDirectory = path.join(directory, PROJECT_THUMBNAIL_DIRECTORY);
  if (!fs.existsSync(thumbnailDirectory)) {
    await fs.promises.mkdir(thumbnailDirectory);
  }

  const thumbnails: string[] = Array.from<string>({ length: photos.length }).fill("");
  let processed = 0;

  // Process thumbnails in batches to parallelise I/O while limiting peak memory usage
  for (
    let batchStart = 0;
    batchStart < photos.length;
    batchStart += THUMBNAIL_GENERATION_CONCURRENCY
  ) {
    const batch = photos.slice(batchStart, batchStart + THUMBNAIL_GENERATION_CONCURRENCY);

    await Promise.all(
      batch.map(async (photoName, batchIndex) => {
        const photo: PhotoBody = {
          name: photoName,
          thumbnail: "",
          edits: DEFAULT_PHOTO_EDITS,
          isEdited: false,
        };

        thumbnails[batchStart + batchIndex] = await createPhotoThumbnail(directory, photo);

        processed = processed + 1;

        sendLoading(projectWindow, {
          show: true,
          text: "Preparing project",
          progressValue: (processed / photos.length) * 100,
          progressText: `Processing photo ${processed} of ${photos.length}`,
        });
      }),
    );
  }

  const now = new Date().toISOString();

  /**
   * Creates `INITIAL_MATCHED_STACKS` empty match pairs. Each pair becomes two MobX Collection
   * instances (104 total). This is a one-time cost at project creation as observables are cheap.
   */
  const defaultMatches = [];
  for (let i = 0; i < INITIAL_MATCHED_STACKS; i += 1) {
    defaultMatches.push({
      id: i + 1,
      left: { name: "", index: 0, photos: [] },
      right: { name: "", index: 0, photos: [] },
    });
  }

  const data: ProjectBody = {
    version: "v1",
    id: crypto.randomUUID(),
    unassigned: {
      photos: photos.map((name, index) => ({
        name,
        thumbnail: thumbnails[index],
        edits: DEFAULT_PHOTO_EDITS,
        isEdited: false,
      })),
      index: 0,
    },
    discarded: {
      photos: [],
      index: 0,
    },
    matched: defaultMatches,
    created: now,
    lastModified: now,
  };

  await fs.promises.writeFile(
    path.join(directory, PROJECT_FILE_NAME),
    JSON.stringify(data),
    "utf8",
  );

  flashWindow(projectWindow);

  return await sendData(projectWindow, data, directory);
};

/**
 * Loads a project from a `.photoid` file path into the given window. Validates the path has a
 * `.photoid` extension before attempting to open, to guard the IPC boundary.
 */
const handleOpenProjectFile = async (projectWindow: Electron.BrowserWindow, file: string) => {
  if (path.extname(file).toLowerCase() !== `.${PROJECT_FILE_EXTENSION}`) {
    console.error("Refused to open non-.photoid file path:", file);
    dialog.showErrorBox("Invalid file", "Only .photoid project files can be opened.");

    return;
  }

  sendLoading(projectWindow, { show: true, text: "Opening project" });

  if (!fs.existsSync(file)) {
    dialog.showErrorBox(MISSING_RECENT_PROJECT_MESSAGE, file);
    sendLoading(projectWindow, { show: false });

    return;
  }

  const directory = path.dirname(file);
  windowManager.setProject(projectWindow, directory);

  try {
    const body = await parseProjectFile(file);
    return await sendData(projectWindow, body, directory);
  } catch (error) {
    windowManager.clearProject(projectWindow);
    console.error("Failed to open project file:", error);
    dialog.showErrorBox("Invalid project file", String(error));

    sendLoading(projectWindow, { show: false });
  }
};

/**
 * Handles saving a project file. Writes to the supplied directory and the directory is
 * authoritative (resolved from the sender's project window), and the payload is only validated.
 */
const handleSaveProject = async (directory: string, data: string): Promise<void> => {
  const json: unknown = JSON.parse(data);
  const result = projectBodySchema.safeParse(json);

  if (!result.success) {
    throw new Error(`Invalid project data: ${result.error.message}`);
  }

  await fs.promises.writeFile(path.join(directory, PROJECT_FILE_NAME), data, "utf8");
};

/**
 * Synchronous version of `handleSaveProject` for use during app shutdown (`beforeunload`). Uses
 * `writeFileSync` to guarantee the write completes before the process exits.
 */
const handleFlushSaveProject = (directory: string, data: string): void => {
  try {
    const json: unknown = JSON.parse(data);
    const result = projectBodySchema.safeParse(json);

    if (!result.success) {
      console.error("Flush save failed: invalid project data:", result.error.message);
      return;
    }

    fs.writeFileSync(path.join(directory, PROJECT_FILE_NAME), data, "utf8");
  } catch (error) {
    console.error("Flush save failed:", error);
  }
};

/**
 * Duplicates the original, edited, and thumbnail versions of a photo a returns the new filenames.
 */
const handleDuplicatePhotoFile = async (directory: string, data: PhotoBody): Promise<PhotoBody> => {
  const originalPath = resolvePhotoPath(directory, data.name);
  const thumbnailPath = resolvePhotoPath(directory, data.thumbnail);

  const time = Date.now();

  const originalExtension = path.extname(data.name);
  const originalBaseName = path.basename(data.name, originalExtension);
  const originalDir = path.dirname(data.name);
  const newOriginalPath = path.join(
    originalDir,
    `${originalBaseName}_duplicate_${time}${originalExtension}`,
  );

  await fs.promises.copyFile(originalPath, path.join(directory, newOriginalPath));

  const thumbnailExtension = path.extname(data.thumbnail);
  const thumbnailBaseName = path.basename(data.thumbnail, thumbnailExtension);
  const thumbnailDir = path.dirname(data.thumbnail);
  const newThumbnailPath = path.join(
    thumbnailDir,
    `${thumbnailBaseName}_duplicate_${time}${thumbnailExtension}`,
  );

  await fs.promises.copyFile(thumbnailPath, path.join(directory, newThumbnailPath));

  return {
    name: newOriginalPath,
    thumbnail: newThumbnailPath,
    edits: data.edits,
    isEdited: data.isEdited,
  };
};

/**
 * Finds a photo in a project and returns its collection (if any).
 */
const findPhotoInProject = (project: ProjectBody, photo: PhotoBody): CollectionBody | null => {
  const { name } = photo;

  const inUnassigned = project.unassigned.photos.some(
    (candidate: PhotoBody) => candidate.name === name,
  );
  if (inUnassigned) {
    return project.unassigned;
  }

  const inDiscarded = project.discarded.photos.some(
    (candidate: PhotoBody) => candidate.name === name,
  );
  if (inDiscarded) {
    return project.discarded;
  }

  for (const match of project.matched) {
    const inLeft = match.left.photos.some((candidate: PhotoBody) => candidate.name === name);
    if (inLeft) {
      return match.left;
    }

    const inRight = match.right.photos.some((candidate: PhotoBody) => candidate.name === name);
    if (inRight) {
      return match.right;
    }
  }

  return null;
};

/**
 * Returns photo to show in the editor on navigation based on direction. Reads the current project
 * file from the supplied project directory.
 */
const handleEditorNavigate = async (
  directory: string,
  data: PhotoBody,
  direction: EditorNavigation,
): Promise<PhotoBody | null> => {
  const projectPath = path.join(directory, PROJECT_FILE_NAME);
  const projectData = await parseProjectFile(projectPath);

  const collection = findPhotoInProject(projectData, data);
  if (!collection) {
    console.error("Photo not found in project", data);
    throw new Error("Photo not found in project");
  }

  // Return same photo if the collection only contains one photo or is empty
  if (collection.photos.length <= 1) {
    return null;
  }

  const currentIndex = collection.photos.findIndex((photo) => photo.name === data.name);
  let newIndex = currentIndex;

  if (direction === "next") {
    newIndex = (currentIndex + 1) % collection.photos.length;
  }

  if (direction === "prev") {
    newIndex = (currentIndex - 1) % collection.photos.length;
    if (newIndex < 0) {
      newIndex = collection.photos.length - 1;
    }
  }

  return collection.photos[newIndex];
};

export {
  checkExistingProjectChoice,
  findPhotoInProject,
  handleDuplicatePhotoFile,
  handleEditorNavigate,
  handleFlushSaveProject,
  handleOpenProjectFile,
  handleSaveProject,
  loadExistingProject,
  processProjectFolder,
  promptForProjectFile,
  promptForProjectFolder,
};
