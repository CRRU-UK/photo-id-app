import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

import { SETTINGS_FILE_NAME } from "@/constants";
import type { SettingsData } from "@/types";

const userDataPath = app.getPath("userData");
const settingsFile = path.join(userDataPath, SETTINGS_FILE_NAME);

const DEFAULT_SETTINGS: SettingsData = {
  themeMode: "auto",
  telemetry: "disabled",
};

/**
 * Gets the current settings from the file synchronously, or returns defaults if the file doesn't exist.
 * Used for early initialization (e.g., Sentry) before async operations are available.
 */
const getSettingsSync = (): SettingsData => {
  if (!fs.existsSync(settingsFile)) {
    return DEFAULT_SETTINGS;
  }

  try {
    const data = fs.readFileSync(settingsFile, "utf8");
    const settings = JSON.parse(data) as SettingsData;
    // Merge with defaults to ensure all settings exist even if file is missing some keys
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch (error) {
    console.error("Error reading settings file:", error);
    // If file is corrupted, return defaults
    return DEFAULT_SETTINGS;
  }
};

/**
 * Gets the current settings from the file, or returns defaults if the file doesn't exist.
 */
const getSettings = async (): Promise<SettingsData> => {
  if (!fs.existsSync(settingsFile)) {
    await updateSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  try {
    const data = await fs.promises.readFile(settingsFile, "utf8");
    const settings = JSON.parse(data) as SettingsData;
    // Merge with defaults to ensure all settings exist even if file is missing some keys
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch (error) {
    console.error("Error reading settings file:", error);
    // If file is corrupted, return defaults and recreate it
    await updateSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
};

/**
 * Updates the settings file with new settings.
 */
const updateSettings = async (settings: SettingsData): Promise<void> => {
  await fs.promises.writeFile(settingsFile, JSON.stringify(settings, null, 2), "utf8");
};

export { getSettings, getSettingsSync, updateSettings };
