import type { RefObject } from "react";
import { useEffect, useState } from "react";

import { AiModelIcon, GearIcon, PlusIcon, TrashIcon } from "@primer/octicons-react";
import { Button, Dialog, FormControl, IconButton, Link, Select, Stack, Text } from "@primer/react";
import { Blankslate, UnderlinePanels } from "@primer/react/experimental";

import { useSettings } from "@/contexts/SettingsContext";
import type { MLModel, Telemetry, ThemeMode } from "@/types";

import AddModelOverlay from "./AddModelOverlay";

const EmptyModels = (
  <Blankslate narrow>
    <Blankslate.Visual>
      <AiModelIcon size="medium" />
    </Blankslate.Visual>
    <Blankslate.Heading>No ML Models Configured</Blankslate.Heading>
    <Blankslate.Description>
      Use a machine learning model to analyse photos in a stack. Click the Add Model button to get
      started.
      <Button
        block
        variant="link"
        onClick={() => window.electronAPI.openExternalLink("user-guide-ml")}
        style={{ marginTop: "var(--stack-gap-normal)" }}
      >
        View documentation
      </Button>
    </Blankslate.Description>
  </Blankslate>
);

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  onOpenRequest?: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const SettingsOverlay = ({ open, onClose, onOpenRequest, returnFocusRef }: SettingsProps) => {
  const { settings: contextSettings, updateSettings } = useSettings();

  const [isLoading, setIsLoading] = useState(false);
  const [isAddModelOpen, setIsAddModelOpen] = useState(false);

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

  const handleDeleteModel = async (model: MLModel) => {
    if (!contextSettings) {
      return;
    }

    try {
      await updateSettings({
        ...contextSettings,
        mlModels: contextSettings.mlModels.filter((m) => m.id !== model.id),
        selectedModelId:
          contextSettings.selectedModelId === model.id ? null : contextSettings.selectedModelId,
      });
    } catch (error) {
      console.error("Error deleting model:", error);
    }
  };

  if (!open) {
    return null;
  }

  const mlModels = contextSettings?.mlModels ?? [];

  return (
    <>
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
                    onChange={(event) => void handleThemeModeChange(event.target.value)}
                    disabled={isLoading}
                  >
                    <Select.Option value="light">Light</Select.Option>
                    <Select.Option value="dark">Dark (Default)</Select.Option>
                    <Select.Option value="auto">Auto</Select.Option>
                  </Select>
                  <FormControl.Caption>
                    Choose your preferred theme. &quot;Auto&quot; will follow your system
                    preference.
                  </FormControl.Caption>
                </FormControl>

                <FormControl>
                  <FormControl.Label>Telemetry</FormControl.Label>
                  <Select
                    size="large"
                    value={contextSettings.telemetry}
                    onChange={(event) => void handleTelemetryChange(event.target.value)}
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
              <Stack direction="vertical" gap="none" padding="spacious">
                <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: "12px" }}>
                  <Button
                    onClick={() => setIsAddModelOpen(true)}
                    variant="primary"
                    leadingVisual={PlusIcon}
                  >
                    Add Model
                  </Button>
                </div>

                {mlModels.length === 0 ? (
                  EmptyModels
                ) : (
                  <Stack direction="vertical" gap="none">
                    {mlModels.map((model) => (
                      <Stack
                        key={model.id}
                        direction="horizontal"
                        gap="condensed"
                        padding="normal"
                        align="center"
                        justify="start"
                        className="ml-list-row"
                      >
                        <Stack direction="vertical" gap="none" style={{ width: "100%" }}>
                          <Text weight="semibold" size="medium">
                            {model.name}
                          </Text>
                          <Text
                            size="small"
                            style={{
                              fontFamily: "var(--fontStack-monospace)",
                              color: "var(--fgColor-muted)",
                            }}
                          >
                            {model.endpoint}
                          </Text>
                        </Stack>

                        <IconButton
                          aria-label={`Delete ${model.name}`}
                          icon={TrashIcon}
                          variant="danger"
                          size="small"
                          onClick={() => void handleDeleteModel(model)}
                        />
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Stack>
            </UnderlinePanels.Panel>
          </UnderlinePanels>
        )}
      </Dialog>

      <AddModelOverlay open={isAddModelOpen} onClose={() => setIsAddModelOpen(false)} />
    </>
  );
};

export default SettingsOverlay;
