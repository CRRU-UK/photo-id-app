import { useEffect, useState } from "react";

import {
  AiModelIcon,
  EyeClosedIcon,
  EyeIcon,
  KeyIcon,
  LinkIcon,
  PencilIcon,
} from "@primer/octicons-react";
import { Dialog, FormControl, Stack, TextInput } from "@primer/react";

import type { MLModel, MLModelDraft } from "@/types";

interface ModelOverlayProps {
  open: boolean;
  onClose: () => void;
  editingModel?: MLModel | null;
}

type ModelFields = {
  name: string;
  endpoint: string;
  token: string;
};

const emptyFields = (): ModelFields => ({ name: "", endpoint: "", token: "" });

const ModelOverlay = ({ open, onClose, editingModel }: ModelOverlayProps) => {
  const [draft, setDraft] = useState<ModelFields>(emptyFields);
  const [showToken, setShowToken] = useState(false);
  const [isEditingToken, setIsEditingToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!editingModel;
  const tokenLocked = isEditing && !isEditingToken;
  const fieldsValid = tokenLocked
    ? draft.name.trim() && draft.endpoint.trim()
    : draft.name.trim() && draft.endpoint.trim() && draft.token.trim();

  useEffect(() => {
    if (open) {
      setDraft({
        name: editingModel?.name ?? "",
        endpoint: editingModel?.endpoint ?? "",
        token: "",
      });
      setShowToken(false);
      setIsEditingToken(false);
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
      token: tokenLocked ? undefined : draft.token.trim() || undefined,
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

        <FormControl required={!tokenLocked}>
          <FormControl.Label>API Token</FormControl.Label>
          {tokenLocked ? (
            <TextInput
              type="password"
              size="large"
              value=""
              placeholder="••••••••••••"
              readOnly
              leadingVisual={KeyIcon}
              trailingAction={
                <TextInput.Action
                  aria-label="Edit token"
                  icon={PencilIcon}
                  variant="default"
                  onClick={() => setIsEditingToken(true)}
                />
              }
              block
            />
          ) : (
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
          )}
          <FormControl.Caption>
            {tokenLocked
              ? "A token is currently saved. Click the edit icon to replace it."
              : "Tokens cannot be viewed after saving."}
          </FormControl.Caption>
        </FormControl>
      </Stack>
    </Dialog>
  );
};

export default ModelOverlay;
