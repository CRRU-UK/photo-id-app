import type { ChangeEvent, RefObject } from "react";
import { useEffect, useState } from "react";

import { Dialog, FormControl, Select, Stack } from "@primer/react";

import { useSettings } from "@/contexts/SettingsContext";
import type { SettingsData, Telemetry, ThemeMode } from "@/types";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  onOpenRequest?: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const Settings = ({ open, onClose, onOpenRequest, returnFocusRef }: SettingsProps) => {
  const { settings: contextSettings, updateSettings } = useSettings();
  const [draftSettings, setDraftSettings] = useState<SettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!onOpenRequest) {
      return;
    }

    return window.electronAPI.onOpenSettings(onOpenRequest);
  }, [onOpenRequest]);

  useEffect(() => {
    if (open && contextSettings) {
      setDraftSettings({ ...contextSettings });
    } else if (!open) {
      setDraftSettings(null);
    }
  }, [open, contextSettings]);

  const handleClose = () => {
    setDraftSettings(null);
    onClose();
  };

  const handleSave = async () => {
    if (!draftSettings) {
      return;
    }

    setIsLoading(true);

    try {
      await updateSettings(draftSettings);
      onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeModeChange = (value: string) => {
    if (draft) {
      setDraftSettings({ ...draft, themeMode: value as ThemeMode });
    }
  };

  const handleTelemetryChange = (value: string) => {
    if (draft) {
      setDraftSettings({ ...draft, telemetry: value as Telemetry });
    }
  };

  if (!open) {
    return null;
  }

  const draft = draftSettings ?? contextSettings;

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
          disabled: isLoading || !draft,
        },
      ]}
      width="xlarge"
    >
      {draft && (
        <Stack direction="vertical" gap="spacious">
          <FormControl>
            <FormControl.Label>Theme Mode</FormControl.Label>
            <Select
              size="large"
              value={draft.themeMode}
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
              value={draft.telemetry}
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
