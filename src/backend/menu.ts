import type { BrowserWindow } from "electron";
import { app, shell } from "electron";

import { handleOpenDirectoryPrompt, handleOpenFilePrompt } from "@/backend/projects";
import { EXTERNAL_LINKS, IPC_EVENTS } from "@/constants";

const getMenu = (mainWindow: BrowserWindow) => {
  const isMac = process.platform === "darwin";

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
            handleOpenDirectoryPrompt(mainWindow);
          },
        },
        {
          label: "Open Project File",
          accelerator: "CmdOrCtrl+Shift+O",
          click() {
            handleOpenFilePrompt(mainWindow);
          },
        },
        ...(!isMac
          ? [
              {
                label: "Settings",
                accelerator: "CmdOrCtrl+,",
                click() {
                  mainWindow.webContents.send(IPC_EVENTS.OPEN_SETTINGS);
                },
              },
            ]
          : []),
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
