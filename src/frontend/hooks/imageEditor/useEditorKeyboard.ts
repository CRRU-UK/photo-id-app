import { useCallback, useEffect } from "react";

import { EDITOR_KEYS, type EditorPanDirection, KEYBOARD_CODE_TO_PAN_DIRECTION } from "@/constants";
import type { EditorNavigation } from "@/types";

const isInteractiveTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLButtonElement ||
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement;

interface UseEditorKeyboardOptions {
  analysisOverlayOpen: boolean;
  onAnalyse: () => void;
  onCloseAnalysis: () => void;
  onDirectionalPan: (direction: EditorPanDirection) => void;
  onNavigate: (direction: EditorNavigation) => void;
  onReset: () => void;
  onSave: () => void;
  onToggleEdgeDetection: () => void;
  onToggleLoupe: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

/**
 * Wires up the editor's global keydown handlers (modifier shortcuts, plain shortcuts, and the
 * analysis-overlay close shortcut). All handlers run on `document` because the canvas does not
 * always have focus when a key is pressed.
 */
export const useEditorKeyboard = ({
  analysisOverlayOpen,
  onAnalyse,
  onCloseAnalysis,
  onDirectionalPan,
  onNavigate,
  onReset,
  onSave,
  onToggleEdgeDetection,
  onToggleLoupe,
  onZoomIn,
  onZoomOut,
}: UseEditorKeyboardOptions): void => {
  const handleModifierShortcut = useCallback(
    (key: string): boolean => {
      const modifierActions: Record<string, () => void> = {
        [EDITOR_KEYS.RESET.code]: onReset,
        [EDITOR_KEYS.SAVE.code]: onSave,
        [EDITOR_KEYS.ZOOM_OUT.code]: onZoomOut,
        [EDITOR_KEYS.ZOOM_IN.code]: onZoomIn,
        [EDITOR_KEYS.ANALYSE.code]: onAnalyse,
      };

      const action = modifierActions[key];
      if (!action) {
        return false;
      }

      action();
      return true;
    },
    [onReset, onSave, onZoomOut, onZoomIn, onAnalyse],
  );

  const handlePlainShortcut = useCallback(
    (event: KeyboardEvent): boolean => {
      const key = event.key.toLowerCase();

      const panDirection = KEYBOARD_CODE_TO_PAN_DIRECTION?.[event.code];
      if (panDirection) {
        onDirectionalPan(panDirection);
        return true;
      }

      if (key === EDITOR_KEYS.PREVIOUS_PHOTO.code) {
        onNavigate("prev");
        return true;
      }

      if (key === EDITOR_KEYS.NEXT_PHOTO.code) {
        onNavigate("next");
        return true;
      }

      if (event.code === EDITOR_KEYS.TOGGLE_LOUPE.code && !isInteractiveTarget(event.target)) {
        onToggleLoupe();
        return true;
      }

      if (key === EDITOR_KEYS.TOGGLE_EDGE_DETECTION.code) {
        onToggleEdgeDetection();
        return true;
      }

      return false;
    },
    [onDirectionalPan, onNavigate, onToggleLoupe, onToggleEdgeDetection],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const modifierKey = event.ctrlKey || event.metaKey;
      const handled = modifierKey
        ? handleModifierShortcut(event.key.toLowerCase())
        : handlePlainShortcut(event);

      if (handled) {
        event.preventDefault();
      }
    },
    [handleModifierShortcut, handlePlainShortcut],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Cmd/Ctrl+W closes the analysis overlay if it is open, instead of closing the window
  useEffect(() => {
    const handleCloseShortcut = (event: KeyboardEvent) => {
      const modifierKey = event.ctrlKey || event.metaKey;
      if (!modifierKey || event.key.toLowerCase() !== "w") {
        return;
      }

      if (analysisOverlayOpen) {
        event.preventDefault();
        onCloseAnalysis();
      }
    };

    document.addEventListener("keydown", handleCloseShortcut);
    return () => {
      document.removeEventListener("keydown", handleCloseShortcut);
    };
  }, [analysisOverlayOpen, onCloseAnalysis]);
};
