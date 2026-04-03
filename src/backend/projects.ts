import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { app, dialog } from "electron";
import { ZodError } from "zod";
import { createPhotoThumbnail } from "@/backend/photos";
import { addRecentProject } from "@/backend/recents";
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
  LoadingData,
  PhotoBody,
  ProjectBody,
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

let currentProjectDirectory: string | null = null;

/**
 * Returns the directory of the currently open project, or null if none. Used by `getCurrentProject`
 * to restore the project view after hot-reload (development).
 */
export const getCurrentProjectDirectory = (): string | null => currentProjectDirectory;

/**
 * Sets the current project directory (when a project is loaded or closed).
 */
export const setCurrentProject = (directory: string | null): void => {
  currentProjectDirectory = directory;
};

export const parseProjectFile = async (filePath: string): Promise<ProjectBody> => {
  const raw = await fs.promises.readFile(filePath, "utf8");
  const json: unknown = JSON.parse(raw);

  return projectBodySchema.parse(json);
};

const sendData = (mainWindow: Electron.BrowserWindow, data: ProjectBody) => {
  setCurrentProject(data.directory);

  mainWindow.setTitle(`${DEFAULT_WINDOW_TITLE} - ${data.directory}`);
  mainWindow.webContents.send(IPC_EVENTS.LOAD_PROJECT, data);
  mainWindow.focus();

  void addRecentProject({
    name: path.basename(data.directory),
    path: path.join(data.directory, PROJECT_FILE_NAME),
  });
};

const homePath = app.getPath("home");
const desktopPath = path.resolve(homePath, "Desktop");

/**
 * Prompts the user when a project file already exists in the chosen directory. Returns `true` if
 * the caller should proceed to create a new project (user chose to overwrite), or `false` if the
 * existing project was opened or the user cancelled.
 */
const handleExistingProjectFile = async (
  mainWindow: Electron.BrowserWindow,
  directory: string,
): Promise<boolean> => {
  const { response } = await dialog.showMessageBox({
    message: EXISTING_DATA_MESSAGE,
    type: "question",
    buttons: EXISTING_DATA_BUTTONS,
  });

  if (response === EXISTING_DATA_RESPONSE.CANCEL) {
    return false;
  }

  if (response === EXISTING_DATA_RESPONSE.OPEN_EXISTING) {
    try {
      const data = await parseProjectFile(path.join(directory, PROJECT_FILE_NAME));
      sendData(mainWindow, data);
    } catch (error) {
      console.error("Failed to load existing project file:", error);

      const message =
        error instanceof ZodError || error instanceof SyntaxError
          ? CORRUPTED_DATA_MESSAGE
          : String(error);

      dialog.showErrorBox("Invalid project file", message);
    }

    return false;
  }

  return true;
};

/**
 * Handles opening, filtering, and processing a project folder.
 */
const handleOpenDirectoryPrompt = async (mainWindow: Electron.BrowserWindow) => {
  const event = await dialog.showOpenDialog({
    title: "Open Project Folder",
    properties: ["openDirectory"],
    defaultPath: desktopPath,
  });

  if (event.canceled) {
    return;
  }

  const [directory] = event.filePaths;

  const files = await fs.promises.readdir(directory);

  if (files.includes(PROJECT_FILE_NAME)) {
    const shouldCreateNew = await handleExistingProjectFile(mainWindow, directory);
    if (!shouldCreateNew) {
      return;
    }
  }

  mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, {
    show: true,
    text: "Preparing project",
    progressValue: 0,
  } as LoadingData);

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
          directory,
          name: photoName,
          thumbnail: "",
          edits: DEFAULT_PHOTO_EDITS,
          isEdited: false,
        };

        thumbnails[batchStart + batchIndex] = await createPhotoThumbnail(photo);

        processed = processed + 1;

        mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, {
          show: true,
          text: "Preparing project",
          progressValue: (processed / photos.length) * 100,
          progressText: `Processing photo ${processed} of ${photos.length}`,
        } as LoadingData);
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
    directory,
    unassigned: {
      photos: photos.map((name, index) => ({
        directory,
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

  return sendData(mainWindow, data);
};

/**
 * Handles opening a project file.
 */
const handleOpenFilePrompt = async (mainWindow: Electron.BrowserWindow) => {
  const event = await dialog.showOpenDialog({
    title: "Open Project File",
    properties: ["openFile"],
    filters: [{ name: "Photo ID Projects", extensions: [PROJECT_FILE_EXTENSION] }],
    defaultPath: desktopPath,
  });

  if (event.canceled) {
    return;
  }

  mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, { show: true, text: "Opening project" });

  const [file] = event.filePaths;

  try {
    const data = await parseProjectFile(file);
    return sendData(mainWindow, data);
  } catch (error) {
    console.error("Failed to open project file:", error);
    dialog.showErrorBox("Invalid project file", String(error));

    mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, { show: false } as LoadingData);
  }
};

/**
 * Handles opening a recent project file. Validates the path has a .photoid extension before
 * attempting to open, to guard the IPC boundary.
 */
const handleOpenProjectFile = async (mainWindow: Electron.BrowserWindow, file: string) => {
  if (path.extname(file).toLowerCase() !== `.${PROJECT_FILE_EXTENSION}`) {
    console.error("Refused to open non-.photoid file path:", file);
    dialog.showErrorBox("Invalid file", "Only .photoid project files can be opened.");

    return;
  }

  mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, { show: true, text: "Opening project" });

  if (!fs.existsSync(file)) {
    dialog.showErrorBox(MISSING_RECENT_PROJECT_MESSAGE, file);
    mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, { show: false } as LoadingData);

    return;
  }

  try {
    const data = await parseProjectFile(file);
    return sendData(mainWindow, data);
  } catch (error) {
    console.error("Failed to open project file:", error);
    dialog.showErrorBox("Invalid project file", String(error));

    mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, { show: false } as LoadingData);
  }
};

/**
 * Handles saving a project file. Uses the currently open project directory (tracked when the
 * project is loaded) so the write path is authoritative; the payload is only validated, not used
 * for the file path.
 */
const handleSaveProject = async (data: string) => {
  const directory = getCurrentProjectDirectory();

  if (directory === null) {
    throw new Error("No project open");
  }

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
const handleFlushSaveProject = (data: string): void => {
  const directory = getCurrentProjectDirectory();

  if (directory === null) {
    return;
  }

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
const handleDuplicatePhotoFile = async (data: PhotoBody): Promise<PhotoBody> => {
  const originalPath = resolvePhotoPath(data.directory, data.name);
  const thumbnailPath = resolvePhotoPath(data.directory, data.thumbnail);

  const time = Date.now();

  const originalExtension = path.extname(data.name);
  const originalBaseName = path.basename(data.name, originalExtension);
  const originalDir = path.dirname(data.name);
  const newOriginalPath = path.join(
    originalDir,
    `${originalBaseName}_duplicate_${time}${originalExtension}`,
  );

  await fs.promises.copyFile(originalPath, path.join(data.directory, newOriginalPath));

  const thumbnailExtension = path.extname(data.thumbnail);
  const thumbnailBaseName = path.basename(data.thumbnail, thumbnailExtension);
  const thumbnailDir = path.dirname(data.thumbnail);
  const newThumbnailPath = path.join(
    thumbnailDir,
    `${thumbnailBaseName}_duplicate_${time}${thumbnailExtension}`,
  );

  await fs.promises.copyFile(thumbnailPath, path.join(data.directory, newThumbnailPath));

  return {
    directory: data.directory,
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
 * Returns photo to show in the editor on navigation based on direction.
 */
const handleEditorNavigate = async (
  data: PhotoBody,
  direction: EditorNavigation,
): Promise<PhotoBody | null> => {
  const projectPath = path.join(data.directory, PROJECT_FILE_NAME);
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
  findPhotoInProject,
  handleDuplicatePhotoFile,
  handleEditorNavigate,
  handleFlushSaveProject,
  handleOpenDirectoryPrompt,
  handleOpenFilePrompt,
  handleOpenProjectFile,
  handleSaveProject,
};
