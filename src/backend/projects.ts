import type { ProjectBody } from "@/types";

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { dialog } from "electron";

import {
  DEFAULT_WINDOW_TITLE,
  PHOTO_FILE_EXTENSIONS,
  EXISTING_DATA_MESSAGE,
  EXISTING_DATA_BUTTONS,
  PROJECT_FILE_NAME,
  INITIAL_MATCHED_STACKS,
} from "@/constants";

import { createPhotoThumbnail } from "@/backend/photos";
import { updateRecentProjects } from "@/backend/recents";

const sendData = (mainWindow: Electron.BrowserWindow, data: ProjectBody) => {
  mainWindow.setTitle(`${DEFAULT_WINDOW_TITLE} - ${data.directory}`);
  mainWindow.webContents.send("load-project", data);

  updateRecentProjects({
    name: path.basename(data.directory),
    path: path.join(data.directory, PROJECT_FILE_NAME),
  });
};

/**
 * Handles opening, filtering, and processing a project folder.
 */
const handleOpenDirectoryPrompt = async (mainWindow: Electron.BrowserWindow) => {
  const event = await dialog.showOpenDialog({
    title: "Open Project Folder",
    properties: ["openDirectory"],
  });

  if (event.canceled) {
    return;
  }

  const [directory] = event.filePaths;

  const files = fs.readdirSync(directory);

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
      const data = fs.readFileSync(path.join(directory, PROJECT_FILE_NAME), "utf8");
      return sendData(mainWindow, JSON.parse(data) as ProjectBody);
    }

    // Otherwise, create and open new project...
  }

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

  const thumbnails = await Promise.all(
    photos.map((photo) => createPhotoThumbnail(photo, directory)),
  );

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
    photos: photos.map((photo, index) => ({
      photo,
      thumbnail: thumbnails[index],
    })),
    matched: defaultMatches,
    discarded: [],
    created: now,
    lastModified: now,
  };

  fs.writeFileSync(path.join(directory, PROJECT_FILE_NAME), JSON.stringify(data, null, 2), "utf8");

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
  });

  if (event.canceled) {
    return;
  }

  const [file] = event.filePaths;

  const data = fs.readFileSync(file, "utf8");
  return sendData(mainWindow, JSON.parse(data) as ProjectBody);
};

/**
 * Handles opening a recent project file.
 */
const handleOpenProjectFile = async (mainWindow: Electron.BrowserWindow, file: string) => {
  const data = fs.readFileSync(file, "utf8");
  return sendData(mainWindow, JSON.parse(data) as ProjectBody);
};

/**
 * Handles saving a project file.
 */
const handleSaveProject = async (data: string) => {
  const { directory } = JSON.parse(data) as ProjectBody;
  fs.writeFileSync(path.join(directory, PROJECT_FILE_NAME), data, "utf8");
};

export {
  handleOpenDirectoryPrompt,
  handleOpenFilePrompt,
  handleOpenProjectFile,
  handleSaveProject,
};
