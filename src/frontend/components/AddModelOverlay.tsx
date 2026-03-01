import { useEffect, useState } from "react";

import { AiModelIcon, EyeClosedIcon, EyeIcon, KeyIcon, LinkIcon } from "@primer/octicons-react";
import { Dialog, FormControl, Stack, TextInput } from "@primer/react";

import { useSettings } from "@/contexts/SettingsContext";
import type { MLModel } from "@/types";

interface AddModelOverlayProps {
  open: boolean;
  onClose: () => void;
}

type ModelDraft = Pick<MLModel, "name" | "endpoint" | "token">;

const emptyDraft = (): ModelDraft => ({ name: "", endpoint: "", token: "" });

const AddModelOverlay = ({ open, onClose }: AddModelOverlayProps) => {
  const { settings: contextSettings, updateSettings } = useSettings();

  const [draft, setDraft] = useState<ModelDraft>(emptyDraft);
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fieldsValid = draft.name.trim() && draft.endpoint.trim() && draft.token.trim();

  useEffect(() => {
    if (open) {
      setDraft(emptyDraft());
      setShowToken(false);
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
      name: draft.name.trim(),
      endpoint: draft.endpoint.trim(),
      token: draft.token.trim(),
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
      position="right"
      onClose={onClose}
      footerButtons={[
        { buttonType: "default", content: "Cancel", onClick: onClose },
        {
          buttonType: "primary",
          content: "Save",
          onClick: () => void handleSave(),
          loading: isSaving,
          disabled: !fieldsValid,
        },
      ]}
    >
      <Stack direction="vertical" gap="spacious" padding="spacious">
        <FormControl required>
          <FormControl.Label>Model name</FormControl.Label>
          <TextInput
            size="large"
            value={draft.name}
            leadingVisual={AiModelIcon}
            placeholder="e.g. MiewID"
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            block
          />
          <FormControl.Caption>Label shown in the app to identify this model.</FormControl.Caption>
        </FormControl>

        <FormControl required>
          <FormControl.Label>API URL</FormControl.Label>
          <TextInput
            size="large"
            value={draft.endpoint}
            placeholder="https://api.example.com"
            leadingVisual={LinkIcon}
            onChange={(event) => setDraft((prev) => ({ ...prev, endpoint: event.target.value }))}
            block
          />
          <FormControl.Caption>Base URL of your model API.</FormControl.Caption>
        </FormControl>

        <FormControl required>
          <FormControl.Label>API Token</FormControl.Label>
          <TextInput
            type={showToken ? "text" : "password"}
            size="large"
            value={draft.token}
            leadingVisual={KeyIcon}
            onChange={(event) => setDraft((prev) => ({ ...prev, token: event.target.value }))}
            trailingAction={
              <TextInput.Action
                aria-label={showToken ? "Hide token" : "Show token"}
                icon={showToken ? EyeIcon : EyeClosedIcon}
                onClick={() => setShowToken((prev) => !prev)}
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
