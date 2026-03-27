import * as Sentry from "@sentry/electron/main";
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

import { DEFAULT_SETTINGS, SETTINGS_FILE_NAME } from "@/constants";
import { settingsDataSchema } from "@/schemas";
import type { MLModel, SettingsData, Telemetry } from "@/types";

const getSettingsFilePath = (): string => path.join(app.getPath("userData"), SETTINGS_FILE_NAME);

/**
 * Gets the current settings from the file, or returns defaults if the file doesn't exist. Falls
 * back to defaults when the file is missing, unreadable, or fails schema validation.
 */
const getSettings = async (): Promise<SettingsData> => {
  const settingsFile = getSettingsFilePath();

  if (!fs.existsSync(settingsFile)) {
    await updateSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  try {
    const data = await fs.promises.readFile(settingsFile, "utf8");
    const parsed = settingsDataSchema.parse(JSON.parse(data));

    return parsed;
  } catch (error) {
    console.error("Error reading settings file:", error);

    await updateSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
};

/**
 * Updates the settings file with new settings.
 */
const updateSettings = async (settings: SettingsData): Promise<void> => {
  const settingsFile = getSettingsFilePath();

  await fs.promises.writeFile(settingsFile, JSON.stringify(settings, null, 2), "utf8");
};

/**
 * Reads the telemetry setting synchronously from the settings file. Used before app ready for
 * Sentry initialisation, where async I/O is not available. Returns the default telemetry value
 * ("disabled") if the file is missing, unreadable, or fails validation.
 */
const getTelemetrySync = (): Telemetry => {
  try {
    const settingsFile = path.join(app.getPath("userData"), SETTINGS_FILE_NAME);

    if (!fs.existsSync(settingsFile)) {
      return DEFAULT_SETTINGS.telemetry;
    }

    const data = fs.readFileSync(settingsFile, "utf8");
    const parsed = settingsDataSchema.parse(JSON.parse(data));

    return parsed.telemetry;
  } catch {
    return DEFAULT_SETTINGS.telemetry;
  }
};

/**
 * Initialises Sentry. Must be called before the Electron app `ready` event. Reads the telemetry
 * setting synchronously to determine whether Sentry should be enabled. The SDK only sets up
 * integrations when `enabled` is true at init time, so this cannot be deferred/toggled.
 */
const initSentry = (): void => {
  if (!process.env.SENTRY_DSN) {
    console.debug("Sentry DSN is not defined");
    return;
  }

  const telemetry = getTelemetrySync();

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    enabled: telemetry === "enabled",
    integrations: [Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] })],
    enableRendererProfiling: true,
    enableLogs: true,
  });
};

/**
 * Returns updated settings with the given model added or replaced (matched by ID).
 */
const upsertModel = (settings: SettingsData, modelId: string, metadata: MLModel): SettingsData => {
  const updatedModels = [...settings.mlModels];
  const existingIndex = updatedModels.findIndex(({ id }) => id === modelId);

  if (existingIndex >= 0) {
    updatedModels[existingIndex] = metadata;
  } else {
    updatedModels.push(metadata);
  }

  return { ...settings, mlModels: updatedModels };
};

/**
 * Returns updated settings with the given model removed. Clears selectedModelId if it matches.
 */
const removeModel = (settings: SettingsData, modelId: string): SettingsData => {
  const updatedModels = settings.mlModels.filter(({ id }) => id !== modelId);
  const updatedSelectedModelId =
    settings.selectedModelId === modelId ? null : settings.selectedModelId;

  return { ...settings, mlModels: updatedModels, selectedModelId: updatedSelectedModelId };
};

/**
 * Gets settings suitable for sending to the renderer. Tokens are never included.
 */
const getSettingsForRenderer = async (): Promise<SettingsData> => {
  return getSettings();
};

export {
  getSettings,
  getSettingsForRenderer,
  getTelemetrySync,
  initSentry,
  removeModel,
  updateSettings,
  upsertModel,
};
