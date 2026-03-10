import type { IpcMainInvokeEvent } from "electron";

import { createPhotoThumbnail, revertPhotoToOriginal } from "@/backend/photos";
import { handleDuplicatePhotoFile } from "@/backend/projects";
import { windowManager } from "@/backend/WindowManager";
import { IPC_EVENTS } from "@/constants";
import type { PhotoBody } from "@/types";

export const handleSavePhotoFile = async (
  _event: IpcMainInvokeEvent,
  data: PhotoBody,
): Promise<void> => {
  const thumbnail = await createPhotoThumbnail(data);

  const photoData: PhotoBody = {
    ...data,
    thumbnail,
  };

  const mainWindow = windowManager.getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send(IPC_EVENTS.UPDATE_PHOTO, photoData);
  }
};

export const handleRevertPhotoFile = async (
  _event: IpcMainInvokeEvent,
  data: PhotoBody,
): Promise<PhotoBody> => {
  const result = await revertPhotoToOriginal(data);
  return result;
};

export const handleDuplicatePhotoFileInvoke = async (
  _event: IpcMainInvokeEvent,
  data: PhotoBody,
): Promise<PhotoBody> => {
  const result = await handleDuplicatePhotoFile(data);
  return result;
};

export const registerPhotoHandlers = (ipcMain: Electron.IpcMain): void => {
  ipcMain.handle(IPC_EVENTS.SAVE_PHOTO_FILE, handleSavePhotoFile);
  ipcMain.handle(IPC_EVENTS.REVERT_PHOTO_FILE, handleRevertPhotoFile);
  ipcMain.handle(IPC_EVENTS.DUPLICATE_PHOTO_FILE, handleDuplicatePhotoFileInvoke);
};
