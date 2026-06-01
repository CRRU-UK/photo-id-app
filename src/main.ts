import "dotenv/config";

import path from "node:path";
import url from "node:url";
import * as Sentry from "@sentry/electron/main";
import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, session } from "electron";
import {
  installExtension,
  MOBX_DEVTOOLS,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";
import started from "electron-squirrel-startup";
import { updateElectronApp } from "update-electron-app";

import { registerAnalysisHandlers } from "@/backend/ipc/analysisHandlers";
import { registerEditorHandlers } from "@/backend/ipc/editorHandlers";
import { registerPhotoHandlers } from "@/backend/ipc/photoHandlers";
import { registerProjectHandlers } from "@/backend/ipc/projectHandlers";
import { registerSettingsHandlers } from "@/backend/ipc/settingsHandlers";
import { findProjectFileArg, openProjectFromPath } from "@/backend/ipc/shared";
import { getMenu } from "@/backend/menu";
import { initSentry } from "@/backend/settings";
import { windowManager } from "@/backend/WindowManager";
import { basePath, createProjectWindow, defaultWebPreferences } from "@/backend/windows";
import { CSP_HEADERS, PHOTO_FILE_EXTENSIONS, PHOTO_PROTOCOL_SCHEME } from "@/constants";

/**
 * Handle Squirrel lifecycle events (install, update, uninstall). `app.quit()` only posts a quit
 * event and does not stop synchronous execution, so we also skip initialisation to prevent rejected
 * promises from surfacing error dialogues while the update is in progress.
 */
if (started) {
  app.quit();
}

if (!started) {
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

  updateElectronApp({ repo: "CRRU-UK/photo-id-app" });
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: PHOTO_PROTOCOL_SCHEME,
    privileges: {
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

const production = app.isPackaged;

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

// Stores .photoid file paths received before any window is ready (macOS open-file or argv)
const pendingFilePaths: string[] = [];

/**
 * macOS: fires when a `.photoid` file is opened (may fire before `whenReady`).
 */
app.on("open-file", async (event, filePath) => {
  event.preventDefault();

  if (windowManager.hasOpenProjectWindows()) {
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
  const filePath = findProjectFileArg(argv);

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
    await createProjectWindow({ maximize: true });
  }
});

// Prevent webview injection in any window
app.on("web-contents-created", (_, contents) => {
  contents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
});

void app.whenReady().then(async () => {
  // Offer to move to the Applications folder on macOS if not already there
  if (process.platform === "darwin" && production && !process.env.E2E) {
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

  // Reject all renderer permission requests
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  // See: https://github.com/electron/electron/pull/51152
  const corsHeaders = { "Access-Control-Allow-Origin": "*" };

  /**
   * `photo://` protocol handler. Validates that the requested file path lies inside one of the
   * currently-open project directories (any window's project, under the existing trust model all
   * open projects are equally user-authorised) and that the extension is on the allow-list. See
   * SECURITY.md for the rationale behind the "any open project" validation model.
   */
  protocol.handle(PHOTO_PROTOCOL_SCHEME, async (request) => {
    try {
      const openDirectories = windowManager.getAllProjectDirectories();
      if (openDirectories.size === 0) {
        return new Response(null, { status: 403, headers: corsHeaders });
      }

      const fileUrl = request.url.replace(/^photo:/, "file:");
      const filePath = path.resolve(url.fileURLToPath(fileUrl));

      const extension = path.extname(filePath).toLowerCase();
      if (!PHOTO_FILE_EXTENSIONS.includes(extension)) {
        return new Response(null, { status: 403, headers: corsHeaders });
      }

      const isInsideOpenProject = Array.from(openDirectories).some((directory) => {
        const resolved = path.resolve(directory);
        return filePath.startsWith(resolved + path.sep);
      });

      if (!isInsideOpenProject) {
        return new Response(null, { status: 403, headers: corsHeaders });
      }

      const upstream = await net.fetch(url.pathToFileURL(filePath).toString());
      const headers = new Headers(upstream.headers);
      headers.set("Access-Control-Allow-Origin", "*");

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      });
    } catch {
      return new Response(null, { status: 400, headers: corsHeaders });
    }
  });

  if (!production && !process.env.E2E) {
    await installExtension([REACT_DEVELOPER_TOOLS, MOBX_DEVTOOLS]);
  }

  // Register all IPC handlers
  registerProjectHandlers(ipcMain);
  registerPhotoHandlers(ipcMain);
  registerEditorHandlers(ipcMain, { production, defaultWebPreferences, basePath });
  registerSettingsHandlers(ipcMain);
  registerAnalysisHandlers(ipcMain);

  // Install the application menu once at app ready. Click handlers resolve the focused window at
  // click time, so the same menu serves every window.
  Menu.setApplicationMenu(Menu.buildFromTemplate(getMenu()));

  await createProjectWindow({ maximize: true });

  /**
   * Handle file paths queued before any window was ready (macOS open-file event firing before
   * `whenReady`, plus the file path that the OS passed via argv on Windows/Linux). The first
   * pending path loads into the initial empty window; any additional paths get their own windows.
   * `openProjectFromPath` reuses an idle window when one exists, so order matters.
   */
  const queuedPaths = [...pendingFilePaths];
  pendingFilePaths.length = 0;

  const argvFilePath = findProjectFileArg(process.argv);
  if (argvFilePath && !queuedPaths.includes(argvFilePath)) {
    queuedPaths.push(argvFilePath);
  }

  for (const queuedPath of queuedPaths) {
    await openProjectFromPath(queuedPath);
  }
});
