import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

import { DEFAULT_SETTINGS, SETTINGS_FILE_NAME } from "@/constants";
import type { SettingsData } from "@/types";

const userDataPath = app.getPath("userData");
const settingsFile = path.join(userDataPath, SETTINGS_FILE_NAME);

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

    return { ...DEFAULT_SETTINGS, ...settings };
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
  await fs.promises.writeFile(settingsFile, JSON.stringify(settings, null, 2), "utf8");
};

export { getSettings, updateSettings };
