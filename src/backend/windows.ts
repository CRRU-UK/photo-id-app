import path from "node:path";
import url from "node:url";
import { app, BrowserWindow } from "electron";

import { windowManager } from "@/backend/WindowManager";
import { DEFAULT_WINDOW_TITLE } from "@/constants";

const production = app.isPackaged;

/**
 * Default webPreferences applied to every project window. Edit windows narrow these further (see
 * `src/backend/ipc/editorHandlers.ts`).
 */
export const defaultWebPreferences: Electron.WebPreferences = {
  preload: path.join(__dirname, "preload.js"),
  nodeIntegration: false,
  contextIsolation: true,
  webSecurity: true,
  sandbox: true,
  allowRunningInsecureContent: false,
};

/**
 * Bundled renderer entry point (used in production where the dev server isn't running). Kept here
 * so any module that opens a window can resolve it without re-importing the Vite globals.
 */
export const basePath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);

interface CreateProjectWindowOptions {
  /** If true, the new window is maximised after creation. The first/bootstrap window uses this. */
  maximize?: boolean;
}

/**
 * Creates a new top-level project window showing the index route. The window is registered with
 * `windowManager` so its project state and edit windows can be tracked. The caller can subsequently
 * load a project into the returned window (e.g. via `handleOpenProjectFile`).
 */
export const createProjectWindow = async (
  options: CreateProjectWindowOptions = {},
): Promise<BrowserWindow> => {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    title: DEFAULT_WINDOW_TITLE,
    show: false,
    webPreferences: defaultWebPreferences,
  });

  window.once("ready-to-show", () => {
    if (options.maximize) {
      window.maximize();
    }

    window.show();
  });

  windowManager.registerProjectWindow(window);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    await window.loadURL(
      url.format({
        protocol: "file",
        slashes: true,
        pathname: basePath,
      }),
    );
  }

  window.webContents.on("did-create-window", (child) => {
    child.webContents.once("dom-ready", () => {
      if (!production && !process.env.E2E) {
        child.webContents.openDevTools();
      }
    });
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  // Block navigation to arbitrary URLs so a compromised renderer cannot leave the app origin
  window.webContents.on("will-navigate", (event, navigationUrl) => {
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

  if (!production && !process.env.E2E) {
    window.webContents.openDevTools();
  }

  return window;
};
