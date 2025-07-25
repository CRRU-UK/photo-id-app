import crypto from "crypto";
import { app, dialog } from "electron";
import fs from "fs";
import path from "path";

import type { CollectionBody, LoadingData, PhotoBody, ProjectBody } from "@/types";

import { createPhotoThumbnail } from "@/backend/photos";
import { addRecentProject } from "@/backend/recents";
import {
  DEFAULT_WINDOW_TITLE,
  EXISTING_DATA_BUTTONS,
  EXISTING_DATA_MESSAGE,
  INITIAL_MATCHED_STACKS,
  IPC_EVENTS,
  PHOTO_FILE_EXTENSIONS,
  PROJECT_EDITS_DIRECTORY,
  PROJECT_EXPORT_DIRECTORY,
  PROJECT_FILE_NAME,
  PROJECT_THUMBNAIL_DIRECTORY,
} from "@/constants";
import { getAlphabetLetter } from "@/helpers";

const sendData = (mainWindow: Electron.BrowserWindow, data: ProjectBody) => {
  mainWindow.setTitle(`${DEFAULT_WINDOW_TITLE} - ${data.directory}`);
  mainWindow.webContents.send(IPC_EVENTS.LOAD_PROJECT, data);

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

  const editsDirectory = path.join(directory, PROJECT_EDITS_DIRECTORY);
  if (!fs.existsSync(editsDirectory)) {
    await fs.promises.mkdir(editsDirectory);
  }

  const thumbnailDirectory = path.join(directory, PROJECT_THUMBNAIL_DIRECTORY);
  if (!fs.existsSync(thumbnailDirectory)) {
    await fs.promises.mkdir(thumbnailDirectory);
  }

  const thumbnails: string[] = [];
  for (const [index, photo] of photos.entries()) {
    const result = await createPhotoThumbnail(photo, directory);
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
        edited: null,
        thumbnail: thumbnails[index],
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
const handleExportMatches = async (data: string) => {
  const project = JSON.parse(data) as ProjectBody;

  const exportsDirectory = path.join(project.directory, PROJECT_EXPORT_DIRECTORY);
  if (!fs.existsSync(exportsDirectory)) {
    await fs.promises.mkdir(exportsDirectory);
  } else {
    // Empty exports folder
    for (const file of await fs.promises.readdir(exportsDirectory)) {
      await fs.promises.unlink(path.join(exportsDirectory, file));
    }
  }

  const handleSide = async (id: string, side: CollectionBody, label: "L" | "R") => {
    for (const photo of side.photos) {
      let photoName = id;
      if (side.name && side.name !== "") {
        photoName = side.name.padStart(3, "0");
      }

      const exportedName = `${photoName}${label}_${photo.name}`;

      let targetPath = path.join(project.directory, photo.name);
      if (photo.edited) {
        targetPath = path.join(project.directory, photo.edited);
      }

      const exportedPath = path.join(exportsDirectory, exportedName);

      await fs.promises.copyFile(targetPath, exportedPath);
    }
  };

  for (const match of project.matched) {
    const matchID = getAlphabetLetter(match.id);
    await Promise.all([
      handleSide(matchID, match.left, "L"),
      handleSide(matchID, match.right, "R"),
    ]);
  }
};

/**
 * Duplicates the original, edited, and thumbnail versions of a photo a returns the new filenames.
 */
const handleDuplicatePhotoFile = async (data: PhotoBody): Promise<PhotoBody> => {
  const originalPath = path.join(data.directory, data.name);
  const thumbnailPath = path.join(data.directory, data.thumbnail);

  const time = new Date().getTime();

  const originalExtension = path.extname(data.name);
  const newOriginalPath = data.name.replace(
    originalExtension,
    `_duplicate_${time}${originalExtension}`,
  );

  await fs.promises.copyFile(originalPath, path.join(data.directory, newOriginalPath));

  let newEditedPath = null;
  if (data.edited) {
    const editedPath = path.join(data.directory, data.edited);
    const editedExtension = path.extname(data.edited);
    newEditedPath = data.edited.replace(editedExtension, `_duplicate_${time}${editedExtension}`);

    // If edited photo is present, use it as the original photo instead
    await fs.promises.copyFile(editedPath, path.join(data.directory, newEditedPath));
  }

  const thumbnailExtension = path.extname(data.thumbnail);
  const newThumbnailPath = data.thumbnail.replace(
    thumbnailExtension,
    `_duplicate_${time}${thumbnailExtension}`,
  );

  await fs.promises.copyFile(thumbnailPath, path.join(data.directory, newThumbnailPath));

  return {
    directory: data.directory,
    name: newOriginalPath,
    edited: newEditedPath,
    thumbnail: newThumbnailPath,
  };
};

export {
  handleDuplicatePhotoFile,
  handleExportMatches,
  handleOpenDirectoryPrompt,
  handleOpenFilePrompt,
  handleOpenProjectFile,
  handleSaveProject,
};
