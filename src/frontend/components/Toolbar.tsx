import {
  AiModelIcon,
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
import { ActionBar, Button, ButtonGroup, IconButton, Stack } from "@primer/react";
import { KeybindingHint } from "@primer/react/experimental";
import { memo, useCallback } from "react";
import { EDITOR_KEYS, EDITOR_TOOLTIPS, EditorPanDirection, IMAGE_FILTERS } from "@/constants";
import Slider from "@/frontend/components/Slider";
import type { AnalysisProvider, EditorNavigation } from "@/types";

interface ToolbarProps {
  edgeDetectionEnabled: boolean;
  isAnalysing: boolean;
  loupeEnabled: boolean;
  onAnalyse: () => void;
  onDirectionalPan: (direction: EditorPanDirection) => void;
  onNavigate: (direction: EditorNavigation) => void;
  onReset: () => void;
  onSave: () => void;
  onSetBrightness: (value: number) => void;
  onSetContrast: (value: number) => void;
  onSetSaturate: (value: number) => void;
  onToggleLoupe: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  resetKey: number;
  saving: boolean;
  selectedProvider: AnalysisProvider | undefined;
  sliderInitials: {
    brightness: number;
    contrast: number;
    saturate: number;
  };
}

const Toolbar = ({
  sliderInitials,
  resetKey,
  edgeDetectionEnabled,
  isAnalysing,
  loupeEnabled,
  selectedProvider,
  saving,
  onAnalyse,
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
      <Stack align="center" className="toolbar-sliders" direction="horizontal" gap="condensed">
        <Slider
          callback={onSetBrightness}
          disabled={edgeDetectionEnabled}
          initial={sliderInitials.brightness}
          key={`brightness-${resetKey}`}
          max={IMAGE_FILTERS.BRIGHTNESS.MAX}
          min={IMAGE_FILTERS.BRIGHTNESS.MIN}
          name="Brightness"
        />
        <Slider
          callback={onSetContrast}
          disabled={edgeDetectionEnabled}
          initial={sliderInitials.contrast}
          key={`contrast-${resetKey}`}
          max={IMAGE_FILTERS.CONTRAST.MAX}
          min={IMAGE_FILTERS.CONTRAST.MIN}
          name="Contrast"
        />
        <Slider
          callback={onSetSaturate}
          disabled={edgeDetectionEnabled}
          initial={sliderInitials.saturate}
          key={`saturation-${resetKey}`}
          max={IMAGE_FILTERS.SATURATE.MAX}
          min={IMAGE_FILTERS.SATURATE.MIN}
          name="Saturation"
        />
      </Stack>

      <ActionBar aria-label="Image controls" className="toolbar-actions" flush>
        <ActionBar.Group>
          <ActionBar.IconButton
            aria-label={EDITOR_TOOLTIPS.PAN_LEFT}
            icon={ArrowLeftIcon}
            keybindingHint={EDITOR_KEYS.PAN_LEFT.hint}
            onClick={handlePanLeft}
          />
          <ActionBar.IconButton
            aria-label={EDITOR_TOOLTIPS.PAN_UP}
            icon={ArrowUpIcon}
            keybindingHint={EDITOR_KEYS.PAN_UP.hint}
            onClick={handlePanUp}
          />
          <ActionBar.IconButton
            aria-label={EDITOR_TOOLTIPS.PAN_DOWN}
            icon={ArrowDownIcon}
            keybindingHint={EDITOR_KEYS.PAN_DOWN.hint}
            onClick={handlePanDown}
          />
          <ActionBar.IconButton
            aria-label={EDITOR_TOOLTIPS.PAN_RIGHT}
            icon={ArrowRightIcon}
            keybindingHint={EDITOR_KEYS.PAN_RIGHT.hint}
            onClick={handlePanRight}
          />
        </ActionBar.Group>
        <ActionBar.Divider />
        <ActionBar.Group>
          <ActionBar.IconButton
            aria-label={EDITOR_TOOLTIPS.ZOOM_OUT}
            icon={ZoomOutIcon}
            keybindingHint={EDITOR_KEYS.ZOOM_OUT.hint}
            onClick={onZoomOut}
          />
          <ActionBar.IconButton
            aria-label={EDITOR_TOOLTIPS.ZOOM_IN}
            icon={ZoomInIcon}
            keybindingHint={EDITOR_KEYS.ZOOM_IN.hint}
            onClick={onZoomIn}
          />
        </ActionBar.Group>
        <ActionBar.Divider />
        <ActionBar.Group>
          <ActionBar.IconButton
            aria-label={loupeEnabled ? EDITOR_TOOLTIPS.DISABLE_LOUPE : EDITOR_TOOLTIPS.ENABLE_LOUPE}
            icon={CodescanIcon}
            keybindingHint={EDITOR_KEYS.TOGGLE_LOUPE.hint}
            onClick={onToggleLoupe}
            variant={loupeEnabled ? "primary" : "default"}
          />
        </ActionBar.Group>
        {selectedProvider !== undefined && <ActionBar.Divider />}
        {selectedProvider !== undefined && (
          <ActionBar.Group>
            <ActionBar.IconButton
              aria-label={EDITOR_TOOLTIPS.ANALYSE}
              disabled={isAnalysing}
              icon={AiModelIcon}
              keybindingHint={EDITOR_KEYS.ANALYSE.hint}
              onClick={onAnalyse}
            />
          </ActionBar.Group>
        )}
      </ActionBar>

      <ButtonGroup style={{ marginLeft: "auto" }}>
        <IconButton
          aria-label={EDITOR_TOOLTIPS.PREVIOUS_PHOTO}
          icon={ChevronLeftIcon}
          keybindingHint={EDITOR_KEYS.PREVIOUS_PHOTO.hint}
          onClick={handleNavigatePrev}
          size="medium"
        />
        <IconButton
          aria-label={EDITOR_TOOLTIPS.NEXT_PHOTO}
          icon={ChevronRightIcon}
          keybindingHint={EDITOR_KEYS.NEXT_PHOTO.hint}
          onClick={handleNavigateNext}
          size="medium"
        />
      </ButtonGroup>

      <Stack
        direction="horizontal"
        gap="normal"
        style={{
          marginLeft: "var(--app-spacing-large)",
        }}
      >
        <Button
          onClick={onReset}
          size="medium"
          trailingVisual={<KeybindingHint keys={EDITOR_KEYS.RESET.hint} />}
          variant="danger"
        >
          {EDITOR_TOOLTIPS.RESET}
        </Button>

        <Button
          disabled={saving}
          loading={saving}
          onClick={onSave}
          size="medium"
          trailingVisual={<KeybindingHint keys={EDITOR_KEYS.SAVE.hint} />}
          variant="primary"
        >
          {EDITOR_TOOLTIPS.SAVE}
        </Button>
      </Stack>
    </div>
  );
};

export default memo(Toolbar);
