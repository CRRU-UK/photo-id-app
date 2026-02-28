import type { ChangeEvent, RefObject } from "react";
import { useEffect, useState } from "react";

import { AiModelIcon, GearIcon, InfoIcon } from "@primer/octicons-react";
import {
  Banner,
  Checkbox,
  Dialog,
  FormControl,
  Link,
  Select,
  Stack,
  TextInput,
} from "@primer/react";
import { UnderlinePanels } from "@primer/react/experimental";

import { ML_CANDIDATES } from "@/constants";
import { useSettings } from "@/contexts/SettingsContext";
import type { MLSettings, Telemetry, ThemeMode } from "@/types";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  onOpenRequest?: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const Settings = ({ open, onClose, onOpenRequest, returnFocusRef }: SettingsProps) => {
  const { settings: contextSettings, updateSettings } = useSettings();
  const [isLoading, setIsLoading] = useState(false);

  const [mlDraft, setMlDraft] = useState<MLSettings>({
    name: contextSettings?.ml?.name ?? "",
    endpoint: contextSettings?.ml?.endpoint ?? "",
    apiKey: contextSettings?.ml?.apiKey ?? "",
    candidates: contextSettings?.ml?.candidates ?? ML_CANDIDATES.DEFAULT,
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

    const ml: MLSettings = {
      ...draft,
      candidates: Math.min(
        ML_CANDIDATES.MAX,
        Math.max(ML_CANDIDATES.MIN, Math.round(draft.candidates)),
      ),
    };

    try {
      await updateSettings({ ...contextSettings, ml });
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
              <Banner
                hideTitle
                title="Info"
                leadingVisual={<InfoIcon />}
                description="Information about machine learning integration can be found in the documentation."
              />

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
                  Label shown in the sidebar to identify the active model.
                </FormControl.Caption>
              </FormControl>

              <FormControl>
                <FormControl.Label>Model API URL</FormControl.Label>
                <TextInput
                  size="large"
                  value={mlDraft.endpoint}
                  placeholder="https://api.example.com"
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
                  type="password"
                  size="large"
                  value={mlDraft.apiKey}
                  placeholder="sk-…"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setMlDraft((prev) => ({ ...prev, apiKey: event.target.value }))
                  }
                  onBlur={() => void handleMLSettingsSave()}
                  block
                />
                <FormControl.Caption>API token used for bearer authorization.</FormControl.Caption>
              </FormControl>

              <FormControl>
                <FormControl.Label>Candidates</FormControl.Label>
                <TextInput
                  type="number"
                  size="large"
                  value={String(mlDraft.candidates)}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    const parsed = parseInt(event.target.value, 10);
                    if (!isNaN(parsed)) {
                      setMlDraft((prev) => ({ ...prev, candidates: parsed }));
                    }
                  }}
                  onBlur={() => void handleMLSettingsSave()}
                  block
                />
                <FormControl.Caption>
                  Number of ranked candidates to request and show in the results. Results are
                  paginated in pages of 10.
                </FormControl.Caption>
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

export default Settings;
