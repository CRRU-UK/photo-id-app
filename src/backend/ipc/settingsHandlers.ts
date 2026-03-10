import type { IpcMainEvent, IpcMainInvokeEvent } from "electron";
import { shell } from "electron";

import { broadcastToAllWindows, resolveExternalLinkUrl } from "@/backend/ipc/shared";
import { getSettingsForRenderer, setSentryEnabled, updateSettings } from "@/backend/settings";
import { windowManager } from "@/backend/WindowManager";
import { IPC_EVENTS } from "@/constants";
import { settingsDataSchema } from "@/schemas";
import type { ExternalLinks, SettingsData } from "@/types";

export const handleGetSettings = async (): Promise<SettingsData> => {
  const result = await getSettingsForRenderer();
  return result;
};

export const handleUpdateSettings = async (
  _event: IpcMainInvokeEvent,
  settings: SettingsData,
): Promise<void> => {
  const validatedSettings = settingsDataSchema.parse(settings);

  await updateSettings(validatedSettings);
  setSentryEnabled(validatedSettings.telemetry);

  // Notify all windows with enriched settings
  const enrichedSettings = await getSettingsForRenderer();
  broadcastToAllWindows(IPC_EVENTS.SETTINGS_UPDATED, enrichedSettings);
};

export const handleOpenSettings = (): void => {
  const mainWindow = windowManager.getMainWindow();

  if (mainWindow) {
    mainWindow.focus();
    mainWindow.webContents.send(IPC_EVENTS.OPEN_SETTINGS);
  }
};

export const handleOpenExternalLink = (_event: IpcMainEvent, link: ExternalLinks): void => {
  const url = resolveExternalLinkUrl(link);

  if (url) {
    void shell.openExternal(url);
  }
};

export const registerSettingsHandlers = (ipcMain: Electron.IpcMain): void => {
  ipcMain.handle(IPC_EVENTS.GET_SETTINGS, handleGetSettings);
  ipcMain.handle(IPC_EVENTS.UPDATE_SETTINGS, handleUpdateSettings);
  ipcMain.on(IPC_EVENTS.OPEN_SETTINGS, handleOpenSettings);
  ipcMain.on(IPC_EVENTS.OPEN_EXTERNAL_LINK, handleOpenExternalLink);
};
