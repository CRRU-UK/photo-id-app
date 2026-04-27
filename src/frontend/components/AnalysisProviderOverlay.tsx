import {
  AiModelIcon,
  EyeClosedIcon,
  EyeIcon,
  KeyIcon,
  LinkIcon,
  PencilIcon,
} from "@primer/octicons-react";
import { Dialog, FormControl, Stack, TextInput } from "@primer/react";
import { useEffect, useState } from "react";

import type { AnalysisProvider, AnalysisProviderDraft } from "@/types";

interface AnalysisProviderOverlayProps {
  editingProvider?: AnalysisProvider | null;
  onClose: () => void;
  open: boolean;
}

type ProviderFields = {
  name: string;
  endpoint: string;
  token: string;
};

const emptyFields = (): ProviderFields => ({ name: "", endpoint: "", token: "" });

const AnalysisProviderOverlay = ({
  open,
  onClose,
  editingProvider,
}: AnalysisProviderOverlayProps) => {
  const [draft, setDraft] = useState<ProviderFields>(emptyFields);
  const [showToken, setShowToken] = useState(false);
  const [isEditingToken, setIsEditingToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEditing = !!editingProvider;
  const tokenLocked = isEditing && !isEditingToken;
  const fieldsValid = tokenLocked
    ? Boolean(draft.name.trim() && draft.endpoint.trim())
    : Boolean(draft.name.trim() && draft.endpoint.trim() && draft.token.trim());

  useEffect(() => {
    if (open) {
      setDraft({
        name: editingProvider?.name ?? "",
        endpoint: editingProvider?.endpoint ?? "",
        token: "",
      });
      setShowToken(false);
      setIsEditingToken(false);
    }
  }, [open, editingProvider]);

  if (!open) {
    return null;
  }

  const handleSave = async () => {
    setIsSaving(true);

    const providerDraft: AnalysisProviderDraft = {
      ...(editingProvider ? { id: editingProvider.id } : {}),
      name: draft.name.trim(),
      endpoint: draft.endpoint.trim(),
      token: tokenLocked ? undefined : draft.token.trim() || undefined,
    };

    try {
      await window.electronAPI.saveAnalysisProvider(providerDraft);
      onClose();
    } catch (error) {
      console.error("Error saving analysis provider:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
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
      onClose={onClose}
      position="right"
      title={isEditing ? "Edit Provider" : "Add Provider"}
    >
      <Stack direction="vertical" gap="spacious" padding="spacious">
        <FormControl required>
          <FormControl.Label>Provider name</FormControl.Label>
          <TextInput
            block
            leadingVisual={AiModelIcon}
            onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="e.g. Analysis Provider v1"
            size="large"
            value={draft.name}
          />
          <FormControl.Caption>
            Label shown in the app to identify this provider.
          </FormControl.Caption>
        </FormControl>

        <FormControl required>
          <FormControl.Label>API URL</FormControl.Label>
          <TextInput
            block
            leadingVisual={LinkIcon}
            onChange={(event) => setDraft((prev) => ({ ...prev, endpoint: event.target.value }))}
            placeholder="https://api.example.com"
            size="large"
            value={draft.endpoint}
          />
          <FormControl.Caption>Base URL of your provider API.</FormControl.Caption>
        </FormControl>

        <FormControl required={!tokenLocked}>
          <FormControl.Label>API Token</FormControl.Label>
          {tokenLocked ? (
            <TextInput
              block
              leadingVisual={KeyIcon}
              placeholder="••••••••••••"
              readOnly
              size="large"
              trailingAction={
                <TextInput.Action
                  aria-label="Edit token"
                  icon={PencilIcon}
                  onClick={() => setIsEditingToken(true)}
                  variant="default"
                />
              }
              value=""
            />
          ) : (
            <TextInput
              block
              leadingVisual={KeyIcon}
              onChange={(event) => setDraft((prev) => ({ ...prev, token: event.target.value }))}
              size="large"
              trailingAction={
                <TextInput.Action
                  aria-label={showToken ? "Hide token" : "Show token"}
                  icon={showToken ? EyeIcon : EyeClosedIcon}
                  onClick={() => setShowToken((prev) => !prev)}
                />
              }
              type={showToken ? "text" : "password"}
              value={draft.token}
            />
          )}
          <FormControl.Caption>
            {tokenLocked
              ? "A token is currently saved and cannot be viewed. Select the edit icon to replace it."
              : "Tokens cannot be viewed after saving."}
          </FormControl.Caption>
        </FormControl>
      </Stack>
    </Dialog>
  );
};

export default AnalysisProviderOverlay;
