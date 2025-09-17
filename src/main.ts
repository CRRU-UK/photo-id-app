import "dotenv/config";

import * as Sentry from "@sentry/electron/main";
import { app, BrowserWindow, ipcMain, Menu, shell } from "electron";
import {
  installExtension,
  MOBX_DEVTOOLS,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
import started from "electron-squirrel-startup";
import path from "path";
import { updateElectronApp } from "update-electron-app";
import url from "url";

import type { EditorNavigation, PhotoBody, ProjectBody, RecentProject } from "@/types";

import { getMenu } from "@/backend/menu";
import { revertPhotoToOriginal, savePhotoFromBuffer } from "@/backend/photos";
import {
  handleDuplicatePhotoFile,
  handleEditorNavigate,
  handleExportMatches,
  handleOpenDirectoryPrompt,
  handleOpenFilePrompt,
  handleOpenProjectFile,
  handleSaveProject,
} from "@/backend/projects";
import { getRecentProjects, removeRecentProject } from "@/backend/recents";
import { IPC_EVENTS, PROJECT_EXPORT_DIRECTORY, USER_GUIDE_URL } from "@/constants";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] })],
  enableRendererProfiling: true,
  _experiments: { enableLogs: true },
});

updateElectronApp();

const production = app.isPackaged;

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
      if (!production) {
        window.webContents.openDevTools();
      }
    });
  });

  const menu = Menu.buildFromTemplate(getMenu(mainWindow));
  Menu.setApplicationMenu(menu);

  if (!production) {
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
  if (!production) {
    installExtension([REACT_DEVELOPER_TOOLS, MOBX_DEVTOOLS]);
  }

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

    if (!production) {
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

    editWindow.once("ready-to-show", () => editWindow.show());
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
    IPC_EVENTS.NAVIGATE_EDITOR_PHOTO,
    async (event, data: PhotoBody, direction: EditorNavigation): Promise<string | null> => {
      // TODO: Should we get the source photo body from sender query params instead?
      const result = await handleEditorNavigate(data, direction);

      if (!result) {
        console.warn("Photo not found in project for navigation");
        return null;
      }

      const encodedData = btoa(JSON.stringify(result));
      return encodedData;
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
