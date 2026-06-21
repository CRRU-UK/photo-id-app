import "dotenv/config";

import * as Sentry from "@sentry/electron/main";
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  type MenuItemConstructorOptions,
  protocol,
  session,
} from "electron";
import started from "electron-squirrel-startup";
import { updateElectronApp } from "update-electron-app";

import { registerAnalysisHandlers } from "@/backend/ipc/analysisHandlers";
import { registerEditorHandlers } from "@/backend/ipc/editorHandlers";
import { registerPhotoHandlers } from "@/backend/ipc/photoHandlers";
import {
  openProjectFileForWindow,
  openProjectFolderForWindow,
  registerProjectHandlers,
} from "@/backend/ipc/projectHandlers";
import { registerSettingsHandlers } from "@/backend/ipc/settingsHandlers";
import { findProjectFileArg, openProjectFromPath } from "@/backend/ipc/shared";
import { getMenu } from "@/backend/menu";
import { initSentry } from "@/backend/settings";
import { applyWindowsJumpList } from "@/backend/shellIntegration";
import { windowManager } from "@/backend/WindowManager";
import { basePath, createProjectWindow, defaultWebPreferences } from "@/backend/windows";
import { JUMP_LIST_ARGS, PHOTO_PROTOCOL_SCHEME } from "@/constants";

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
 * Returns a project window for menu/dock/jump-list driven flows. Reuses an idle (empty) project
 * window if there is one, otherwise spawns a fresh one. Mirrors `resolveProjectWindowForMenu` in
 * `menu.ts`.
 */
const resolveLaunchWindow = async (): Promise<BrowserWindow> => {
  const idle = windowManager.findIdleProjectWindow();
  if (idle) {
    return idle;
  }
  return createProjectWindow();
};

/**
 * Wires the OS-level quick-launch shortcuts: macOS dock menu (static) and the initial Windows
 * Jump List (refreshed later by `notifyRecentProjectsChanged` whenever recents change).
 */
const setupQuickLaunchTasks = async (): Promise<void> => {
  if (process.platform === "win32") {
    await applyWindowsJumpList();
    return;
  }

  if (process.platform === "darwin") {
    const dockMenu: MenuItemConstructorOptions[] = [
      {
        label: "New Project",
        click: async () => {
          const window = await resolveLaunchWindow();
          await openProjectFolderForWindow(window);
        },
      },
      {
        label: "Open Project File...",
        click: async () => {
          const window = await resolveLaunchWindow();
          await openProjectFileForWindow(window);
        },
      },
    ];

    app.dock?.setMenu(Menu.buildFromTemplate(dockMenu));
  }
};

/**
 * Dispatches an argv array to either a quick-launch handler or the existing `.photoid` file-open
 * flow.
 */
const handleStartupArgv = async (argv: string[]): Promise<void> => {
  if (argv.includes(JUMP_LIST_ARGS.NEW_PROJECT)) {
    const window = await resolveLaunchWindow();
    await openProjectFolderForWindow(window);
    return;
  }

  if (argv.includes(JUMP_LIST_ARGS.OPEN_PROJECT_FILE)) {
    const window = await resolveLaunchWindow();
    await openProjectFileForWindow(window);
    return;
  }

  const filePath = findProjectFileArg(argv);
  if (filePath) {
    await openProjectFromPath(filePath);
  }
};

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
 * Windows/Linux: fires when a second instance is launched with a file argument or one of the Jump
 * List task argv flags.
 */
app.on("second-instance", async (_event, argv) => {
  try {
    await handleStartupArgv(argv);
  } catch (error) {
    console.error("Failed to handle second-instance argv:", error);
    dialog.showErrorBox("Failed to open project", String(error));
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

/**
 * Catch windows that land on the default session, which has no CSP, permission denial, or
 * `photo://` handler. Every BrowserWindow must pass an explicit `webPreferences.session`.
 */
app.on("browser-window-created", (_event, window) => {
  if (window.webContents.session === session.defaultSession) {
    console.error(
      "BrowserWindow created on the default session — pass `webPreferences.session` explicitly so CSP, permission denial, and the photo:// handler apply.",
    );
  }
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

  // Register all IPC handlers
  registerProjectHandlers(ipcMain);
  registerPhotoHandlers(ipcMain);
  registerEditorHandlers(ipcMain, { production, defaultWebPreferences, basePath });
  registerSettingsHandlers(ipcMain);
  registerAnalysisHandlers(ipcMain);

  // Install the application menu once at app ready. Click handlers resolve the focused window at
  // click time, so the same menu serves every window.
  Menu.setApplicationMenu(Menu.buildFromTemplate(await getMenu()));

  await createProjectWindow({ maximize: true });

  await setupQuickLaunchTasks();

  /**
   * Handle file paths queued before any window was ready (macOS open-file event firing before
   * `whenReady`, plus the file path that the OS passed via argv on Windows/Linux). The first
   * pending path loads into the initial empty window; any additional paths get their own windows.
   * `openProjectFromPath` reuses an idle window when one exists, so order matters.
   */
  const queuedPaths = [...pendingFilePaths];
  pendingFilePaths.length = 0;

  for (const queuedPath of queuedPaths) {
    await openProjectFromPath(queuedPath);
  }

  // Handle initial argv (Windows/Linux file association, or a Jump List task that launched us)
  await handleStartupArgv(process.argv);
});
