import "dotenv/config";

import * as Sentry from "@sentry/electron/main";
import { app, BrowserWindow, ipcMain, Menu, net, protocol, shell } from "electron";
import {
  installExtension,
  MOBX_DEVTOOLS,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
import started from "electron-squirrel-startup";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import { updateElectronApp } from "update-electron-app";

import type {
  EditorNavigation,
  ExternalLinks,
  PhotoBody,
  ProjectBody,
  RecentProject,
  SettingsData,
} from "@/types";

import { getMenu } from "@/backend/menu";
import { createPhotoThumbnail, revertPhotoToOriginal } from "@/backend/photos";
import {
  getCurrentProjectDirectory,
  handleDuplicatePhotoFile,
  handleEditorNavigate,
  handleExportMatches,
  handleOpenDirectoryPrompt,
  handleOpenFilePrompt,
  handleOpenProjectFile,
  handleSaveProject,
  setCurrentProject,
} from "@/backend/projects";
import { getRecentProjects, removeRecentProject } from "@/backend/recents";
import { getSettings, updateSettings } from "@/backend/settings";
import { windowManager } from "@/backend/WindowManager";
import {
  DEFAULT_WINDOW_TITLE,
  EXTERNAL_LINKS,
  IPC_EVENTS,
  PHOTO_FILE_EXTENSIONS,
  PHOTO_PROTOCOL_SCHEME,
  PROJECT_EXPORT_DIRECTORY,
  PROJECT_FILE_NAME,
  ROUTES,
} from "@/constants";
import { encodeEditPayload } from "@/helpers";

import { version } from "../package.json";

updateElectronApp();

protocol.registerSchemesAsPrivileged([
  {
    scheme: PHOTO_PROTOCOL_SCHEME,
    privileges: {
      secure: true,
      supportFetchAPI: true,
    },
  },
]);

const production = app.isPackaged;

if (started) {
  app.quit();
}

const defaultWebPreferences = {
  preload: path.join(__dirname, "preload.js"),
  nodeIntegration: false,
  contextIsolation: true,
  webSecurity: true,
  sandbox: true,
  allowRunningInsecureContent: false,
};

const basePath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);

const createMainWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: defaultWebPreferences,
  });

  mainWindow.maximize();

  mainWindow.on("closed", () => app.quit());
  windowManager.setMainWindow(mainWindow);

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

app.whenReady().then(async () => {
  protocol.handle(PHOTO_PROTOCOL_SCHEME, (request) => {
    try {
      const fileUrl = request.url.replace(/^photo:/, "file:");
      const filePath = url.fileURLToPath(fileUrl);

      const extension = path.extname(filePath).toLowerCase();
      if (!PHOTO_FILE_EXTENSIONS.includes(extension)) {
        return new Response(null, { status: 403 });
      }

      return net.fetch(url.pathToFileURL(filePath).toString());
    } catch {
      return new Response(null, { status: 400 });
    }
  });

  const settings = await getSettings();
  if (settings.telemetry === "enabled" && process.env.SENTRY_DSN) {
    console.debug("Sentry is enabled in main");

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] })],
      enableRendererProfiling: true,
      _experiments: { enableLogs: true },
    });
  } else {
    console.debug("Sentry is disabled in main");
  }

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
    async (_event, path: string): Promise<RecentProject[]> => {
      const result = await removeRecentProject(path);
      return result;
    },
  );

  ipcMain.handle(IPC_EVENTS.GET_CURRENT_PROJECT, async (): Promise<ProjectBody | null> => {
    const directory = getCurrentProjectDirectory();

    if (directory === null) {
      return null;
    }

    const filePath = path.join(directory, PROJECT_FILE_NAME);

    try {
      const content = await fs.promises.readFile(filePath, "utf8");
      return JSON.parse(content) as ProjectBody;
    } catch {
      return null;
    }
  });

  ipcMain.on(IPC_EVENTS.CLOSE_PROJECT, () => {
    setCurrentProject(null);
    windowManager.closeAllEditWindows();

    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.setTitle(DEFAULT_WINDOW_TITLE);
    }
  });

  ipcMain.on(IPC_EVENTS.OPEN_EDIT_WINDOW, (event, data: PhotoBody): void => {
    const editWindow = new BrowserWindow({
      show: false,
      width: 1200,
      height: 800,
      webPreferences: defaultWebPreferences,
      backgroundColor: "black",
      fullscreenable: false,
    });

    windowManager.addEditWindow(editWindow);

    if (!production) {
      editWindow.webContents.openDevTools();
    }

    const encodedData = encodeEditPayload(data);
    const encodedQuery = encodeURIComponent(encodedData);

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      editWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?data=${encodedQuery}#${ROUTES.EDIT}`);
    } else {
      editWindow.loadURL(
        url.format({
          protocol: "file",
          slashes: true,
          pathname: basePath,
          hash: `#${ROUTES.EDIT}`,
          search: `?data=${encodedQuery}`,
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
    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents) as BrowserWindow;

    await handleExportMatches(window, data);

    const projectData = JSON.parse(data) as ProjectBody;

    shell.openPath(path.join(projectData.directory, PROJECT_EXPORT_DIRECTORY));
  });

  ipcMain.handle(IPC_EVENTS.SAVE_PHOTO_FILE, async (event, data: PhotoBody): Promise<void> => {
    const thumbnail = await createPhotoThumbnail(data);

    const photoData: PhotoBody = {
      ...data,
      thumbnail,
    };

    const mainWindow = windowManager.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send(IPC_EVENTS.UPDATE_PHOTO, photoData);
    }
  });

  ipcMain.handle(
    IPC_EVENTS.NAVIGATE_EDITOR_PHOTO,
    async (event, data: PhotoBody, direction: EditorNavigation): Promise<string | null> => {
      const result = await handleEditorNavigate(data, direction);

      if (!result) {
        console.warn("Photo not found in project for navigation");
        return null;
      }

      return encodeEditPayload(result);
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

  ipcMain.handle(IPC_EVENTS.GET_SETTINGS, async (): Promise<SettingsData> => {
    const result = await getSettings();
    return result;
  });

  ipcMain.handle(
    IPC_EVENTS.UPDATE_SETTINGS,
    async (_event, settings: SettingsData): Promise<void> => {
      await updateSettings(settings);

      // Notify all windows of settings change
      const allWindows = BrowserWindow.getAllWindows();
      for (const window of allWindows) {
        window.webContents.send(IPC_EVENTS.SETTINGS_UPDATED, settings);
      }
    },
  );

  ipcMain.on(IPC_EVENTS.OPEN_SETTINGS, () => {
    const mainWindow = windowManager.getMainWindow();

    if (mainWindow) {
      mainWindow.focus();
      mainWindow.webContents.send(IPC_EVENTS.OPEN_SETTINGS);
    }
  });

  ipcMain.on(IPC_EVENTS.OPEN_EXTERNAL_LINK, (_event, link: ExternalLinks) => {
    if (link === "website") {
      shell.openExternal(EXTERNAL_LINKS.WEBSITE);
    }

    if (link === "user-guide") {
      shell.openExternal(EXTERNAL_LINKS.USER_GUIDE);
    }

    if (link === "changelog") {
      shell.openExternal(EXTERNAL_LINKS.CHANGELOG.replace("$VERSION", `v${version}`));
    }
  });

  await createMainWindow();
});
