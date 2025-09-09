import "dotenv/config";

import * as Sentry from "@sentry/electron/main";
import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import started from "electron-squirrel-startup";
import path from "path";
import { updateElectronApp } from "update-electron-app";
import url from "url";

import { getMenu } from "@/backend/menu";
import { revertPhotoToOriginal, savePhotoFromBuffer } from "@/backend/photos";
import {
  handleDuplicatePhotoFile,
  handleExportMatches,
  handleOpenDirectoryPrompt,
  handleOpenFilePrompt,
  handleOpenProjectFile,
  handleSaveProject,
} from "@/backend/projects";
import { getRecentProjects, removeRecentProject } from "@/backend/recents";
import {
  DEFAULT_WINDOW_TITLE,
  IPC_EVENTS,
  PROJECT_EXPORT_DIRECTORY,
  USER_GUIDE_URL,
} from "@/constants";
import type { PhotoBody, ProjectBody, RecentProject } from "@/types";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] })],
  _experiments: { enableLogs: true },
});

updateElectronApp();

if (started) {
  app.quit();
}

const basePath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);

let mainWindow: BrowserWindow;

const createMainWindow = async () => {
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
    await mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadURL(
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

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});

app.whenReady().then(() => {
  ipcMain.on(IPC_EVENTS.OPEN_FOLDER, async (event) => {
    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents) as BrowserWindow;
    await handleOpenDirectoryPrompt(window);
  });

  ipcMain.on(IPC_EVENTS.OPEN_FILE, async (event) => {
    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents) as BrowserWindow;
    await handleOpenFilePrompt(window);
  });

  ipcMain.on(IPC_EVENTS.OPEN_PROJECT_FILE, async (event, file: string) => {
    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents) as BrowserWindow;
    await handleOpenProjectFile(window, file);
  });

  ipcMain.handle(IPC_EVENTS.GET_RECENT_PROJECTS, async (): Promise<RecentProject[]> => {
    const result = await getRecentProjects();
    return result;
  });

  ipcMain.handle(
    IPC_EVENTS.REMOVE_RECENT_PROJECT,
    async (event, path: string): Promise<RecentProject[]> => {
      const result = await removeRecentProject(path);
      return result;
    },
  );

  ipcMain.on(IPC_EVENTS.OPEN_EDIT_WINDOW, (event, data: PhotoBody): void => {
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

    const encodedData = btoa(JSON.stringify(data));
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      editWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?data=${encodedData}#/edit`);
    } else {
      editWindow.loadURL(
        url.format({
          protocol: "file",
          slashes: true,
          pathname: basePath,
          hash: "#/edit",
          search: `?data=${encodedData}`,
        }),
      );
    }

    editWindow.removeMenu();

    editWindow.once("ready-to-show", () => {
      editWindow.setTitle(`${DEFAULT_WINDOW_TITLE} - ${data.directory}/${data.name}`);
      editWindow.show();
    });
  });

  ipcMain.on(IPC_EVENTS.SAVE_PROJECT, async (event, data: string): Promise<void> => {
    await handleSaveProject(data);
  });

  ipcMain.handle(IPC_EVENTS.EXPORT_MATCHES, async (event, data: string): Promise<void> => {
    const projectData = JSON.parse(data) as ProjectBody;

    await handleExportMatches(data);

    shell.openPath(path.join(projectData.directory, PROJECT_EXPORT_DIRECTORY));
  });

  ipcMain.handle(
    IPC_EVENTS.SAVE_PHOTO_FILE,
    async (event, data: PhotoBody, photo: ArrayBuffer): Promise<void> => {
      const editedPath = await savePhotoFromBuffer(data, photo);

      const photoData: PhotoBody = {
        ...data,
        edited: editedPath,
      };

      mainWindow.webContents.send(IPC_EVENTS.UPDATE_PHOTO, photoData);
    },
  );

  ipcMain.handle(
    IPC_EVENTS.REVERT_PHOTO_FILE,
    async (event, data: PhotoBody): Promise<PhotoBody> => {
      const result = await revertPhotoToOriginal(data);
      return result;
    },
  );

  ipcMain.handle(IPC_EVENTS.DUPLICATE_PHOTO_FILE, async (event, data: PhotoBody) => {
    const result = await handleDuplicatePhotoFile(data);
    return result;
  });

  ipcMain.on(IPC_EVENTS.OPEN_USER_GUIDE, () => {
    shell.openExternal(USER_GUIDE_URL);
    return { action: "deny" };
  });
});
