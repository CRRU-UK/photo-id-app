import type { EditorNavigation } from "@/types";

import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CodescanIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "@primer/octicons-react";
import { Button, ButtonGroup, IconButton, Stack } from "@primer/react";
import { KeybindingHint } from "@primer/react/experimental";
import { memo, useCallback } from "react";

import { EDITOR_KEYS, EDITOR_TOOLTIPS, EditorPanDirection, IMAGE_FILTERS } from "@/constants";

import Slider from "@/frontend/components/Slider";

interface ToolbarProps {
  sliderInitials: {
    brightness: number;
    contrast: number;
    saturate: number;
  };
  resetKey: number;
  edgeDetectionEnabled: boolean;
  loupeEnabled: boolean;
  saving: boolean;
  onSetBrightness: (value: number) => void;
  onSetContrast: (value: number) => void;
  onSetSaturate: (value: number) => void;
  onDirectionalPan: (direction: EditorPanDirection) => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onToggleLoupe: () => void;
  onNavigate: (direction: EditorNavigation) => void;
  onReset: () => void;
  onSave: () => void;
}

const Toolbar = ({
  sliderInitials,
  resetKey,
  edgeDetectionEnabled,
  loupeEnabled,
  saving,
  onSetBrightness,
  onSetContrast,
  onSetSaturate,
  onDirectionalPan,
  onZoomOut,
  onZoomIn,
  onToggleLoupe,
  onNavigate,
  onReset,
  onSave,
}: ToolbarProps) => {
  const handlePanLeft = useCallback(
    () => onDirectionalPan(EditorPanDirection.LEFT),
    [onDirectionalPan],
  );
  const handlePanUp = useCallback(
    () => onDirectionalPan(EditorPanDirection.UP),
    [onDirectionalPan],
  );
  const handlePanDown = useCallback(
    () => onDirectionalPan(EditorPanDirection.DOWN),
    [onDirectionalPan],
  );
  const handlePanRight = useCallback(
    () => onDirectionalPan(EditorPanDirection.RIGHT),
    [onDirectionalPan],
  );

  const handleNavigatePrev = useCallback(() => onNavigate("prev"), [onNavigate]);
  const handleNavigateNext = useCallback(() => onNavigate("next"), [onNavigate]);

  return (
    <div className="toolbar">
      <Stack direction="horizontal" align="center" gap="condensed">
        <Slider
          key={`brightness-${resetKey}`}
          name="Brightness"
          initial={sliderInitials.brightness}
          min={IMAGE_FILTERS.BRIGHTNESS.MIN}
          max={IMAGE_FILTERS.BRIGHTNESS.MAX}
          disabled={edgeDetectionEnabled}
          callback={onSetBrightness}
        />
        <Slider
          key={`contrast-${resetKey}`}
          name="Contrast"
          initial={sliderInitials.contrast}
          min={IMAGE_FILTERS.CONTRAST.MIN}
          max={IMAGE_FILTERS.CONTRAST.MAX}
          disabled={edgeDetectionEnabled}
          callback={onSetContrast}
        />
        <Slider
          key={`saturation-${resetKey}`}
          name="Saturation"
          initial={sliderInitials.saturate}
          min={IMAGE_FILTERS.SATURATE.MIN}
          max={IMAGE_FILTERS.SATURATE.MAX}
          disabled={edgeDetectionEnabled}
          callback={onSetSaturate}
        />
      </Stack>

      <ButtonGroup style={{ marginLeft: "auto", marginRight: "var(--stack-gap-spacious)" }}>
        <IconButton
          icon={ArrowLeftIcon}
          size="large"
          aria-label={EDITOR_TOOLTIPS.PAN_LEFT}
          keybindingHint={EDITOR_KEYS.PAN_LEFT.hint}
          onClick={handlePanLeft}
        />
        <IconButton
          icon={ArrowUpIcon}
          size="large"
          aria-label={EDITOR_TOOLTIPS.PAN_UP}
          keybindingHint={EDITOR_KEYS.PAN_UP.hint}
          onClick={handlePanUp}
        />
        <IconButton
          icon={ArrowDownIcon}
          size="large"
          aria-label={EDITOR_TOOLTIPS.PAN_DOWN}
          keybindingHint={EDITOR_KEYS.PAN_DOWN.hint}
          onClick={handlePanDown}
        />
        <IconButton
          icon={ArrowRightIcon}
          size="large"
          aria-label={EDITOR_TOOLTIPS.PAN_RIGHT}
          keybindingHint={EDITOR_KEYS.PAN_RIGHT.hint}
          onClick={handlePanRight}
        />
      </ButtonGroup>

      <ButtonGroup style={{ marginRight: "var(--stack-gap-spacious)" }}>
        <IconButton
          icon={ZoomOutIcon}
          size="large"
          aria-label={EDITOR_TOOLTIPS.ZOOM_OUT}
          keybindingHint={EDITOR_KEYS.ZOOM_OUT.hint}
          onClick={onZoomOut}
        />
        <IconButton
          icon={ZoomInIcon}
          size="large"
          aria-label={EDITOR_TOOLTIPS.ZOOM_IN}
          keybindingHint={EDITOR_KEYS.ZOOM_IN.hint}
          onClick={onZoomIn}
        />
      </ButtonGroup>

      <ButtonGroup style={{ marginRight: "auto" }}>
        <IconButton
          icon={CodescanIcon}
          size="large"
          variant={loupeEnabled ? "primary" : "default"}
          aria-label={loupeEnabled ? EDITOR_TOOLTIPS.DISABLE_LOUPE : EDITOR_TOOLTIPS.ENABLE_LOUPE}
          keybindingHint={EDITOR_KEYS.TOGGLE_LOUPE.hint}
          onClick={onToggleLoupe}
        />
      </ButtonGroup>

      <ButtonGroup style={{ marginRight: "var(--stack-gap-spacious)" }}>
        <IconButton
          icon={ChevronLeftIcon}
          size="large"
          variant="invisible"
          aria-label={EDITOR_TOOLTIPS.PREVIOUS_PHOTO}
          keybindingHint={EDITOR_KEYS.PREVIOUS_PHOTO.hint}
          onClick={handleNavigatePrev}
        />
        <IconButton
          icon={ChevronRightIcon}
          size="large"
          variant="invisible"
          aria-label={EDITOR_TOOLTIPS.NEXT_PHOTO}
          keybindingHint={EDITOR_KEYS.NEXT_PHOTO.hint}
          onClick={handleNavigateNext}
        />
      </ButtonGroup>

      <Button
        size="large"
        variant="danger"
        style={{ marginRight: "var(--stack-gap-normal)" }}
        trailingVisual={<KeybindingHint keys={EDITOR_KEYS.RESET.hint} />}
        onClick={onReset}
      >
        {EDITOR_TOOLTIPS.RESET}
      </Button>

      <Button
        size="large"
        variant="primary"
        loading={saving}
        disabled={saving}
        trailingVisual={<KeybindingHint keys={EDITOR_KEYS.SAVE.hint} />}
        onClick={onSave}
      >
        {EDITOR_TOOLTIPS.SAVE}
      </Button>
    </div>
  );
};

export default memo(Toolbar);
