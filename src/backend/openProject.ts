import type { PROJECT_JSON } from "../helpers/types";

import fs from "fs";
import path from "path";
import { dialog } from "electron";

import {
  DEFAULT_WINDOW_TITLE,
  PHOTO_FILE_EXTENSIONS,
  EXISTING_DATA_MESSAGE,
  EXISTING_DATA_BUTTONS,
} from "../helpers/constants";

const sendData = (mainWindow: Electron.BrowserWindow, data: PROJECT_JSON) => {
  mainWindow.setTitle(`${DEFAULT_WINDOW_TITLE} - ${data.directory}`);
  mainWindow.webContents.send("load-project", data);
};

/**
 * Handles opening, filtering, and processing a project folder.
 */
const handleOpenProjectDirectory = async (mainWindow: Electron.BrowserWindow) => {
  const event = await dialog.showOpenDialog({
    title: "Open Project Folder",
    properties: ["openDirectory"],
  });

  if (event.canceled) {
    return;
  }

  const [directory] = event.filePaths;

  const files = fs.readdirSync(directory);

  if (files.includes("data.json")) {
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
      const data = fs.readFileSync(path.join(directory, "data.json"), "utf8");
      return sendData(mainWindow, JSON.parse(data) as PROJECT_JSON);
    }

    // Otherwise, create and open new project...
  }

  const photos = files.filter((fileName) => {
    // Filter directories
    if (!fs.lstatSync(path.join(directory, fileName)).isFile()) {
      return false;
    }

    // Filter non-images based on file extension
    if (!PHOTO_FILE_EXTENSIONS.some((extension) => extension === path.extname(fileName))) {
      return false;
    }

    return true;
  });

  const data: PROJECT_JSON = {
    version: "1",
    directory,
    photos,
    matched: [],
    discarded: [],
  };

  fs.writeFileSync(path.join(directory, "data.json"), JSON.stringify(data), "utf8");

  return sendData(mainWindow, data);
};

/**
 * Handles opening a project file.
 */
const handleOpenProjectFile = async (mainWindow: Electron.BrowserWindow) => {
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
  return sendData(mainWindow, JSON.parse(data) as PROJECT_JSON);
};

export { handleOpenProjectDirectory, handleOpenProjectFile };
