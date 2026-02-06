import type { ChangeEvent, RefObject } from "react";
import { useEffect, useState } from "react";

import { Dialog, FormControl, Select } from "@primer/react";

import type { SettingsData, ThemeMode } from "@/types";

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
      )}
    </Dialog>
  );
};

export default Settings;
