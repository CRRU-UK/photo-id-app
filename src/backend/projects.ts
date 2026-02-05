import { app, dialog } from "electron";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type {
  CollectionBody,
  EditorNavigation,
  LoadingData,
  PhotoBody,
  ProjectBody,
} from "@/types";

import { renderFullImageWithEdits } from "@/backend/imageRenderer";
import { createPhotoThumbnail } from "@/backend/photos";
import { addRecentProject } from "@/backend/recents";
import {
  DEFAULT_PHOTO_EDITS,
  DEFAULT_WINDOW_TITLE,
  EXISTING_DATA_BUTTONS,
  EXISTING_DATA_MESSAGE,
  INITIAL_MATCHED_STACKS,
  IPC_EVENTS,
  MISSING_RECENT_PROJECT_MESSAGE,
  PHOTO_FILE_EXTENSIONS,
  PROJECT_EXPORT_DIRECTORY,
  PROJECT_FILE_NAME,
  PROJECT_THUMBNAIL_DIRECTORY,
} from "@/constants";
import { getAlphabetLetter } from "@/helpers";

const sendData = (mainWindow: Electron.BrowserWindow, data: ProjectBody) => {
  mainWindow.setTitle(`${DEFAULT_WINDOW_TITLE} - ${data.directory}`);
  mainWindow.webContents.send(IPC_EVENTS.LOAD_PROJECT, data);
  mainWindow.focus();

  addRecentProject({
    name: path.basename(data.directory),
    path: path.join(data.directory, PROJECT_FILE_NAME),
  });
};

const homePath = app.getPath("home");
const desktopPath = path.resolve(homePath, "Desktop");

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
    const { response } = await dialog.showMessageBox({
      message: EXISTING_DATA_MESSAGE,
      type: "question",
      buttons: EXISTING_DATA_BUTTONS,
    });

    // Cancelled
    if (response === 0) {
      return;
    }

    // Pre-existing project
    if (response === 1) {
      const data = await fs.promises.readFile(path.join(directory, PROJECT_FILE_NAME), "utf8");
      return sendData(mainWindow, JSON.parse(data) as ProjectBody);
    }

    // Otherwise, create and open new project...
  }

  mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, {
    show: true,
    text: "Preparing project",
    progressValue: 0,
  } as LoadingData);

  const photos = files.filter((fileName) => {
    // Filter directories
    if (!fs.lstatSync(path.join(directory, fileName)).isFile()) {
      return false;
    }

    // Filter non-images based on file extension
    if (
      !PHOTO_FILE_EXTENSIONS.some(
        (extension) => extension.toLowerCase() === path.extname(fileName.toLowerCase()),
      )
    ) {
      return false;
    }

    return true;
  });

  const thumbnailDirectory = path.join(directory, PROJECT_THUMBNAIL_DIRECTORY);
  if (!fs.existsSync(thumbnailDirectory)) {
    await fs.promises.mkdir(thumbnailDirectory);
  }

  const thumbnails: string[] = [];

  for (const [index, photoName] of photos.entries()) {
    const photo: PhotoBody = {
      directory,
      name: photoName,
      thumbnail: "",
      edits: DEFAULT_PHOTO_EDITS,
      isEdited: false,
    };

    const result = await createPhotoThumbnail(photo);
    thumbnails.push(result);

    mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, {
      show: true,
      text: "Preparing project",
      progressValue: Math.ceil((index / photos.length) * 100),
      progressText: `Processing photo ${index + 1} of ${photos.length}`,
    } as LoadingData);
  }

  const now = new Date().toISOString();

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
    JSON.stringify(data, null, 2),
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
    filters: [{ name: "Projects", extensions: ["json"] }],
    defaultPath: desktopPath,
  });

  if (event.canceled) {
    return;
  }

  mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, { show: true, text: "Opening project" });

  const [file] = event.filePaths;

  const data = await fs.promises.readFile(file, "utf8");
  return sendData(mainWindow, JSON.parse(data) as ProjectBody);
};

/**
 * Handles opening a recent project file.
 */
const handleOpenProjectFile = async (mainWindow: Electron.BrowserWindow, file: string) => {
  mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, { show: true, text: "Opening project" });

  if (!fs.existsSync(file)) {
    dialog.showErrorBox(MISSING_RECENT_PROJECT_MESSAGE, file);
    mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, { show: false } as LoadingData);
    return;
  }

  const data = await fs.promises.readFile(file, "utf8");
  return sendData(mainWindow, JSON.parse(data) as ProjectBody);
};

/**
 * Handles saving a project file.
 */
const handleSaveProject = async (data: string) => {
  const { directory } = JSON.parse(data) as ProjectBody;
  await fs.promises.writeFile(path.join(directory, PROJECT_FILE_NAME), data, "utf8");
};

/**
 * Handles exporting matches.
 */
const handleExportMatches = async (mainWindow: Electron.BrowserWindow, data: string) => {
  const project = JSON.parse(data) as ProjectBody;

  mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, {
    show: true,
    text: "Exporting matches",
    progressValue: 0,
  } as LoadingData);

  const exportsDirectory = path.join(project.directory, PROJECT_EXPORT_DIRECTORY);
  if (fs.existsSync(exportsDirectory)) {
    // Empty exports folder
    for (const file of await fs.promises.readdir(exportsDirectory)) {
      await fs.promises.unlink(path.join(exportsDirectory, file));
    }
  } else {
    await fs.promises.mkdir(exportsDirectory);
  }

  let progress = 0;
  const totalPhotos = project.matched.reduce(
    (acc, match) => acc + match.left.photos.length + match.right.photos.length,
    0,
  );

  const handleSide = async (id: string, side: CollectionBody, label: "L" | "R") => {
    for (const photo of side.photos) {
      progress++;
      mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, {
        show: true,
        text: "Exporting matches",
        progressValue: Math.ceil((progress / totalPhotos) * 100),
        progressText: `Exporting match ${progress} of ${totalPhotos}`,
      } as LoadingData);

      let photoName = id;
      if (side.name && side.name !== "") {
        photoName = side.name.padStart(3, "0");
      }

      const originalExtension = path.extname(photo.name);
      const baseExportName = `${photoName}${label}_${path.basename(photo.name, originalExtension)}`;

      const sourcePath = path.join(project.directory, photo.name);
      const exportedName = `${baseExportName}${originalExtension}`;
      const exportedPath = path.join(exportsDirectory, exportedName);

      if (!photo.isEdited) {
        await fs.promises.copyFile(sourcePath, exportedPath);
        continue;
      }

      const renderedBuffer = await renderFullImageWithEdits({
        sourcePath,
        edits: photo.edits,
      });

      const useJPEG =
        originalExtension.toLowerCase() === ".jpg" || originalExtension.toLowerCase() === ".jpeg";
      const exportExtension = useJPEG ? originalExtension : ".png";

      const finalExportedName = `${baseExportName}${exportExtension}`;
      const finalExportedPath = path.join(exportsDirectory, finalExportedName);

      await fs.promises.writeFile(finalExportedPath, renderedBuffer);
    }
  };

  for (const match of project.matched) {
    const matchID = getAlphabetLetter(match.id);
    await Promise.all([
      handleSide(matchID, match.left, "L"),
      handleSide(matchID, match.right, "R"),
    ]);
  }

  mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, { show: false });
};

/**
 * Duplicates the original, edited, and thumbnail versions of a photo a returns the new filenames.
 */
const handleDuplicatePhotoFile = async (data: PhotoBody): Promise<PhotoBody> => {
  const originalPath = path.join(data.directory, data.name);
  const thumbnailPath = path.join(data.directory, data.thumbnail);

  const time = Date.now();

  const originalExtension = path.extname(data.name);
  const newOriginalPath = data.name.replace(
    originalExtension,
    `_duplicate_${time}${originalExtension}`,
  );

  await fs.promises.copyFile(originalPath, path.join(data.directory, newOriginalPath));

  const thumbnailExtension = path.extname(data.thumbnail);
  const newThumbnailPath = data.thumbnail.replace(
    thumbnailExtension,
    `_duplicate_${time}${thumbnailExtension}`,
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

  const inUnassigned = project.unassigned.photos.some((photo: PhotoBody) => photo.name === name);
  if (inUnassigned) {
    return project.unassigned;
  }

  const inDiscarded = project.discarded.photos.some((photo: PhotoBody) => photo.name === name);
  if (inDiscarded) {
    return project.discarded;
  }

  for (const match of project.matched) {
    const inLeft = match.left.photos.some((photo: PhotoBody) => photo.name === name);
    if (inLeft) {
      return match.left;
    }

    const inRight = match.right.photos.some((photo: PhotoBody) => photo.name === name);
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
  const projectData = JSON.parse(await fs.promises.readFile(projectPath, "utf8")) as ProjectBody;

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
  handleExportMatches,
  handleOpenDirectoryPrompt,
  handleOpenFilePrompt,
  handleOpenProjectFile,
  handleSaveProject,
};
