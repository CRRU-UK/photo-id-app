import type { EditorNavigation, PhotoBody } from "@/types";

import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CodescanIcon,
  EyeClosedIcon,
  EyeIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "@primer/octicons-react";
import { Button, ButtonGroup, FormControl, IconButton, Label, Stack } from "@primer/react";
import { KeybindingHint } from "@primer/react/experimental";
import { forwardRef, memo, useCallback, useEffect, useRef, useState } from "react";

import {
  EDGE_DETECTION,
  EDITOR_KEYBOARD_CODES,
  EDITOR_KEYBOARD_HINTS,
  EDITOR_TOOLTIPS,
  EditorPanDirection,
  IMAGE_FILTERS,
  KEYBOARD_CODE_TO_PAN_DIRECTION,
  LOUPE,
} from "@/constants";
import LoadingOverlay from "@/frontend/components/LoadingOverlay";
import useImageEditor from "@/frontend/hooks/useImageEditor";
import { computeIsEdited } from "@/helpers";

interface SliderProps {
  name: string;
  min: number;
  max: number;
  initial: number;
  disabled?: boolean;
  simple?: boolean;
  callback: (value: number) => void;
}

const Slider = ({
  name,
  min,
  max,
  initial,
  disabled = false,
  simple = false,
  callback,
}: SliderProps) => {
  const [value, setValue] = useState<number>(initial);

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  return (
    <FormControl disabled={disabled}>
      <FormControl.Label visuallyHidden={simple} style={{ width: "100%" }}>
        <Stack direction="horizontal" align="center" justify="space-between">
          {name}
          <Label variant="secondary">
            <pre>{value}</pre>
          </Label>
        </Stack>
      </FormControl.Label>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const newValue = Number(event.target.value);
          setValue(newValue);
          callback(newValue);
        }}
      />
    </FormControl>
  );
};

interface CanvasImageProps {
  handlePointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: () => void;
  handlePointerLeave: () => void;
  loupeEnabled: boolean;
}

const CanvasImage = forwardRef<HTMLCanvasElement, CanvasImageProps>(
  (
    { handlePointerDown, handlePointerMove, handlePointerUp, handlePointerLeave, loupeEnabled },
    ref,
  ) => {
    return (
      <canvas
        ref={ref}
        className={loupeEnabled ? "canvas-photo loupe-active" : "canvas-photo"}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      />
    );
  },
);

CanvasImage.displayName = "CanvasImage";

interface ImageEditorProps {
  data: PhotoBody;
  image: File;
  setQueryCallback: React.Dispatch<React.SetStateAction<string>>;
  onImageLoaded?: () => void;
  onError?: () => void;
}

const ImageEditor = ({
  data,
  image,
  setQueryCallback,
  onImageLoaded,
  onError,
}: ImageEditorProps) => {
  console.debug("Loaded photo edit data:", data);

  const [saving, setSaving] = useState<boolean>(false);
  const [navigating, setNavigating] = useState<boolean>(false);
  const [loupeEnabled, setLoupeEnabled] = useState<boolean>(false);

  const edits = data.edits;

  const [sliderInitials, setSliderInitials] = useState({
    brightness: edits.brightness,
    contrast: edits.contrast,
    saturate: edits.saturate,
  });

  const { refs, state, getters, filters, handlers, actions } = useImageEditor({
    file: image,
    loupeEnabled,
    onError,
  });

  const handleCanvasPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      handlers.handlePointerMove(event);
      handlers.handleLoupeMove(event);
    },
    // Intentionally list specific handler refs so this callback only updates when they change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handlers.handlePointerMove, handlers.handleLoupeMove],
  );

  const handleCanvasPointerLeave = useCallback(
    () => {
      handlers.handlePointerUp();
      handlers.handleLoupeLeave();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- specific handler refs for tighter deps
    [handlers.handlePointerUp, handlers.handleLoupeLeave],
  );

  const handleToggleLoupe = useCallback(() => {
    setLoupeEnabled((prev) => {
      if (prev) {
        handlers.handleLoupeLeave();
      }

      return !prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- specific handler ref for tighter deps
  }, [handlers.handleLoupeLeave]);

  const [edgeDetectionEnabled, setEdgeDetectionEnabled] = useState<boolean>(false);
  const edgeDetectionValueRef = useRef<number>(EDGE_DETECTION.DEFAULT);

  const handleToggleEdgeDetection = useCallback(() => {
    const newEnabled = !edgeDetectionEnabled;
    setEdgeDetectionEnabled(newEnabled);

    if (newEnabled) {
      return filters.setEdgeDetection({ enabled: true, value: edgeDetectionValueRef.current });
    }

    // When toggling off, just disable it (but keep the value in the ref)
    return filters.setEdgeDetection({ enabled: false });
  }, [edgeDetectionEnabled, filters]);

  const handleEdgeDetectionValue = useCallback(
    (value: number) => {
      edgeDetectionValueRef.current = value;
      filters.setEdgeDetection({ enabled: true, value });
    },
    [filters],
  );

  const resetEdgeDetection = useCallback(() => {
    setEdgeDetectionEnabled(false);
    edgeDetectionValueRef.current = EDGE_DETECTION.DEFAULT;
    filters.setEdgeDetection({ enabled: false });
  }, [filters]);

  const handleReset = useCallback(() => {
    actions.resetAll();
    resetEdgeDetection();
    setLoupeEnabled(false);
    setSliderInitials({
      brightness: IMAGE_FILTERS.BRIGHTNESS.DEFAULT,
      contrast: IMAGE_FILTERS.CONTRAST.DEFAULT,
      saturate: IMAGE_FILTERS.SATURATE.DEFAULT,
    });
  }, [actions, resetEdgeDetection]);

  const handleSave = useCallback(async () => {
    setSaving(true);

    try {
      const currentFilters = getters.getFilters();
      const transform = getters.getTransform();

      const edits = {
        brightness: currentFilters.brightness,
        contrast: currentFilters.contrast,
        saturate: currentFilters.saturate,
        zoom: transform.zoom,
        pan: transform.pan,
      };

      await window.electronAPI.savePhotoFile({
        ...data,
        edits,
        isEdited: computeIsEdited(edits),
      });
    } catch (error) {
      console.error("Failed to save edited photo file:", error);
    } finally {
      setSaving(false);
    }
  }, [data, getters]);

  const handleEditorNavigation = useCallback(
    async (direction: EditorNavigation) => {
      if (navigating) {
        return;
      }

      setNavigating(true);

      const result = await window.electronAPI.navigateEditorPhoto(data, direction);
      if (result) {
        setNavigating(false);
        return setQueryCallback(result);
      }

      setNavigating(false);
    },
    [data, navigating, setQueryCallback],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const modifierKey = event.ctrlKey || event.metaKey;

      const panDirection = KEYBOARD_CODE_TO_PAN_DIRECTION?.[event.code];
      if (!modifierKey && panDirection) {
        event.preventDefault();
        return handlers.handleDirectionalPan(panDirection);
      }

      const key = event.key.toLowerCase();

      if (!modifierKey && key === EDITOR_KEYBOARD_CODES.PREVIOUS_PHOTO) {
        event.preventDefault();
        return handleEditorNavigation("prev");
      }

      if (!modifierKey && key === EDITOR_KEYBOARD_CODES.NEXT_PHOTO) {
        event.preventDefault();
        return handleEditorNavigation("next");
      }

      const isInteractiveTarget =
        event.target instanceof HTMLButtonElement ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement;

      if (
        !modifierKey &&
        !isInteractiveTarget &&
        event.code === EDITOR_KEYBOARD_CODES.TOGGLE_LOUPE
      ) {
        event.preventDefault();
        return handleToggleLoupe();
      }

      if (!modifierKey && key === EDITOR_KEYBOARD_CODES.TOGGLE_EDGE_DETECTION) {
        event.preventDefault();
        return handleToggleEdgeDetection();
      }

      if (modifierKey && key === EDITOR_KEYBOARD_CODES.RESET) {
        event.preventDefault();
        return handleReset();
      }

      if (modifierKey && key === EDITOR_KEYBOARD_CODES.SAVE) {
        event.preventDefault();
        return handleSave();
      }

      if (modifierKey && key === EDITOR_KEYBOARD_CODES.ZOOM_OUT) {
        event.preventDefault();
        return handlers.handleZoomOut();
      }

      if (modifierKey && key === EDITOR_KEYBOARD_CODES.ZOOM_IN) {
        event.preventDefault();
        return handlers.handleZoomIn();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- specific handler refs for tighter deps
    [
      handlers.handleDirectionalPan,
      handleEditorNavigation,
      handleToggleLoupe,
      handleToggleEdgeDetection,
      handleReset,
      handleSave,
      handlers.handleZoomOut,
      handlers.handleZoomIn,
    ],
  );

  const previousPhotoIdRef = useRef<string>(`${data.directory}/${data.name}`);
  const loadedPhotoIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentPhotoId = `${data.directory}/${data.name}`;

    if (previousPhotoIdRef.current !== currentPhotoId) {
      previousPhotoIdRef.current = currentPhotoId;
    }
  }, [data.directory, data.name]);

  useEffect(() => {
    const currentPhotoId = `${data.directory}/${data.name}`;
    let frameId: number | undefined;

    if (state.imageLoaded && loadedPhotoIdRef.current !== currentPhotoId) {
      loadedPhotoIdRef.current = currentPhotoId;

      actions.applyEdits(edits);
      setSliderInitials({
        brightness: edits.brightness,
        contrast: edits.contrast,
        saturate: edits.saturate,
      });

      resetEdgeDetection();
      setLoupeEnabled(false);

      actions.draw();

      frameId = requestAnimationFrame(() => {
        setNavigating(false);
        onImageLoaded?.();
      });
    }

    return () => {
      if (frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [
    data.directory,
    data.name,
    state.imageLoaded,
    actions,
    resetEdgeDetection,
    edits,
    onImageLoaded,
  ]);

  useEffect(() => {
    const canvas = refs.canvasRef.current;

    if (!canvas) {
      return;
    }

    canvas.addEventListener("wheel", handlers.handleWheel, { passive: false });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      canvas.removeEventListener("wheel", handlers.handleWheel);
      document.removeEventListener("keydown", handleKeyDown);
    };

    // We intentionally omit refs.canvasRef from dependencies so this effect only re-runs when
    // handleWheel or handleKeyDown change, not when canvasRef.current changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handlers.handleWheel, handleKeyDown]);

  return (
    <>
      <LoadingOverlay data={{ show: navigating }} />

      <div className="edit">
        <CanvasImage
          ref={refs.canvasRef}
          handlePointerDown={handlers.handlePointerDown}
          handlePointerMove={handleCanvasPointerMove}
          handlePointerUp={handlers.handlePointerUp}
          handlePointerLeave={handleCanvasPointerLeave}
          loupeEnabled={loupeEnabled}
        />

        <div ref={refs.loupeContainerRef} className="loupe">
          <canvas
            ref={refs.loupeCanvasRef}
            width={LOUPE.SIZE}
            height={LOUPE.SIZE}
            className="canvas-loupe"
          />
        </div>

        <Stack className="edge-toggle" direction="horizontal" align="center" spacing="none">
          <IconButton
            icon={edgeDetectionEnabled ? EyeIcon : EyeClosedIcon}
            variant={edgeDetectionEnabled ? "primary" : "default"}
            size="medium"
            aria-label={
              edgeDetectionEnabled
                ? EDITOR_TOOLTIPS.DISABLE_EDGE_DETECTION
                : EDITOR_TOOLTIPS.ENABLE_EDGE_DETECTION
            }
            keybindingHint={EDITOR_KEYBOARD_HINTS.TOGGLE_EDGE_DETECTION}
            onClick={handleToggleEdgeDetection}
          />

          {edgeDetectionEnabled && (
            <Slider
              key={`edge-detection-${state.resetKey}`}
              name="Edge Detection"
              initial={edgeDetectionValueRef.current}
              min={EDGE_DETECTION.MIN}
              max={EDGE_DETECTION.MAX}
              simple
              callback={handleEdgeDetectionValue}
            />
          )}
        </Stack>

        <div className="toolbar">
          <Stack direction="horizontal" align="center" gap="condensed">
            <Slider
              key={`brightness-${state.resetKey}`}
              name="Brightness"
              initial={sliderInitials.brightness}
              min={IMAGE_FILTERS.BRIGHTNESS.MIN}
              max={IMAGE_FILTERS.BRIGHTNESS.MAX}
              disabled={edgeDetectionEnabled}
              callback={filters.setBrightness}
            />
            <Slider
              key={`contrast-${state.resetKey}`}
              name="Contrast"
              initial={sliderInitials.contrast}
              min={IMAGE_FILTERS.CONTRAST.MIN}
              max={IMAGE_FILTERS.CONTRAST.MAX}
              disabled={edgeDetectionEnabled}
              callback={filters.setContrast}
            />
            <Slider
              key={`saturation-${state.resetKey}`}
              name="Saturation"
              initial={sliderInitials.saturate}
              min={IMAGE_FILTERS.SATURATE.MIN}
              max={IMAGE_FILTERS.SATURATE.MAX}
              disabled={edgeDetectionEnabled}
              callback={filters.setSaturate}
            />
          </Stack>

          <ButtonGroup style={{ marginLeft: "auto", marginRight: "var(--stack-gap-spacious)" }}>
            <IconButton
              icon={ArrowLeftIcon}
              size="large"
              aria-label={EDITOR_TOOLTIPS.PAN_LEFT}
              keybindingHint={EDITOR_KEYBOARD_HINTS.PAN_LEFT}
              onClick={() => handlers.handleDirectionalPan(EditorPanDirection.LEFT)}
            />
            <IconButton
              icon={ArrowUpIcon}
              size="large"
              aria-label={EDITOR_TOOLTIPS.PAN_UP}
              keybindingHint={EDITOR_KEYBOARD_HINTS.PAN_UP}
              onClick={() => handlers.handleDirectionalPan(EditorPanDirection.UP)}
            />
            <IconButton
              icon={ArrowDownIcon}
              size="large"
              aria-label={EDITOR_TOOLTIPS.PAN_DOWN}
              keybindingHint={EDITOR_KEYBOARD_HINTS.PAN_DOWN}
              onClick={() => handlers.handleDirectionalPan(EditorPanDirection.DOWN)}
            />
            <IconButton
              icon={ArrowRightIcon}
              size="large"
              aria-label={EDITOR_TOOLTIPS.PAN_RIGHT}
              keybindingHint={EDITOR_KEYBOARD_HINTS.PAN_RIGHT}
              onClick={() => handlers.handleDirectionalPan(EditorPanDirection.RIGHT)}
            />
          </ButtonGroup>

          <ButtonGroup style={{ marginRight: "var(--stack-gap-spacious)" }}>
            <IconButton
              icon={ZoomOutIcon}
              size="large"
              aria-label={EDITOR_TOOLTIPS.ZOOM_OUT}
              keybindingHint={EDITOR_KEYBOARD_HINTS.ZOOM_OUT}
              onClick={handlers.handleZoomOut}
            />
            <IconButton
              icon={ZoomInIcon}
              size="large"
              aria-label={EDITOR_TOOLTIPS.ZOOM_IN}
              keybindingHint={EDITOR_KEYBOARD_HINTS.ZOOM_IN}
              onClick={handlers.handleZoomIn}
            />
          </ButtonGroup>

          <ButtonGroup style={{ marginRight: "auto" }}>
            <IconButton
              icon={CodescanIcon}
              size="large"
              variant={loupeEnabled ? "primary" : "default"}
              aria-label={
                loupeEnabled ? EDITOR_TOOLTIPS.DISABLE_LOUPE : EDITOR_TOOLTIPS.ENABLE_LOUPE
              }
              keybindingHint={EDITOR_KEYBOARD_HINTS.TOGGLE_LOUPE}
              onClick={handleToggleLoupe}
            />
          </ButtonGroup>

          <ButtonGroup style={{ marginRight: "var(--stack-gap-spacious)" }}>
            <IconButton
              icon={ChevronLeftIcon}
              size="large"
              variant="invisible"
              aria-label={EDITOR_TOOLTIPS.PREVIOUS_PHOTO}
              keybindingHint={EDITOR_KEYBOARD_HINTS.PREVIOUS_PHOTO}
              onClick={() => handleEditorNavigation("prev")}
            />
            <IconButton
              icon={ChevronRightIcon}
              size="large"
              variant="invisible"
              aria-label={EDITOR_TOOLTIPS.NEXT_PHOTO}
              keybindingHint={EDITOR_KEYBOARD_HINTS.NEXT_PHOTO}
              onClick={() => handleEditorNavigation("next")}
            />
          </ButtonGroup>

          <Button
            size="large"
            variant="danger"
            style={{ marginRight: "var(--stack-gap-normal)" }}
            trailingVisual={<KeybindingHint keys={EDITOR_KEYBOARD_HINTS.RESET} />}
            onClick={handleReset}
          >
            {EDITOR_TOOLTIPS.RESET}
          </Button>

          <Button
            size="large"
            variant="primary"
            loading={saving}
            disabled={saving}
            trailingVisual={<KeybindingHint keys={EDITOR_KEYBOARD_HINTS.SAVE} />}
            onClick={handleSave}
          >
            {EDITOR_TOOLTIPS.SAVE}
          </Button>
        </div>
      </div>
    </>
  );
};

export default memo(ImageEditor);
