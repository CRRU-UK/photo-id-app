import path from "node:path";
import url from "node:url";
import { app, BrowserWindow } from "electron";

import { windowManager } from "@/backend/WindowManager";
import { DEFAULT_WINDOW_TITLE, ROUTES } from "@/constants";

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

type ProjectWindowInitialRoute = typeof ROUTES.INDEX | typeof ROUTES.PROJECT;

interface CreateProjectWindowOptions {
  initialRoute?: ProjectWindowInitialRoute;
  maximize?: boolean;
}

const buildWindowUrl = (initialRoute: ProjectWindowInitialRoute): string => {
  const hash = initialRoute === ROUTES.INDEX ? "" : `#${initialRoute}`;

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    return `${MAIN_WINDOW_VITE_DEV_SERVER_URL}${hash}`;
  }

  return url.format({
    protocol: "file",
    slashes: true,
    pathname: basePath,
    hash: hash || undefined,
  });
};

/**
 * Creates a new top-level project window. The window is registered with `windowManager` so its
 * project state and edit windows can be tracked. Loading the actual project (via
 * `loadExistingProject`, `processProjectFolder`, or `handleOpenProjectFile`) is the caller's
 * responsibility.
 */
export const createProjectWindow = async (
  options: CreateProjectWindowOptions = {},
): Promise<BrowserWindow> => {
  const initialRoute = options.initialRoute ?? ROUTES.INDEX;

  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    title: DEFAULT_WINDOW_TITLE,
    // Hide until the renderer has its first frame so users don't see a white "loading" flash.
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

  await window.loadURL(buildWindowUrl(initialRoute));

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
