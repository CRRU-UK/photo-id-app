import type { EditWindowData, RevertPhotoData } from "@/types";

import path from "path";
import url from "url";
import { app, BrowserWindow, ipcMain, Menu } from "electron";
import started from "electron-squirrel-startup";
import { updateElectronApp } from "update-electron-app";

import { DEFAULT_WINDOW_TITLE } from "@/constants";
import { getMenu } from "@/backend/menu";
import {
  handleOpenDirectoryPrompt,
  handleOpenFilePrompt,
  handleOpenProjectFile,
  handleSaveProject,
  handleExportMatches,
} from "@/backend/projects";
import { savePhotoFromBuffer, revertPhotoToOriginal } from "@/backend/photos";
import { getRecentProjects, removeRecentProject } from "@/backend/recents";

updateElectronApp();

if (started) {
  app.quit();
}

const basePath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);

let mainWindow: BrowserWindow;

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      webSecurity: false,
    },
  });

  mainWindow.maximize();

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadURL(
      url.format({
        protocol: "file",
        slashes: true,
        pathname: basePath,
      }),
    );
  }

  mainWindow.webContents.on("did-create-window", (window) => {
    window.webContents.once("dom-ready", () => {
      if (!app.isPackaged) {
        window.webContents.openDevTools();
      }
    });
  });

  const menu = Menu.buildFromTemplate(getMenu(mainWindow));
  Menu.setApplicationMenu(menu);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
};

app.on("ready", createMainWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
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

  ipcMain.on("remove-recent-project", (event, path) => {
    removeRecentProject(path);

    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents) as BrowserWindow;
    window.webContents.send("load-recent-projects", getRecentProjects());
  });

  ipcMain.on("open-edit-window", (event, data: string) => {
    const editWindow = new BrowserWindow({
      show: false,
      width: 1400,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: true,
        webSecurity: false,
      },
      backgroundColor: "black",
      fullscreenable: false,
    });

    if (!app.isPackaged) {
      editWindow.webContents.openDevTools();
    }

    const decoded = JSON.parse(atob(data)) as EditWindowData;

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      editWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?data=${data}#/edit`);
    } else {
      editWindow.loadURL(
        url.format({
          protocol: "file",
          slashes: true,
          pathname: basePath,
          hash: "#/edit",
          search: `?data=${data}`,
        }),
      );
    }

    editWindow.removeMenu();

    editWindow.once("ready-to-show", () => {
      editWindow.setTitle(`${DEFAULT_WINDOW_TITLE} - ${decoded.directory}/${decoded.name}`);
      editWindow.show();
    });
  });

  ipcMain.on("save-project", (event, data: string) => {
    handleSaveProject(data);
  });

  ipcMain.on("export-matches", async (event, data: string) => {
    await handleExportMatches(data);
    mainWindow.webContents.send("set-loading", false);
  });

  ipcMain.on("save-photo-file", async (event, data: EditWindowData, photo: ArrayBuffer) => {
    await savePhotoFromBuffer(data, photo);
    mainWindow.webContents.send("refresh-stack-images", data.name);

    const webContents = event.sender;
    const editWindow = BrowserWindow.fromWebContents(webContents) as BrowserWindow;
    editWindow.webContents.send("set-loading", false);
  });

  ipcMain.on("revert-photo-file", async (event, data: RevertPhotoData) => {
    mainWindow.webContents.send("set-loading", true, "Reverting photo");

    await revertPhotoToOriginal(data);

    mainWindow.webContents.send("refresh-stack-images", data.name);
    mainWindow.webContents.send("set-loading", false);
  });
});
