import "@primer/primitives/dist/css/base/motion/motion.css";
import "@primer/primitives/dist/css/functional/size/border.css";
import "@primer/primitives/dist/css/functional/size/size.css";
import "@primer/primitives/dist/css/functional/themes/dark.css";
import "@primer/primitives/dist/css/functional/themes/light.css";
import "@primer/primitives/dist/css/primitives.css";

import { BaseStyles, ThemeProvider } from "@primer/react";
import * as Sentry from "@sentry/electron/renderer";
import { RouterProvider, createHashHistory, createRouter } from "@tanstack/react-router";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import type { SettingsData, ThemeMode } from "@/types";

import { routeTree } from "./routeTree.gen";

import "./styles.css";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN as string,
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

const memoryHistory = createHashHistory();
const router = createRouter({ routeTree, history: memoryHistory });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

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

const App = () => {
  const [colorMode, setColorMode] = useState<"light" | "dark">("dark");
  const [settings, setSettings] = useState<SettingsData | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings = await window.electronAPI.getSettings();
        setSettings(loadedSettings);
        const effectiveMode = getEffectiveColorMode(loadedSettings.themeMode);
        setColorMode(effectiveMode);
        applyTheme(effectiveMode);
      } catch (error) {
        console.error("Error loading settings:", error);
        // Default to dark if settings can't be loaded
        applyTheme("dark");
      }
    };

    loadSettings();

    // Listen for settings updates
    const unsubscribe = window.electronAPI.onSettingsUpdated((updatedSettings: SettingsData) => {
      setSettings(updatedSettings);
      const effectiveMode = getEffectiveColorMode(updatedSettings.themeMode);
      setColorMode(effectiveMode);
      applyTheme(effectiveMode);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Listen for system theme changes when in auto mode
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

  return (
    <StrictMode>
      <ThemeProvider colorMode={colorMode}>
        <BaseStyles>
          <RouterProvider router={router} />
        </BaseStyles>
      </ThemeProvider>
    </StrictMode>
  );
};

const container = document.getElementById("root") as HTMLDivElement;
const root = createRoot(container);

root.render(<App />);
