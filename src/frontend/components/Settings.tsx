import type { ChangeEvent, RefObject } from "react";
import { useEffect, useState } from "react";

import { Dialog, FormControl, Link, Select, Stack } from "@primer/react";

import { useSettings } from "@/contexts/SettingsContext";
import type { Telemetry, ThemeMode } from "@/types";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  onOpenRequest?: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const Settings = ({ open, onClose, onOpenRequest, returnFocusRef }: SettingsProps) => {
  const { settings: contextSettings, updateSettings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!onOpenRequest) {
      return;
    }

    return window.electronAPI.onOpenSettings(onOpenRequest);
  }, [onOpenRequest]);

  const handleThemeModeChange = async (value: string) => {
    if (!contextSettings) {
      return;
    }

    setIsLoading(true);

    try {
      await updateSettings({
        ...contextSettings,
        themeMode: value as ThemeMode,
      });
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTelemetryChange = async (value: string) => {
    if (!contextSettings) {
      return;
    }

    setIsLoading(true);

    try {
      await updateSettings({
        ...contextSettings,
        telemetry: value as Telemetry,
      });
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <Dialog
      title="App Settings"
      subtitle="App settings are per-user and affect all projects."
      onClose={onClose}
      returnFocusRef={returnFocusRef ?? undefined}
      footerButtons={[{ buttonType: "default", content: "Close", onClick: onClose }]}
      width="xlarge"
    >
      {contextSettings && (
        <Stack direction="vertical" gap="spacious">
          <FormControl>
            <FormControl.Label>Theme Mode</FormControl.Label>
            <Select
              size="large"
              value={contextSettings.themeMode}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                void handleThemeModeChange(event.target.value)
              }
              disabled={isLoading}
            >
              <Select.Option value="light">Light</Select.Option>
              <Select.Option value="dark">Dark (Default)</Select.Option>
              <Select.Option value="auto">Auto</Select.Option>
            </Select>
            <FormControl.Caption>
              Choose your preferred theme. &quot;Auto&quot; will follow your system preference.
            </FormControl.Caption>
          </FormControl>

          <FormControl>
            <FormControl.Label>Telemetry</FormControl.Label>
            <Select
              size="large"
              value={contextSettings.telemetry}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                void handleTelemetryChange(event.target.value)
              }
              disabled={isLoading}
            >
              <Select.Option value="disabled">Disabled (Default)</Select.Option>
              <Select.Option value="enabled">Enabled</Select.Option>
            </Select>
            <FormControl.Caption>
              <b>Note: requires a restart of the app to take effect.</b> When enabled, helps us fix
              bugs by sending crash reports, error details, performance data, and session recordings
              that are captured only when an error occurs (not continuously). Please see our{" "}
              <Link
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  window.electronAPI.openExternalLink("privacy");
                }}
              >
                Privacy Policy
              </Link>{" "}
              for more information.
            </FormControl.Caption>
          </FormControl>
        </Stack>
      )}
    </Dialog>
  );
};

export default Settings;
