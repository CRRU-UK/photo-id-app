import * as Sentry from "@sentry/electron/main";
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

import { DEFAULT_SETTINGS, SETTINGS_FILE_NAME } from "@/constants";
import { settingsDataSchema, telemetrySchema } from "@/schemas";
import type { SettingsData } from "@/types";

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
 * Initialises Sentry. Must be called before the Electron app `ready` event.
 */
const initSentry = (): void => {
  if (!process.env.SENTRY_DSN) {
    console.debug("Sentry DSN is not defined");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    enabled: true,
    integrations: [Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] })],
    enableRendererProfiling: true,
    _experiments: { enableLogs: true },
  });
};

/**
 * Enables or disables Sentry event sending on the live client.
 */
const setSentryEnabled = (enabled: z.infer<typeof telemetrySchema>): void => {
  const client = Sentry.getClient();

  if (client) {
    client.getOptions().enabled = enabled === "enabled";
    console.debug(`Sentry has been ${enabled} at runtime`);
  }
};

export { getSettings, initSentry, setSentryEnabled, updateSettings };
