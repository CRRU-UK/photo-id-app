import type { RefObject } from "react";
import { useEffect } from "react";

import { Dialog } from "@primer/react/experimental";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  onOpenRequest?: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const Settings = ({ open, onClose, onOpenRequest, returnFocusRef }: SettingsProps) => {
  useEffect(() => {
    if (!onOpenRequest) {
      return;
    }

    return window.electronAPI.onOpenSettings(onOpenRequest);
  }, [onOpenRequest]);

  const handleClose = () => onClose();

  const handleSave = () => {
    onClose();
    // Save logic can be hooked up here later.
  };

  if (!open) {
    return null;
  }

  return (
    <Dialog
      title="Settings"
      onClose={handleClose}
      returnFocusRef={returnFocusRef ?? undefined}
      footerButtons={[
        { buttonType: "default", content: "Close", onClick: handleClose },
        { buttonType: "primary", content: "Save", onClick: handleSave },
      ]}
      width="xlarge"
      className="settings"
    >
      <p>Settings content will go here.</p>
    </Dialog>
  );
};

export default Settings;
