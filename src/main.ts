import "dotenv/config";

import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, shell } from "electron";
import {
  installExtension,
  MOBX_DEVTOOLS,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
import started from "electron-squirrel-startup";
import path from "node:path";
import url from "node:url";
import { updateElectronApp } from "update-electron-app";

import type {
  EditorNavigation,
  ExternalLinks,
  MLMatchResponse,
  PhotoBody,
  ProjectBody,
  RecentProject,
  SettingsData,
} from "@/types";

import { getMenu } from "@/backend/menu";
import { analyseStack, cancelAnalyseStack } from "@/backend/model";
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
  parseProjectFile,
  setCurrentProject,
} from "@/backend/projects";
import { getRecentProjects, removeRecentProject } from "@/backend/recents";
import { getSettings, initSentry, setSentryEnabled, updateSettings } from "@/backend/settings";
import { windowManager } from "@/backend/WindowManager";
import {
  DEFAULT_WINDOW_TITLE,
  EXTERNAL_LINKS,
  IPC_EVENTS,
  PHOTO_FILE_EXTENSIONS,
  PHOTO_PROTOCOL_SCHEME,
  PROJECT_EXPORT_DIRECTORY,
  PROJECT_FILE_EXTENSION,
  PROJECT_FILE_NAME,
  ROUTES,
} from "@/constants";
import { encodeEditPayload } from "@/helpers";
import { photoBodySchema, settingsDataSchema } from "@/schemas";

import { version } from "../package.json";

initSentry();

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

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// Stores a .photoid file path received before the main window is ready (macOS open-file or argv)
let pendingFilePath: string | null = null;

const findPhotoidArg = (argv: string[]): string | undefined =>
  argv.find((arg) => arg.endsWith(`.${PROJECT_FILE_EXTENSION}`));

const getWindowFromSender = (webContents: Electron.WebContents): BrowserWindow | null =>
  BrowserWindow.fromWebContents(webContents);

/**
 * Closes the current project by resetting state, closing any and all edit windows, and resetting
 * the window title.
 */
const closeCurrentProject = (): void => {
  setCurrentProject(null);

  windowManager.closeAllEditWindows();

  const mainWindow = windowManager.getMainWindow();
  if (mainWindow) {
    mainWindow.setTitle(DEFAULT_WINDOW_TITLE);
  }
};

/**
 * Opens a project file from a file path. Closes the current project and any edit windows first if a
 * project is already open.
 */
const openProjectFromPath = async (filePath: string): Promise<void> => {
  const mainWindow = windowManager.getMainWindow();
  if (!mainWindow) {
    return;
  }

  if (getCurrentProjectDirectory() !== null) {
    closeCurrentProject();
  }

  await handleOpenProjectFile(mainWindow, filePath);

  mainWindow.focus();
};

/**
 * macOS: fires when a `.photoid` file is opened (may fire before `whenReady`).
 */
app.on("open-file", async (event, filePath) => {
  event.preventDefault();

  const mainWindow = windowManager.getMainWindow();
  if (mainWindow) {
    try {
      await openProjectFromPath(filePath);
    } catch (error) {
      console.error("Failed to open project from file:", error);
      dialog.showErrorBox("Failed to open project", String(error));
    }

    return;
  }

  pendingFilePath = filePath;
});

/**
 * Windows/Linux: fires when a second instance is launched with a file argument.
 */
app.on("second-instance", async (_event, argv) => {
  const filePath = findPhotoidArg(argv);

  if (filePath) {
    try {
      await openProjectFromPath(filePath);
    } catch (error) {
      console.error("Failed to open project from second instance:", error);
      dialog.showErrorBox("Failed to open project", String(error));
    }
  }
});

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

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

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

void app.whenReady().then(async () => {
  const settings = await getSettings();
  setSentryEnabled(settings.telemetry);

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

  if (!production) {
    await installExtension([REACT_DEVELOPER_TOOLS, MOBX_DEVTOOLS]);
  }

  ipcMain.on(IPC_EVENTS.OPEN_FOLDER, async (event) => {
    const window = getWindowFromSender(event.sender);
    if (!window) {
      return;
    }

    try {
      await handleOpenDirectoryPrompt(window);
    } catch (error) {
      console.error("Failed to open folder:", error);
      dialog.showErrorBox("Failed to open folder", String(error));
    }
  });

  ipcMain.on(IPC_EVENTS.OPEN_FILE, async (event) => {
    const window = getWindowFromSender(event.sender);
    if (!window) {
      return;
    }

    try {
      await handleOpenFilePrompt(window);
    } catch (error) {
      console.error("Failed to open file:", error);
      dialog.showErrorBox("Failed to open file", String(error));
    }
  });

  ipcMain.handle(IPC_EVENTS.OPEN_PROJECT_FILE, async (_event, file: string): Promise<void> => {
    const mainWindow = windowManager.getMainWindow();
    if (!mainWindow) {
      throw new Error("Main window not available");
    }

    try {
      await handleOpenProjectFile(mainWindow, file);
    } catch (error) {
      console.error("Failed to open project file:", error);
      throw error;
    }
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

    try {
      return await parseProjectFile(path.join(directory, PROJECT_FILE_NAME));
    } catch (error) {
      console.error("Failed to restore current project:", error);
      return null;
    }
  });

  ipcMain.on(IPC_EVENTS.CLOSE_PROJECT, () => {
    closeCurrentProject();
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

    editWindow.removeMenu();

    windowManager.addEditWindow(editWindow);

    if (!production) {
      editWindow.webContents.openDevTools();
    }

    const encodedData = encodeEditPayload(data);
    const encodedQuery = encodeURIComponent(encodedData);

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      void editWindow.loadURL(
        `${MAIN_WINDOW_VITE_DEV_SERVER_URL}?data=${encodedQuery}#${ROUTES.EDIT}`,
      );
    } else {
      void editWindow.loadURL(
        url.format({
          protocol: "file",
          slashes: true,
          pathname: basePath,
          hash: `#${ROUTES.EDIT}`,
          search: `?data=${encodedQuery}`,
        }),
      );
    }

    editWindow.once("ready-to-show", () => editWindow.show());
  });

  ipcMain.handle(IPC_EVENTS.SAVE_PROJECT, async (_event, data: string): Promise<void> => {
    try {
      await handleSaveProject(data);
    } catch (error) {
      console.error("Failed to save project:", error);
      throw error;
    }
  });

  ipcMain.handle(IPC_EVENTS.EXPORT_MATCHES, async (event, data: string): Promise<void> => {
    const window = getWindowFromSender(event.sender);
    if (!window) {
      return;
    }

    const directory = await handleExportMatches(window, data);

    void shell.openPath(path.join(directory, PROJECT_EXPORT_DIRECTORY));
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
      const validatedSettings = settingsDataSchema.parse(settings);

      await updateSettings(validatedSettings);
      setSentryEnabled(validatedSettings.telemetry);

      // Notify all windows of settings change
      const allWindows = BrowserWindow.getAllWindows();
      for (const window of allWindows) {
        window.webContents.send(IPC_EVENTS.SETTINGS_UPDATED, validatedSettings);
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

  ipcMain.handle(
    IPC_EVENTS.ANALYSE_STACK,
    async (_event, photos: PhotoBody[]): Promise<MLMatchResponse | null> => {
      const validatedPhotos = photos.map((photo) => photoBodySchema.parse(photo));

      const settings = await getSettings();

      const selectedModel = settings.mlModels.find(
        (model) => model.id === settings.selectedModelId,
      );

      if (!selectedModel?.endpoint || !selectedModel?.token) {
        throw new Error("Machine Learning integration is not configured.");
      }

      return analyseStack({ photos: validatedPhotos, settings: selectedModel });
    },
  );

  ipcMain.on(IPC_EVENTS.CANCEL_ANALYSE_STACK, () => {
    cancelAnalyseStack();
  });

  ipcMain.on(IPC_EVENTS.OPEN_EXTERNAL_LINK, (_event, link: ExternalLinks) => {
    if (link === "website") {
      return shell.openExternal(EXTERNAL_LINKS.WEBSITE);
    }

    if (link === "user-guide") {
      return shell.openExternal(EXTERNAL_LINKS.USER_GUIDE);
    }

    if (link === "user-guide-ml") {
      return shell.openExternal(EXTERNAL_LINKS.USER_GUIDE_ML);
    }

    if (link === "privacy") {
      return shell.openExternal(EXTERNAL_LINKS.PRIVACY);
    }

    if (link === "changelog") {
      return shell.openExternal(EXTERNAL_LINKS.CHANGELOG.replace("$VERSION", `v${version}`));
    }
  });

  await createMainWindow();

  // Handle file path from macOS open-file event that fired before the window was ready
  if (pendingFilePath) {
    const filePath = pendingFilePath;
    pendingFilePath = null;
    await openProjectFromPath(filePath);
  }

  // Handle file path from argv (Windows/Linux: app launched via file association)
  const argvFilePath = findPhotoidArg(process.argv);
  if (argvFilePath) {
    await openProjectFromPath(argvFilePath);
  }
});
