import { app, BrowserWindow, shell } from "electron";

import {
  openProjectFileForWindow,
  openProjectFolderForWindow,
} from "@/backend/ipc/projectHandlers";
import { windowManager } from "@/backend/WindowManager";
import { createProjectWindow } from "@/backend/windows";
import { EXTERNAL_LINKS, IPC_EVENTS } from "@/constants";

/**
 * Resolves the project window for the currently-focused window, falling back to null if there is
 * no focused window or it isn't a tracked project window (e.g. a settings dialog).
 */
const focusedProjectWindow = (): BrowserWindow | null => {
  const focused = BrowserWindow.getFocusedWindow();
  if (!focused) {
    return null;
  }
  return windowManager.getProjectWindowForSender(focused.webContents);
};

/**
 * Returns a project window to operate on for menu-driven actions. Falls back to creating a fresh
 * index window when no project window is focused (typical on macOS when all windows are closed
 * but the app is still running in the dock). Without this, menu items like Open Project Folder
 * would silently no-op.
 */
const resolveProjectWindowForMenu = async (): Promise<BrowserWindow> => {
  const focused = focusedProjectWindow();
  if (focused) {
    return focused;
  }

  return createProjectWindow();
};

const getMenu = (): Electron.MenuItemConstructorOptions[] => {
  const isMac = process.platform === "darwin";

  const openPreferences = async () => {
    const window = await resolveProjectWindowForMenu();
    window.focus();
    window.webContents.send(IPC_EVENTS.OPEN_SETTINGS);
  };

  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              {
                label: "Preferences...",
                accelerator: "CmdOrCtrl+,",
                click: openPreferences,
              },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Window",
          accelerator: "CmdOrCtrl+N",
          click() {
            void createProjectWindow();
          },
        },
        { type: "separator" },
        {
          label: "Open Project Folder",
          accelerator: "CmdOrCtrl+O",
          async click() {
            const window = await resolveProjectWindowForMenu();
            await openProjectFolderForWindow(window);
          },
        },
        {
          label: "Open Project File",
          accelerator: "CmdOrCtrl+Shift+O",
          async click() {
            const window = await resolveProjectWindowForMenu();
            await openProjectFileForWindow(window);
          },
        },
        ...(isMac
          ? []
          : [
              {
                label: "Settings",
                accelerator: "CmdOrCtrl+,",
                click: openPreferences,
              },
            ]),
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        ...(isMac
          ? [
              { role: "pasteAndMatchStyle" },
              { role: "delete" },
              { role: "selectAll" },
              { type: "separator" },
              {
                label: "Speech",
                submenu: [{ role: "startSpeaking" }, { role: "stopSpeaking" }],
              },
            ]
          : [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }]),
      ],
    },
    {
      label: "View",
      submenu: [{ role: "toggleDevTools" }, { type: "separator" }, { role: "togglefullscreen" }],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [{ type: "separator" }, { role: "front" }, { type: "separator" }, { role: "window" }]
          : [{ role: "close" }]),
      ],
    },
    {
      role: "help",
      submenu: [
        {
          label: "User Guide",
          click: async () => {
            await shell.openExternal(EXTERNAL_LINKS.USER_GUIDE);
          },
        },
        {
          label: "Keyboard Shortcuts",
          click: async () => {
            await shell.openExternal(EXTERNAL_LINKS.KEYBOARD_SHORTCUTS);
          },
        },
        {
          label: "Privacy Policy",
          click: async () => {
            await shell.openExternal(EXTERNAL_LINKS.PRIVACY);
          },
        },
        {
          label: "CRRU Website",
          click: async () => {
            await shell.openExternal(EXTERNAL_LINKS.WEBSITE);
          },
        },
      ],
    },
  ] as Electron.MenuItemConstructorOptions[];

  return template;
};

export { getMenu };
