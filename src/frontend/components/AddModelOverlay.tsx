import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";

import { EyeClosedIcon, EyeIcon } from "@primer/octicons-react";
import { Dialog, FormControl, Stack, TextInput } from "@primer/react";

import { useSettings } from "@/contexts/SettingsContext";
import type { MLModel } from "@/types";

interface AddModelOverlayProps {
  open: boolean;
  onClose: () => void;
}

type ModelDraft = Pick<MLModel, "name" | "endpoint" | "apiKey">;

const emptyDraft = (): ModelDraft => ({ name: "", endpoint: "", apiKey: "" });

const AddModelOverlay = ({ open, onClose }: AddModelOverlayProps) => {
  const { settings: contextSettings, updateSettings } = useSettings();
  const [draft, setDraft] = useState<ModelDraft>(emptyDraft);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(emptyDraft());
      setShowApiKey(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSave = async () => {
    if (!contextSettings) {
      return;
    }

    setIsSaving(true);

    const newModel: MLModel = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      name: draft.name,
      endpoint: draft.endpoint,
      apiKey: draft.apiKey,
    };

    try {
      await updateSettings({
        ...contextSettings,
        mlModels: [...contextSettings.mlModels, newModel],
      });

      onClose();
    } catch (error) {
      console.error("Error saving model:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      title="Add Model"
      subtitle="Add a new machine learning model API."
      onClose={onClose}
      footerButtons={[
        { buttonType: "default", content: "Cancel", onClick: onClose },
        {
          buttonType: "primary",
          content: "Save",
          onClick: () => void handleSave(),
          loading: isSaving,
        },
      ]}
    >
      <Stack direction="vertical" gap="spacious" padding="spacious">
        <FormControl>
          <FormControl.Label>Model name</FormControl.Label>
          <TextInput
            size="large"
            value={draft.name}
            placeholder="e.g. MiewID"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraft((prev) => ({ ...prev, name: event.target.value }))
            }
            block
          />
          <FormControl.Caption>Label shown in the app to identify this model.</FormControl.Caption>
        </FormControl>

        <FormControl>
          <FormControl.Label>Model API URL</FormControl.Label>
          <TextInput
            size="large"
            value={draft.endpoint}
            placeholder="https://api.example.com"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraft((prev) => ({ ...prev, endpoint: event.target.value }))
            }
            block
          />
          <FormControl.Caption>Base URL of your model API.</FormControl.Caption>
        </FormControl>

        <FormControl>
          <FormControl.Label>API key</FormControl.Label>
          <TextInput
            type={showApiKey ? "text" : "password"}
            size="large"
            value={draft.apiKey}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraft((prev) => ({ ...prev, apiKey: event.target.value }))
            }
            trailingAction={
              <TextInput.Action
                aria-label={showApiKey ? "Hide API key" : "Show API key"}
                icon={showApiKey ? EyeIcon : EyeClosedIcon}
                onClick={() => setShowApiKey((prev) => !prev)}
              />
            }
            block
          />
          <FormControl.Caption>API token used for bearer authorization.</FormControl.Caption>
        </FormControl>
      </Stack>
    </Dialog>
  );
};

export default AddModelOverlay;
