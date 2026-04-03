import {
  AiModelIcon,
  AlertIcon,
  GearIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@primer/octicons-react";
import {
  Banner,
  Button,
  Dialog,
  FormControl,
  IconButton,
  Link,
  Select,
  Stack,
  Text,
} from "@primer/react";
import { Blankslate, UnderlinePanels } from "@primer/react/experimental";
import type { RefObject } from "react";
import { useCallback, useEffect, useState } from "react";

import { useSettings } from "@/contexts/SettingsContext";
import type { MLModel, Telemetry, ThemeMode } from "@/types";

import ModelOverlay from "./ModelOverlay";

const EmptyModels = (
  <Blankslate narrow>
    <Blankslate.Visual>
      <AiModelIcon size="medium" />
    </Blankslate.Visual>
    <Blankslate.Heading>No ML Models Configured</Blankslate.Heading>
    <Blankslate.Description>
      Use a machine learning model to analyse photos in a stack. Select the Add Model button to get
      started.
      <Button
        block
        onClick={() => window.electronAPI.openExternalLink("user-guide-ml")}
        style={{ marginTop: "var(--stack-gap-normal)" }}
        variant="link"
      >
        View documentation
      </Button>
    </Blankslate.Description>
  </Blankslate>
);

interface SettingsProps {
  onClose: () => void;
  onOpenRequest?: () => void;
  open: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const SettingsOverlay = ({ open, onClose, onOpenRequest, returnFocusRef }: SettingsProps) => {
  const { settings: contextSettings, updateSettings } = useSettings();

  const [isLoading, setIsLoading] = useState(false);
  const [isModelOverlayOpen, setIsModelOverlayOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<MLModel | null>(null);
  const [isEncryptionAvailable, setIsEncryptionAvailable] = useState<boolean>(true);

  useEffect(() => {
    void window.electronAPI.getEncryptionAvailability().then(setIsEncryptionAvailable);
  }, []);

  useEffect(() => {
    if (!onOpenRequest) {
      return;
    }

    return window.electronAPI.onOpenSettings(onOpenRequest);
  }, [onOpenRequest]);

  useEffect(() => {
    if (!open) {
      setIsModelOverlayOpen(false);
      setEditingModel(null);
    }
  }, [open]);

  const handleThemeModeChange = useCallback(
    async (value: string) => {
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
    },
    [contextSettings, updateSettings],
  );

  const handleTelemetryChange = useCallback(
    async (value: string) => {
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
    },
    [contextSettings, updateSettings],
  );

  const handleDeleteModel = useCallback(async (model: MLModel) => {
    try {
      await window.electronAPI.deleteModel(model.id);
    } catch (error) {
      console.error("Error deleting model:", error);
    }
  }, []);

  const handleEditModel = useCallback((model: MLModel) => {
    setEditingModel(model);
    setIsModelOverlayOpen(true);
  }, []);

  const handleAddModel = useCallback(() => {
    setEditingModel(null);
    setIsModelOverlayOpen(true);
  }, []);

  const handleModelOverlayClose = useCallback(() => {
    setIsModelOverlayOpen(false);
    setEditingModel(null);
  }, []);

  if (!open) {
    return null;
  }

  const mlModels = contextSettings?.mlModels ?? [];

  return (
    <>
      <Dialog
        className="settings-overlay"
        footerButtons={[{ buttonType: "default", content: "Close", onClick: onClose }]}
        onClose={onClose}
        returnFocusRef={returnFocusRef ?? undefined}
        subtitle="App settings are per-user and affect all projects."
        title="App Settings"
        width="xlarge"
      >
        {contextSettings && (
          <UnderlinePanels aria-label="Select a tab">
            <UnderlinePanels.Tab icon={GearIcon}>General</UnderlinePanels.Tab>
            <UnderlinePanels.Tab icon={AiModelIcon}>Machine Learning</UnderlinePanels.Tab>

            <UnderlinePanels.Panel>
              <Stack direction="vertical" gap="spacious" padding="spacious">
                <FormControl disabled={isLoading}>
                  <FormControl.Label>Theme Mode</FormControl.Label>
                  <Select
                    onChange={(event) => void handleThemeModeChange(event.target.value)}
                    size="large"
                    value={contextSettings.themeMode}
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

                <FormControl disabled={isLoading}>
                  <FormControl.Label>Telemetry</FormControl.Label>
                  <Select
                    onChange={(event) => void handleTelemetryChange(event.target.value)}
                    size="large"
                    value={contextSettings.telemetry}
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
                {isEncryptionAvailable === false && (
                  <Banner
                    description="Secure storage is not available on this system."
                    hideTitle
                    leadingVisual={<AlertIcon size="small" />}
                    primaryAction={
                      <Banner.PrimaryAction
                        onClick={() => window.electronAPI.openExternalLink("user-guide-ml-tokens")}
                      >
                        View Details
                      </Banner.PrimaryAction>
                    }
                    style={{ marginBottom: "var(--stack-gap-spacious)" }}
                    title="Warning"
                    variant="warning"
                  />
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: "12px" }}>
                  <Button leadingVisual={PlusIcon} onClick={handleAddModel} variant="primary">
                    Add Model
                  </Button>
                </div>

                {mlModels.length === 0 ? (
                  EmptyModels
                ) : (
                  <Stack direction="vertical" gap="none">
                    {mlModels.map((model) => (
                      <Stack
                        align="center"
                        className="ml-list-row"
                        direction="horizontal"
                        gap="condensed"
                        justify="start"
                        key={model.id}
                        padding="normal"
                      >
                        <Stack direction="vertical" gap="none" style={{ width: "100%" }}>
                          <Text size="medium" weight="semibold">
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
                          aria-label={`Edit ${model.name}`}
                          icon={PencilIcon}
                          onClick={() => handleEditModel(model)}
                          size="small"
                          variant="default"
                        />

                        <IconButton
                          aria-label={`Delete ${model.name}`}
                          icon={TrashIcon}
                          onClick={() => void handleDeleteModel(model)}
                          size="small"
                          variant="danger"
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

      <ModelOverlay
        editingModel={editingModel}
        onClose={handleModelOverlayClose}
        open={isModelOverlayOpen}
      />
    </>
  );
};

export default SettingsOverlay;
