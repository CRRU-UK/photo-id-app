import type { ChangeEvent, RefObject } from "react";
import { useEffect, useState } from "react";

import { Dialog, FormControl, Select, Stack } from "@primer/react";

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
      title="Settings"
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
              Choose whether to send anonymous usage data to help with fixing bugs and improving the
              app. Data is anonymized, including images used in session replays. <br />
              <br />
              <b>Note: This requires a restart of the app to take effect.</b>
            </FormControl.Caption>
          </FormControl>
        </Stack>
      )}
    </Dialog>
  );
};

export default Settings;
