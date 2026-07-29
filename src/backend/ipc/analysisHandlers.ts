import type { IpcMainInvokeEvent } from "electron";

import { analyseMatches, cancelAnalyseMatches } from "@/backend/analysis";
import { broadcastToAllWindows } from "@/backend/ipc/shared";
import {
  getSettings,
  removeAnalysisProvider,
  updateSettings,
  upsertAnalysisProvider,
} from "@/backend/settings";
import { deleteToken, getToken, isEncryptionAvailable, saveToken } from "@/backend/tokens";
import { windowManager } from "@/backend/WindowManager";
import { IPC_EVENTS } from "@/constants";
import { analysisProviderDraftSchema, analysisProviderSchema, photoBodySchema } from "@/schemas";
import type {
  AnalysisMatchResults,
  AnalysisProvider,
  AnalysisProviderDraft,
  PhotoBody,
} from "@/types";

/**
 * Broadcasts enriched settings to all windows after an analysis provider change.
 */
const broadcastSettingsUpdate = async (): Promise<void> => {
  const enrichedSettings = await getSettings();
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

export const handleAnalyseMatches = async (
  event: IpcMainInvokeEvent,
  photos: PhotoBody[],
): Promise<AnalysisMatchResults | null> => {
  const directory = windowManager.getDirectoryForSender(event.sender);
  if (directory === null) {
    throw new Error("No project open");
  }

  const validatedPhotos = photos.map((photo) => photoBodySchema.parse(photo));

  const settings = await getSettings();

  const selectedProviders = settings.analysisProviders.filter(
    ({ id, endpoint }) => settings.selectedAnalysisProviderIds.includes(id) && endpoint,
  );

  if (selectedProviders.length === 0) {
    throw new Error("Analysis provider is not configured.");
  }

  const providers = [];

  for (const selectedProvider of selectedProviders) {
    const token = await getToken(selectedProvider.id);

    if (!token) {
      throw new Error(
        `Analysis API token for "${selectedProvider.name}" is not configured or could not be decrypted.`,
      );
    }

    providers.push({
      name: selectedProvider.name,
      endpoint: selectedProvider.endpoint,
      token,
    });
  }

  /**
   * Key the analysis lifecycle by the renderer's webContents id so project and edit window analyses
   * are independent. Resolving via `getProjectWindowForSender` would collapse them onto the same
   * key (parent project window) and they would abort each other silently.
   */
  return analyseMatches({
    windowId: event.sender.id,
    directory,
    photos: validatedPhotos,
    providers,
  });
};

export const handleCancelAnalyseMatches = (event: Electron.IpcMainEvent): void => {
  cancelAnalyseMatches(event.sender.id);
};

export const handleGetEncryptionAvailability = (): boolean => isEncryptionAvailable();

export const registerAnalysisHandlers = (ipcMain: Electron.IpcMain): void => {
  ipcMain.handle(IPC_EVENTS.SAVE_ANALYSIS_PROVIDER, handleSaveAnalysisProvider);
  ipcMain.handle(IPC_EVENTS.DELETE_ANALYSIS_PROVIDER, handleDeleteAnalysisProvider);
  ipcMain.handle(IPC_EVENTS.ANALYSE_MATCHES, handleAnalyseMatches);
  ipcMain.handle(IPC_EVENTS.GET_ENCRYPTION_AVAILABILITY, handleGetEncryptionAvailability);
  ipcMain.on(IPC_EVENTS.CANCEL_ANALYSE_MATCHES, handleCancelAnalyseMatches);
};
