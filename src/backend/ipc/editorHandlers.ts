import { BrowserWindow, type IpcMainEvent, type IpcMainInvokeEvent } from "electron";
import url from "node:url";

import { handleEditorNavigate } from "@/backend/projects";
import { windowManager } from "@/backend/WindowManager";
import { IPC_EVENTS, ROUTES } from "@/constants";
import { encodeEditPayload } from "@/helpers";
import type { EditorNavigation, PhotoBody } from "@/types";

export type EditorConfig = {
  production: boolean;
  defaultWebPreferences: Electron.WebPreferences;
  basePath: string;
};

export const handleOpenEditWindow = (config: EditorConfig) => {
  return (_event: IpcMainEvent, data: PhotoBody): void => {
    const editWindow = new BrowserWindow({
      show: false,
      width: 1200,
      height: 800,
      webPreferences: config.defaultWebPreferences,
      backgroundColor: "black",
      fullscreenable: false,
    });

    editWindow.removeMenu();

    windowManager.addEditWindow(editWindow);

    if (!config.production) {
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
          pathname: config.basePath,
          hash: `#${ROUTES.EDIT}`,
          search: `?data=${encodedQuery}`,
        }),
      );
    }

    editWindow.once("ready-to-show", () => editWindow.show());
  };
};

export const handleNavigateEditorPhoto = async (
  _event: IpcMainInvokeEvent,
  data: PhotoBody,
  direction: EditorNavigation,
): Promise<string | null> => {
  const result = await handleEditorNavigate(data, direction);

  if (!result) {
    console.warn("Photo not found in project for navigation");
    return null;
  }

  return encodeEditPayload(result);
};

export const registerEditorHandlers = (ipcMain: Electron.IpcMain, config: EditorConfig): void => {
  ipcMain.on(IPC_EVENTS.OPEN_EDIT_WINDOW, handleOpenEditWindow(config));
  ipcMain.handle(IPC_EVENTS.NAVIGATE_EDITOR_PHOTO, handleNavigateEditorPhoto);
};
