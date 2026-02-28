import type { ChangeEvent, RefObject } from "react";
import { useEffect, useState } from "react";

import { AiModelIcon, EyeClosedIcon, EyeIcon, GearIcon } from "@primer/octicons-react";
import { Checkbox, Dialog, FormControl, Link, Select, Stack, TextInput } from "@primer/react";
import { UnderlinePanels } from "@primer/react/experimental";

import { useSettings } from "@/contexts/SettingsContext";
import type { MLSettings, Telemetry, ThemeMode } from "@/types";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  onOpenRequest?: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const SettingsOverlay = ({ open, onClose, onOpenRequest, returnFocusRef }: SettingsProps) => {
  const { settings: contextSettings, updateSettings } = useSettings();

  const [isLoading, setIsLoading] = useState(false);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [mlDraft, setMlDraft] = useState<MLSettings>({
    name: contextSettings?.ml?.name ?? "",
    endpoint: contextSettings?.ml?.endpoint ?? "",
    apiKey: contextSettings?.ml?.apiKey ?? "",
    includeHeatmap: contextSettings?.ml?.includeHeatmap ?? false,
  });

  useEffect(() => {
    if (!onOpenRequest) {
      return;
    }

    return window.electronAPI.onOpenSettings(onOpenRequest);
  }, [onOpenRequest]);

  useEffect(() => {
    if (!contextSettings?.ml) {
      return;
    }

    setMlDraft({ ...contextSettings.ml });
  }, [contextSettings?.ml]);

  const handleMLSettingsSave = async (draft: MLSettings = mlDraft) => {
    if (!contextSettings) {
      return;
    }

    try {
      await updateSettings({ ...contextSettings, ml: draft });
    } catch (error) {
      console.error("Error saving ML settings:", error);
    }
  };

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
      className="settings-overlay"
    >
      {contextSettings && (
        <UnderlinePanels aria-label="Select a tab">
          <UnderlinePanels.Tab icon={GearIcon}>General</UnderlinePanels.Tab>
          <UnderlinePanels.Tab icon={AiModelIcon}>Machine Learning</UnderlinePanels.Tab>

          <UnderlinePanels.Panel>
            <Stack direction="vertical" gap="spacious" padding="spacious">
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
                  When enabled, helps us fix bugs by sending crash reports, error details,
                  performance data, and session recordings that are captured only when an error
                  occurs (not continuously). Please see our{" "}
                  <Link
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
          </UnderlinePanels.Panel>

          <UnderlinePanels.Panel>
            <Stack direction="vertical" gap="spacious" padding="spacious">
              <FormControl>
                <FormControl.Label>Model name</FormControl.Label>
                <TextInput
                  size="large"
                  value={mlDraft.name}
                  placeholder="e.g. MiewID"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setMlDraft((prev) => ({ ...prev, name: event.target.value }))
                  }
                  onBlur={() => void handleMLSettingsSave()}
                  block
                />
                <FormControl.Caption>
                  Label shown in app to identify the active model.
                </FormControl.Caption>
              </FormControl>

              <FormControl>
                <FormControl.Label>Model API URL</FormControl.Label>
                <TextInput
                  size="large"
                  value={mlDraft.endpoint}
                  placeholder="https://api.example.com/model"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setMlDraft((prev) => ({ ...prev, endpoint: event.target.value }))
                  }
                  onBlur={() => void handleMLSettingsSave()}
                  block
                />
                <FormControl.Caption>Base URL of your model API.</FormControl.Caption>
              </FormControl>

              <FormControl>
                <FormControl.Label>API key</FormControl.Label>
                <TextInput
                  type={showApiKey ? "text" : "password"}
                  size="large"
                  value={mlDraft.apiKey}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setMlDraft((prev) => ({ ...prev, apiKey: event.target.value }))
                  }
                  onBlur={() => void handleMLSettingsSave()}
                  trailingAction={
                    <TextInput.Action
                      aria-label={showApiKey ? "Hide API key" : "Show API key"}
                      icon={showApiKey ? EyeIcon : EyeClosedIcon}
                      onClick={() => setShowApiKey(!showApiKey)}
                    />
                  }
                  block
                />
                <FormControl.Caption>API token used for bearer authorization.</FormControl.Caption>
              </FormControl>

              <FormControl>
                <Checkbox
                  checked={mlDraft.includeHeatmap}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    const newDraft = { ...mlDraft, includeHeatmap: event.target.checked };
                    setMlDraft(newDraft);
                    void handleMLSettingsSave(newDraft);
                  }}
                />
                <FormControl.Label>Request debug information</FormControl.Label>
                <FormControl.Caption>
                  When enabled, requests debug information (as an image) from the model API and will
                  display it in the results.
                </FormControl.Caption>
              </FormControl>
            </Stack>
          </UnderlinePanels.Panel>
        </UnderlinePanels>
      )}
    </Dialog>
  );
};

export default SettingsOverlay;
