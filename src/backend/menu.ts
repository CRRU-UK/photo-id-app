import type { BrowserWindow } from "electron";
import { app, Menu, shell } from "electron";

import { broadcastToAllWindows, openProjectFromPath } from "@/backend/ipc/shared";
import { handleOpenDirectoryPrompt, handleOpenFilePrompt } from "@/backend/projects";
import { clearRecentProjects, getRecentProjects } from "@/backend/recents";
import { windowManager } from "@/backend/WindowManager";
import { EXTERNAL_LINKS, IPC_EVENTS } from "@/constants";
import type { RecentProject } from "@/types";

const buildOpenRecentSubmenu = (
  recents: RecentProject[],
): Electron.MenuItemConstructorOptions[] => {
  if (recents.length === 0) {
    return [{ label: "No Recent Projects", enabled: false }];
  }

  const items: Electron.MenuItemConstructorOptions[] = recents.map((recent) => ({
    label: recent.name,
    toolTip: recent.path,
    click: async () => {
      try {
        await openProjectFromPath(recent.path);
      } catch (error) {
        console.error("Failed to open recent project:", error);
      }
    },
  }));

  items.push(
    { type: "separator" },
    {
      label: "Clear Recent",
      click: async () => {
        await clearRecentProjects();
        await notifyRecentProjectsChanged();
      },
    },
  );

  return items;
};

const getMenu = async (
  mainWindow: BrowserWindow,
): Promise<Electron.MenuItemConstructorOptions[]> => {
  const isMac = process.platform === "darwin";

  const recents = await getRecentProjects();

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
                click() {
                  mainWindow.focus();
                  mainWindow.webContents.send(IPC_EVENTS.OPEN_SETTINGS);
                },
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
          label: "Open Project Folder",
          accelerator: "CmdOrCtrl+O",
          click() {
            void handleOpenDirectoryPrompt(mainWindow);
          },
        },
        {
          label: "Open Project File",
          accelerator: "CmdOrCtrl+Shift+O",
          click() {
            void handleOpenFilePrompt(mainWindow);
          },
        },
        {
          label: "Open Recent",
          submenu: buildOpenRecentSubmenu(recents),
        },
        ...(isMac
          ? []
          : [
              {
                label: "Settings",
                accelerator: "CmdOrCtrl+,",
                click() {
                  mainWindow.focus();
                  mainWindow.webContents.send(IPC_EVENTS.OPEN_SETTINGS);
                },
              },
            ]),
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

/**
 * Rebuilds and applies the application menu using the current main window and the latest recent
 * projects.
 */
const rebuildApplicationMenu = async (): Promise<void> => {
  const mainWindow = windowManager.getMainWindow();
  if (!mainWindow) {
    return;
  }

  const template = await getMenu(mainWindow);
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

/**
 * Hook to keep recent items menu and in-app list in sync on updates.
 */
const notifyRecentProjectsChanged = async (): Promise<void> => {
  const recents = await getRecentProjects();

  broadcastToAllWindows(IPC_EVENTS.RECENT_PROJECTS_UPDATED, recents);

  await rebuildApplicationMenu();
};

export { getMenu, notifyRecentProjectsChanged };
