import type { IpcMainInvokeEvent } from "electron";

import { broadcastToAllWindows } from "@/backend/ipc/shared";
import { analyseStack, cancelAnalyseStack } from "@/backend/model";
import {
  getSettings,
  getSettingsForRenderer,
  removeModel,
  updateSettings,
  upsertModel,
} from "@/backend/settings";
import { deleteToken, getToken, saveToken } from "@/backend/tokens";
import { IPC_EVENTS } from "@/constants";
import { mlModelDraftSchema, mlModelSchema, photoBodySchema } from "@/schemas";
import type { MLMatchResponse, MLModel, MLModelDraft, PhotoBody } from "@/types";

/**
 * Broadcasts enriched settings to all windows after a model change.
 */
const broadcastSettingsUpdate = async (): Promise<void> => {
  const enrichedSettings = await getSettingsForRenderer();
  broadcastToAllWindows(IPC_EVENTS.SETTINGS_UPDATED, enrichedSettings);
};

export const handleSaveModel = async (
  _event: IpcMainInvokeEvent,
  draft: MLModelDraft,
): Promise<void> => {
  const validatedDraft = mlModelDraftSchema.parse(draft);
  const settings = await getSettings();

  const modelId = validatedDraft.id ?? crypto.randomUUID();

  const modelMetadata: MLModel = {
    id: modelId,
    name: validatedDraft.name,
    endpoint: validatedDraft.endpoint,
  };

  const updatedSettings = upsertModel(settings, modelId, modelMetadata);

  if (validatedDraft.token) {
    await saveToken(modelId, validatedDraft.token);
  }
  await updateSettings(updatedSettings);

  await broadcastSettingsUpdate();
};

export const handleDeleteModel = async (
  _event: IpcMainInvokeEvent,
  modelId: string,
): Promise<void> => {
  mlModelSchema.shape.id.parse(modelId);

  const settings = await getSettings();
  const updatedSettings = removeModel(settings, modelId);

  await deleteToken(modelId);
  await updateSettings(updatedSettings);

  await broadcastSettingsUpdate();
};

export const handleAnalyseStack = async (
  _event: IpcMainInvokeEvent,
  photos: PhotoBody[],
): Promise<MLMatchResponse | null> => {
  const validatedPhotos = photos.map((photo) => photoBodySchema.parse(photo));

  const settings = await getSettings();

  const selectedModel = settings.mlModels.find(({ id }) => id === settings.selectedModelId);

  if (!selectedModel?.endpoint) {
    throw new Error("Machine Learning integration is not configured.");
  }

  const token = await getToken(selectedModel.id);

  if (!token) {
    throw new Error("Machine Learning API token is not configured or could not be decrypted.");
  }

  return analyseStack({
    photos: validatedPhotos,
    settings: { endpoint: selectedModel.endpoint, token },
  });
};

export const registerModelHandlers = (ipcMain: Electron.IpcMain): void => {
  ipcMain.handle(IPC_EVENTS.SAVE_MODEL, handleSaveModel);
  ipcMain.handle(IPC_EVENTS.DELETE_MODEL, handleDeleteModel);
  ipcMain.handle(IPC_EVENTS.ANALYSE_STACK, handleAnalyseStack);
  ipcMain.on(IPC_EVENTS.CANCEL_ANALYSE_STACK, () => cancelAnalyseStack());
};
