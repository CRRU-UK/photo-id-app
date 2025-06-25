import type { EditWindowData } from "@/types";

import path from "path";
import { app, BrowserWindow, ipcMain, Menu } from "electron";
import started from "electron-squirrel-startup";
import { updateElectronApp } from "update-electron-app";

import { DEFAULT_WINDOW_TITLE } from "@/constants";
import {
  handleOpenDirectoryPrompt,
  handleOpenFilePrompt,
  handleOpenProjectFile,
  handleSaveProject,
} from "@/backend/projects";
import { handleSavePhoto } from "@/backend/photos";
import { getRecentProjects } from "@/backend/recents";

updateElectronApp();

if (started) {
  app.quit();
}

const basePath = path.join("file://", __dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);

let mainWindow: BrowserWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      webSecurity: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadURL(basePath);
  }

  mainWindow.webContents.on("did-create-window", (window) => {
    window.webContents.once("dom-ready", () => {
      if (!app.isPackaged) {
        window.webContents.openDevTools();
      }
    });
  });

  const menu = Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        {
          label: "Open Project Folder",
          accelerator: "CmdOrCtrl+O",
          async click() {
            handleOpenDirectoryPrompt(mainWindow);
          },
        },
        {
          label: "Open Project File",
          accelerator: "CmdOrCtrl+Shift+O",
          async click() {
            handleOpenFilePrompt(mainWindow);
          },
        },
      ],
    },
  ]);

  Menu.setApplicationMenu(menu);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  ipcMain.on("open-folder-prompt", (event) => {
    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents) as BrowserWindow;
    handleOpenDirectoryPrompt(window);
  });

  ipcMain.on("open-file-prompt", (event) => {
    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents) as BrowserWindow;
    handleOpenFilePrompt(window);
  });

  ipcMain.on("open-project-file", (event, file) => {
    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents) as BrowserWindow;
    handleOpenProjectFile(window, file);
  });

  ipcMain.on("get-recent-projects", (event) => {
    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents) as BrowserWindow;
    window.webContents.send("load-recent-projects", getRecentProjects());
  });

  ipcMain.on("open-edit-window", (event, data: string) => {
    const child = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: true,
        webSecurity: false,
      },
      backgroundColor: "black",
      fullscreenable: false,
    });

    if (!app.isPackaged) {
      child.webContents.openDevTools();
    }

    const decoded = JSON.parse(atob(data)) as EditWindowData;

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      child.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}#/edit?data=${data}`);
    } else {
      child.loadURL(`${basePath}#/edit?data=${data}`);
    }

    child.once("ready-to-show", () => {
      child.setTitle(`${DEFAULT_WINDOW_TITLE} - ${decoded.path}`);
      child.show();
    });
  });

  ipcMain.on("save-project", (event, data) => {
    handleSaveProject(data);
  });

  ipcMain.on("save-photo-file", (event, data: EditWindowData, photo: ArrayBuffer) => {
    handleSavePhoto(data, photo);
  });
});
