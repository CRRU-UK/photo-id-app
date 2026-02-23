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

/**
 * Initialises Sentry in the renderer.
 */
const initializeSentry = () => {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string;

  if (!sentryDsn) {
    console.debug("Sentry is disabled in renderer");
    return;
  }

  if (Sentry.getClient()) {
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    enabled: true,
    telemetry: false,
    tracesSampleRate: 1,
    profilesSampleRate: 1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.browserProfilingIntegration(),
      Sentry.replayIntegration({
        blockAllMedia: true,
        maskAllInputs: true,
        maskAllText: true,
        block: ["canvas", ".canvas-photo", ".canvas-loupe"],
      }),
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ],
    _experiments: { enableLogs: true },
  });
};

/**
 * Applies the telemetry preference to the renderer's Sentry client.
 */
const setRendererSentryEnabled = (enabled: boolean) => {
  const client = Sentry.getClient();

  if (client) {
    client.getOptions().enabled = enabled;
  }
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

  const applyTelemetryPreference = useCallback((telemetry: "enabled" | "disabled") => {
    if (telemetry === "enabled") {
      initializeSentry();
      setRendererSentryEnabled(true);
    } else {
      setRendererSentryEnabled(false);
    }
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings = await window.electronAPI.getSettings();

        setSettings(loadedSettings);
        applySettingsToTheme(loadedSettings);
        applyTelemetryPreference(loadedSettings.telemetry);
      } catch (error) {
        console.error("Error loading settings:", error);

        setSettings(DEFAULT_SETTINGS);
        applySettingsToTheme(DEFAULT_SETTINGS);
        applyTelemetryPreference(DEFAULT_SETTINGS.telemetry);
      }
    };

    loadSettings();

    const unsubscribe = window.electronAPI.onSettingsUpdated((updatedSettings: SettingsData) => {
      setSettings(updatedSettings);
      applySettingsToTheme(updatedSettings);
      applyTelemetryPreference(updatedSettings.telemetry);
    });

    return () => {
      unsubscribe();
    };
  }, [applySettingsToTheme, applyTelemetryPreference]);

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
