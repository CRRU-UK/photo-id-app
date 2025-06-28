import type { ProjectBody } from "@/types";

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { app, dialog } from "electron";

import {
  DEFAULT_WINDOW_TITLE,
  PHOTO_FILE_EXTENSIONS,
  EXISTING_DATA_MESSAGE,
  EXISTING_DATA_BUTTONS,
  PROJECT_FILE_NAME,
  PROJECT_EXPORT_DIRECTORY,
  INITIAL_MATCHED_STACKS,
} from "@/constants";
import { getAlphabetLetter } from "@/helpers";

import { createPhotoEditsCopy, createPhotoThumbnail } from "@/backend/photos";
import { addRecentProject } from "@/backend/recents";

const sendData = (mainWindow: Electron.BrowserWindow, data: ProjectBody) => {
  mainWindow.setTitle(`${DEFAULT_WINDOW_TITLE} - ${data.directory}`);
  mainWindow.webContents.send("load-project", data);

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
      mainWindow.webContents.send("set-loading", false);
      return;
    }

    // Pre-existing project
    if (response === 1) {
      const data = await fs.promises.readFile(path.join(directory, PROJECT_FILE_NAME), "utf8");
      return sendData(mainWindow, JSON.parse(data) as ProjectBody);
    }

    // Otherwise, create and open new project...
  }

  mainWindow.webContents.send("set-loading", true, "Preparing project");

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

  const [edited, thumbnails] = await Promise.all([
    Promise.all(photos.map((photo) => createPhotoEditsCopy(photo, directory))),
    Promise.all(photos.map((photo) => createPhotoThumbnail(photo, directory))),
  ]);

  const now = new Date().toISOString();

  const defaultMatches = [];
  for (let i = 0; i < INITIAL_MATCHED_STACKS; i += 1) {
    defaultMatches.push({
      id: i + 1,
      left: { photos: [], name: "" },
      right: { photos: [], name: "" },
    });
  }

  const data: ProjectBody = {
    version: "v1",
    id: crypto.randomUUID(),
    directory,
    totalPhotos: photos.length,
    photos: photos.map((name, index) => ({
      name,
      edited: edited[index],
      thumbnail: thumbnails[index],
    })),
    matched: defaultMatches,
    discarded: [],
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
    mainWindow.webContents.send("set-loading", false);
    return;
  }

  mainWindow.webContents.send("set-loading", true, "Opening project");

  const [file] = event.filePaths;

  const data = await fs.promises.readFile(file, "utf8");
  return sendData(mainWindow, JSON.parse(data) as ProjectBody);
};

/**
 * Handles opening a recent project file.
 */
const handleOpenProjectFile = async (mainWindow: Electron.BrowserWindow, file: string) => {
  mainWindow.webContents.send("set-loading", true, "Opening project");

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

  for (const match of project.matched) {
    const matchID = getAlphabetLetter(match.id);

    for (const photo of match.left.photos) {
      const exportedName = `${match.left.name.padStart(3, "0").toUpperCase() || matchID}L_${photo.name}`;
      const originalPath = path.join(project.directory, photo.edited);
      const exportedPath = path.join(exportsDirectory, exportedName);
      await fs.promises.copyFile(originalPath, exportedPath);
    }

    for (const photo of match.right.photos) {
      const exportedName = `${match.right.name.padStart(3, "0").toUpperCase() || matchID}R_${photo.name}`;
      const originalPath = path.join(project.directory, photo.edited);
      const exportedPath = path.join(exportsDirectory, exportedName);
      await fs.promises.copyFile(originalPath, exportedPath);
    }
  }
};

export {
  handleOpenDirectoryPrompt,
  handleOpenFilePrompt,
  handleOpenProjectFile,
  handleSaveProject,
  handleExportMatches,
};
