import "dotenv/config";

import * as Sentry from "@sentry/electron/main";
import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, session } from "electron";
import {
  installExtension,
  MOBX_DEVTOOLS,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
import started from "electron-squirrel-startup";
import path from "node:path";
import url from "node:url";
import { updateElectronApp } from "update-electron-app";

import { registerEditorHandlers } from "@/backend/ipc/editorHandlers";
import { registerModelHandlers } from "@/backend/ipc/modelHandlers";
import { registerPhotoHandlers } from "@/backend/ipc/photoHandlers";
import { registerProjectHandlers } from "@/backend/ipc/projectHandlers";
import { registerSettingsHandlers } from "@/backend/ipc/settingsHandlers";
import { findPhotoidArg, openProjectFromPath } from "@/backend/ipc/shared";
import { getMenu } from "@/backend/menu";
import { getCurrentProjectDirectory } from "@/backend/projects";
import { initSentry } from "@/backend/settings";
import { windowManager } from "@/backend/WindowManager";
import { CSP_HEADERS, PHOTO_FILE_EXTENSIONS, PHOTO_PROTOCOL_SCHEME } from "@/constants";

initSentry();

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  Sentry.captureException(error);
  dialog.showErrorBox("Unexpected Error", String(error));
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
  Sentry.captureException(reason);
  dialog.showErrorBox("Unexpected Error", String(reason));
});

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

// Stores .photoid file paths received before the main window is ready (macOS open-file or argv)
const pendingFilePaths: string[] = [];

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

  // Block navigation to arbitrary URLs so a compromised renderer cannot leave the app origin
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    if (
      MAIN_WINDOW_VITE_DEV_SERVER_URL &&
      navigationUrl.startsWith(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    ) {
      return;
    }

    if (!navigationUrl.startsWith("file:")) {
      event.preventDefault();
    }
  });

  const menu = Menu.buildFromTemplate(getMenu(mainWindow));
  Menu.setApplicationMenu(menu);

  if (!production) {
    mainWindow.webContents.openDevTools();
  }
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

  pendingFilePaths.push(filePath);
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
  // Offer to move to the Applications folder on macOS if not already there
  if (process.platform === "darwin" && production) {
    if (!app.isInApplicationsFolder()) {
      const response = dialog.showMessageBoxSync({
        type: "question",
        buttons: ["Move to Applications", "Quit"],
        defaultId: 0,
        cancelId: 1,
        title: "Move Photo ID to Applications",
        message: "Photo ID needs to be in your Applications folder to run correctly.",
      });

      if (response === 0) {
        try {
          return app.moveToApplicationsFolder();
        } catch (error) {
          console.error("Failed to move to Applications folder:", error);
          dialog.showErrorBox("Failed to move to Applications", String(error));
        }
      }

      return app.exit();
    }
  }

  // Set a Content Security Policy on all renderer responses to reduce XSS risk
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [CSP_HEADERS],
        "Document-Policy": ["js-profiling"],
      },
    });
  });

  protocol.handle(PHOTO_PROTOCOL_SCHEME, (request) => {
    try {
      const projectDirectory = getCurrentProjectDirectory();
      if (!projectDirectory) {
        return new Response(null, { status: 403 });
      }

      const fileUrl = request.url.replace(/^photo:/, "file:");
      const filePath = path.resolve(url.fileURLToPath(fileUrl));

      const extension = path.extname(filePath).toLowerCase();
      if (!PHOTO_FILE_EXTENSIONS.includes(extension)) {
        return new Response(null, { status: 403 });
      }

      const resolvedProjectDirectory = path.resolve(projectDirectory);
      if (!filePath.startsWith(resolvedProjectDirectory + path.sep)) {
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

  // Register all IPC handlers
  registerProjectHandlers(ipcMain);
  registerPhotoHandlers(ipcMain);
  registerEditorHandlers(ipcMain, { production, defaultWebPreferences, basePath });
  registerSettingsHandlers(ipcMain);
  registerModelHandlers(ipcMain);

  await createMainWindow();

  /**
   * Handle file path from macOS open-file event that fired before the window was ready (only the
   * last path is opened if multiple events fired before the window was ready)
   */
  const pendingFilePath = pendingFilePaths.pop();
  pendingFilePaths.length = 0;

  if (pendingFilePath) {
    await openProjectFromPath(pendingFilePath);
  }

  // Handle file path from argv (Windows/Linux: app launched via file association)
  const argvFilePath = findPhotoidArg(process.argv);
  if (argvFilePath) {
    await openProjectFromPath(argvFilePath);
  }
});
