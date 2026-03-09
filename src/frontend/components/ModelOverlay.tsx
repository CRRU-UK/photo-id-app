import { useEffect, useState } from "react";

import { AiModelIcon, EyeClosedIcon, EyeIcon, KeyIcon, LinkIcon } from "@primer/octicons-react";
import { Dialog, FormControl, Stack, TextInput } from "@primer/react";

import type { MLModel, MLModelDraft } from "@/types";

interface ModelOverlayProps {
  open: boolean;
  onClose: () => void;
  editingModel?: MLModel | null;
}

type ModelFields = Pick<MLModelDraft, "name" | "endpoint" | "token">;

const emptyFields = (): ModelFields => ({ name: "", endpoint: "", token: "" });

const ModelOverlay = ({ open, onClose, editingModel }: ModelOverlayProps) => {
  const [draft, setDraft] = useState<ModelFields>(emptyFields);
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!editingModel;
  const fieldsValid = draft.name.trim() && draft.endpoint.trim() && draft.token.trim();

  useEffect(() => {
    if (open) {
      setDraft({
        name: editingModel?.name ?? "",
        endpoint: editingModel?.endpoint ?? "",
        token: "",
      });
      setShowToken(false);
    }
  }, [open, editingModel]);

  if (!open) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);

    const modelDraft: MLModelDraft = {
      ...(editingModel ? { id: editingModel.id } : {}),
      name: draft.name.trim(),
      endpoint: draft.endpoint.trim(),
      token: draft.token.trim(),
    };

    try {
      await window.electronAPI.saveModel(modelDraft);
      onClose();
    } catch (error) {
      console.error("Error saving model:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      title={isEditing ? "Edit Model" : "Add Model"}
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
            placeholder={isEditing ? "••••••" : ""}
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
          <FormControl.Caption>
            API token used for bearer authorization. Tokens cannot be retrieved after saving.
          </FormControl.Caption>
        </FormControl>
      </Stack>
    </Dialog>
  );
};

export default ModelOverlay;
