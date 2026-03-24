import "dotenv/config";

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
import { getSettings, initSentry, setSentryEnabled } from "@/backend/settings";
import { windowManager } from "@/backend/WindowManager";
import { CSP_HEADERS, PHOTO_FILE_EXTENSIONS, PHOTO_PROTOCOL_SCHEME } from "@/constants";

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
  // Prevent running directly from a mounted DMG on macOS
  if (process.platform === "darwin" && production) {
    const executablePath = app.getPath("exe");

    if (executablePath.startsWith("/Volumes/")) {
      dialog.showMessageBoxSync({
        type: "warning",
        buttons: ["Quit"],
        title: "Move Photo ID to Applications",
        message: "Please move the Photo ID app to your Applications folder before opening it.",
      });

      app.exit();
      return;
    }
  }

  const settings = await getSettings();
  setSentryEnabled(settings.telemetry);

  // Set a Content Security Policy on all renderer responses to reduce XSS risk
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [CSP_HEADERS],
      },
    });
  });

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

  // Register all IPC handlers
  registerProjectHandlers(ipcMain);
  registerPhotoHandlers(ipcMain);
  registerEditorHandlers(ipcMain, { production, defaultWebPreferences, basePath });
  registerSettingsHandlers(ipcMain);
  registerModelHandlers(ipcMain);

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
