import { dialog, type IpcMainInvokeEvent } from "electron";

import { createPhotoThumbnail } from "@/backend/photos";
import { handleDuplicatePhotoFile } from "@/backend/projects";
import { windowManager } from "@/backend/WindowManager";
import { DUPLICATE_LIMIT_ERROR, IPC_EVENTS } from "@/constants";
import type { PhotoBody } from "@/types";

export const handleSavePhotoFile = async (
  event: IpcMainInvokeEvent,
  data: PhotoBody,
): Promise<void> => {
  const directory = windowManager.getDirectoryForSender(event.sender);
  if (directory === null) {
    throw new Error("No project open");
  }

  const thumbnail = await createPhotoThumbnail(directory, data);

  const photoData: PhotoBody = {
    ...data,
    thumbnail,
  };

  /**
   * Notify the parent project window (the one that owns this edit window) so its renderer
   * refreshes the thumbnail. Other open project windows are unrelated and should not receive
   * this event.
   */
  const projectWindow = windowManager.getProjectWindowForSender(event.sender);

  if (projectWindow && !projectWindow.isDestroyed()) {
    projectWindow.webContents.send(IPC_EVENTS.UPDATE_PHOTO, photoData);
  }
};

export const handleDuplicatePhotoFileInvoke = async (
  event: IpcMainInvokeEvent,
  data: PhotoBody,
): Promise<PhotoBody> => {
  const directory = windowManager.getDirectoryForSender(event.sender);
  if (directory === null) {
    throw new Error("No project open");
  }

  try {
    return await handleDuplicatePhotoFile(directory, data);
  } catch (error) {
    if (error instanceof Error && error.message === DUPLICATE_LIMIT_ERROR) {
      dialog.showErrorBox("Cannot duplicate photo", DUPLICATE_LIMIT_ERROR);
    }

    throw error;
  }
};

export const registerPhotoHandlers = (ipcMain: Electron.IpcMain): void => {
  ipcMain.handle(IPC_EVENTS.SAVE_PHOTO_FILE, handleSavePhotoFile);
  ipcMain.handle(IPC_EVENTS.DUPLICATE_PHOTO_FILE, handleDuplicatePhotoFileInvoke);
};
