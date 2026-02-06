import type { ChangeEvent, RefObject } from "react";
import { useEffect, useState } from "react";

import { Dialog, FormControl } from "@primer/react";

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
      className="settings"
    >
      {settings && (
        <FormControl>
          <FormControl.Label>Theme Mode</FormControl.Label>
          <select
            value={settings.themeMode}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              handleThemeModeChange(event.target.value)
            }
            style={{
              width: "100%",
              padding:
                "var(--control-medium-size, 32px) var(--control-medium-paddingInline-normal, 12px)",
              fontSize: "var(--text-body-size-medium, 14px)",
              border: "1px solid var(--borderColor-default)",
              borderRadius: "var(--borderRadius-medium, 6px)",
              backgroundColor: "var(--bgColor-default)",
              color: "var(--fgColor-default)",
            }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
          <FormControl.Caption>
            Choose your preferred theme. &quot;Auto&quot; will follow your system preference.
          </FormControl.Caption>
        </FormControl>
      )}
    </Dialog>
  );
};

export default Settings;
