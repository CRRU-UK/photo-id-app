import type { IpcMainInvokeEvent } from "electron";

import { analyseStack, cancelAnalyseStack } from "@/backend/analysis";
import { broadcastToAllWindows } from "@/backend/ipc/shared";
import {
  getSettings,
  getSettingsForRenderer,
  removeAnalysisProvider,
  updateSettings,
  upsertAnalysisProvider,
} from "@/backend/settings";
import { deleteToken, getToken, isEncryptionAvailable, saveToken } from "@/backend/tokens";
import { IPC_EVENTS } from "@/constants";
import { analysisProviderDraftSchema, analysisProviderSchema, photoBodySchema } from "@/schemas";
import type {
  AnalysisMatchResponse,
  AnalysisProvider,
  AnalysisProviderDraft,
  PhotoBody,
} from "@/types";

/**
 * Broadcasts enriched settings to all windows after an analysis provider change.
 */
const broadcastSettingsUpdate = async (): Promise<void> => {
  const enrichedSettings = await getSettingsForRenderer();
  broadcastToAllWindows(IPC_EVENTS.SETTINGS_UPDATED, enrichedSettings);
};

export const handleSaveAnalysisProvider = async (
  _event: IpcMainInvokeEvent,
  draft: AnalysisProviderDraft,
): Promise<void> => {
  const validatedDraft = analysisProviderDraftSchema.parse(draft);
  const settings = await getSettings();

  const providerId = validatedDraft.id ?? crypto.randomUUID();

  const providerMetadata: AnalysisProvider = {
    id: providerId,
    name: validatedDraft.name,
    endpoint: validatedDraft.endpoint,
  };

  const updatedSettings = upsertAnalysisProvider(settings, providerId, providerMetadata);

  if (validatedDraft.token) {
    await saveToken(providerId, validatedDraft.token);
  }
  await updateSettings(updatedSettings);

  await broadcastSettingsUpdate();
};

export const handleDeleteAnalysisProvider = async (
  _event: IpcMainInvokeEvent,
  providerId: string,
): Promise<void> => {
  analysisProviderSchema.shape.id.parse(providerId);

  const settings = await getSettings();
  const updatedSettings = removeAnalysisProvider(settings, providerId);

  await deleteToken(providerId);
  await updateSettings(updatedSettings);

  await broadcastSettingsUpdate();
};

export const handleAnalyseStack = async (
  _event: IpcMainInvokeEvent,
  photos: PhotoBody[],
): Promise<AnalysisMatchResponse | null> => {
  const validatedPhotos = photos.map((photo) => photoBodySchema.parse(photo));

  const settings = await getSettings();

  const selectedProvider = settings.analysisProviders.find(
    ({ id }) => id === settings.selectedAnalysisProviderId,
  );

  if (!selectedProvider?.endpoint) {
    throw new Error("Analysis provider is not configured.");
  }

  const token = await getToken(selectedProvider.id);

  if (!token) {
    throw new Error("Analysis API token is not configured or could not be decrypted.");
  }

  return analyseStack({
    photos: validatedPhotos,
    settings: { endpoint: selectedProvider.endpoint, token },
  });
};

export const handleGetEncryptionAvailability = (): boolean => isEncryptionAvailable();

export const registerAnalysisHandlers = (ipcMain: Electron.IpcMain): void => {
  ipcMain.handle(IPC_EVENTS.SAVE_ANALYSIS_PROVIDER, handleSaveAnalysisProvider);
  ipcMain.handle(IPC_EVENTS.DELETE_ANALYSIS_PROVIDER, handleDeleteAnalysisProvider);
  ipcMain.handle(IPC_EVENTS.ANALYSE_STACK, handleAnalyseStack);
  ipcMain.handle(IPC_EVENTS.GET_ENCRYPTION_AVAILABILITY, handleGetEncryptionAvailability);
  ipcMain.on(IPC_EVENTS.CANCEL_ANALYSE_STACK, () => cancelAnalyseStack());
};
