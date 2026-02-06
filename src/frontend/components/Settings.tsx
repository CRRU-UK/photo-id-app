import type { ChangeEvent, RefObject } from "react";
import { useEffect, useState } from "react";

import { Dialog, FormControl, Select, Stack } from "@primer/react";

import type { SettingsData, Telemetry, ThemeMode } from "@/types";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  onOpenRequest?: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const Settings = ({ open, onClose, onOpenRequest, returnFocusRef }: SettingsProps) => {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!onOpenRequest) {
      return;
    }

    return window.electronAPI.onOpenSettings(onOpenRequest);
  }, [onOpenRequest]);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    try {
      const loadedSettings = await window.electronAPI.getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleClose = () => {
    setSettings(null);
    onClose();
  };

  const handleSave = async () => {
    if (!settings) {
      return;
    }

    setIsLoading(true);
    try {
      await window.electronAPI.updateSettings(settings);
      onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeModeChange = (value: string) => {
    if (settings) {
      setSettings({ ...settings, themeMode: value as ThemeMode });
    }
  };

  const handleTelemetryChange = (value: string) => {
    if (settings) {
      setSettings({ ...settings, telemetry: value as Telemetry });
    }
  };

  if (!open) {
    return null;
  }

  return (
    <Dialog
      title="Settings"
      onClose={handleClose}
      returnFocusRef={returnFocusRef ?? undefined}
      footerButtons={[
        { buttonType: "default", content: "Cancel", onClick: handleClose },
        {
          buttonType: "primary",
          content: "Save",
          onClick: (): void => {
            void handleSave();
          },
          disabled: isLoading || !settings,
        },
      ]}
      width="xlarge"
    >
      {settings && (
        <Stack direction="vertical" gap="spacious">
          <FormControl>
            <FormControl.Label>Theme Mode</FormControl.Label>
            <Select
              size="large"
              value={settings.themeMode}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                handleThemeModeChange(event.target.value)
              }
            >
              <Select.Option value="light">Light</Select.Option>
              <Select.Option value="dark">Dark</Select.Option>
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
              value={settings.telemetry}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                handleTelemetryChange(event.target.value)
              }
            >
              <Select.Option value="disabled">Disabled</Select.Option>
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
