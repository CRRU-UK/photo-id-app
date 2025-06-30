import type {
  EditWindowData,
  RevertPhotoData,
  DuplicatePhotoData,
  ProjectBody,
  RecentProject,
} from "@/types";

import path from "path";
import url from "url";
import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import started from "electron-squirrel-startup";
import { updateElectronApp } from "update-electron-app";

import { IPC_EVENTS, DEFAULT_WINDOW_TITLE, PROJECT_EXPORT_DIRECTORY } from "@/constants";
import { getMenu } from "@/backend/menu";
import {
  handleOpenDirectoryPrompt,
  handleOpenFilePrompt,
  handleOpenProjectFile,
  handleSaveProject,
  handleExportMatches,
  handleDuplicatePhotoFile,
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
  ipcMain.on(IPC_EVENTS.OPEN_FOLDER, (event) => {
    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents) as BrowserWindow;
    handleOpenDirectoryPrompt(window);
  });

  ipcMain.on(IPC_EVENTS.OPEN_FILE, (event) => {
    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents) as BrowserWindow;
    handleOpenFilePrompt(window);
  });

  ipcMain.on(IPC_EVENTS.OPEN_PROJECT_FILE, async (event, file) => {
    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents) as BrowserWindow;
    handleOpenProjectFile(window, file);
  });

  ipcMain.handle(IPC_EVENTS.GET_RECENT_PROJECTS, async (): Promise<RecentProject[]> => {
    const result = await getRecentProjects();
    return result;
  });

  ipcMain.handle(
    IPC_EVENTS.REMOVE_RECENT_PROJECT,
    async (event, path): Promise<RecentProject[]> => {
      const result = await removeRecentProject(path);
      return result;
    },
  );

  ipcMain.on(IPC_EVENTS.OPEN_EDIT_WINDOW, (event, data: string) => {
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

  ipcMain.on(IPC_EVENTS.SAVE_PROJECT, (event, data: string) => {
    handleSaveProject(data);
  });

  ipcMain.handle(IPC_EVENTS.EXPORT_MATCHES, async (event, data: string) => {
    const projectData: ProjectBody = JSON.parse(data);

    await handleExportMatches(data);

    shell.openPath(path.join(projectData.directory, PROJECT_EXPORT_DIRECTORY));
  });

  ipcMain.on(
    IPC_EVENTS.SAVE_PHOTO_FILE,
    async (event, data: EditWindowData, photo: ArrayBuffer) => {
      await savePhotoFromBuffer(data, photo);
      mainWindow.webContents.send(IPC_EVENTS.REFRESH_STACK_IMAGES, data.name);

      const webContents = event.sender;
      const editWindow = BrowserWindow.fromWebContents(webContents) as BrowserWindow;
      editWindow.webContents.send(IPC_EVENTS.SET_LOADING, false);
    },
  );

  ipcMain.on(IPC_EVENTS.REVERT_PHOTO_FILE, async (event, data: RevertPhotoData) => {
    await revertPhotoToOriginal(data);

    mainWindow.webContents.send(IPC_EVENTS.REFRESH_STACK_IMAGES, data.name);
  });

  ipcMain.handle(IPC_EVENTS.DUPLICATE_PHOTO_FILE, async (event, data: DuplicatePhotoData) => {
    const result = await handleDuplicatePhotoFile(data);
    return result;
  });
});
