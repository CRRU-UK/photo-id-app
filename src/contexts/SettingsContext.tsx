import * as Sentry from "@sentry/electron/renderer";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { DEFAULT_SETTINGS } from "@/constants";
import type { SettingsData, ThemeMode } from "@/types";

const initializeSentry = () => {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string;

  if (!sentryDsn) {
    console.debug("Sentry is disabled in renderer");
    return;
  }

  console.debug("Sentry is enabled in renderer");

  if (Sentry.getClient()) {
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    telemetry: false,
    tracesSampleRate: 1,
    profilesSampleRate: 1,
    replaysSessionSampleRate: 1,
    replaysOnErrorSampleRate: 1,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.browserProfilingIntegration(),
      Sentry.replayIntegration(),
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ],
    _experiments: { enableLogs: true },
  });
};

/**
 * Gets the effective color mode based on theme mode setting and system preference.
 */
const getEffectiveColorMode = (themeMode: ThemeMode): "light" | "dark" => {
  if (themeMode === "auto") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }

  return themeMode;
};

/**
 * Applies the theme to the document based on the color mode.
 */
const applyTheme = (colorMode: "light" | "dark") => {
  document.documentElement.dataset.colorMode = colorMode;
  document.documentElement.dataset.lightTheme = colorMode;
  document.documentElement.dataset.darkTheme = colorMode;
};

interface SettingsContextValue {
  settings: SettingsData | null;
  colorMode: "light" | "dark";
  updateSettings: (settings: SettingsData) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [colorMode, setColorMode] = useState<"light" | "dark">("dark");

  const applySettingsToTheme = useCallback((nextSettings: SettingsData) => {
    const effectiveMode = getEffectiveColorMode(nextSettings.themeMode);
    setColorMode(effectiveMode);
    applyTheme(effectiveMode);
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings = await window.electronAPI.getSettings();

        setSettings(loadedSettings);
        applySettingsToTheme(loadedSettings);

        if (loadedSettings.telemetry === "enabled") {
          initializeSentry();
        }
      } catch (error) {
        console.error("Error loading settings:", error);

        setSettings(DEFAULT_SETTINGS);
        applyTheme(getEffectiveColorMode(DEFAULT_SETTINGS.themeMode));
      }
    };

    loadSettings();

    const unsubscribe = window.electronAPI.onSettingsUpdated((updatedSettings: SettingsData) => {
      setSettings(updatedSettings);
      applySettingsToTheme(updatedSettings);
    });

    return () => {
      unsubscribe();
    };
  }, [applySettingsToTheme]);

  useEffect(() => {
    if (settings?.themeMode !== "auto") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = () => {
      const effectiveMode = getEffectiveColorMode("auto");
      setColorMode(effectiveMode);
      applyTheme(effectiveMode);
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [settings?.themeMode]);

  const updateSettings = useCallback(async (nextSettings: SettingsData) => {
    await window.electronAPI.updateSettings(nextSettings);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, colorMode, updateSettings }),
    [settings, colorMode, updateSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = (): SettingsContextValue => {
  const context = useContext(SettingsContext);

  if (context === null) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }

  return context;
};
