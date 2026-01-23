import type { EditorNavigation, PhotoBody } from "@/types";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
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
  PAN_AMOUNT,
} from "@/constants";
import LoadingOverlay from "@/frontend/components/LoadingOverlay";

import useImageEditor from "../hooks/useImageEditor";

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
      <FormControl.Label visuallyHidden={simple}>
        {name}
        <Label variant="secondary">
          <pre>{value}</pre>
        </Label>
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
  handlePointerUp: (event: React.PointerEvent<HTMLCanvasElement>) => void;
}

const CanvasImage = forwardRef<HTMLCanvasElement, CanvasImageProps>(
  ({ handlePointerDown, handlePointerMove, handlePointerUp }, ref) => {
    return (
      <canvas
        ref={ref}
        className="canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    );
  },
);

CanvasImage.displayName = "CanvasImage";

interface ImageEditorProps {
  data: PhotoBody;
  image: File;
  setQueryCallback: React.Dispatch<React.SetStateAction<string>>;
}

const ImageEditor = ({ data, image, setQueryCallback }: ImageEditorProps) => {
  console.debug("Loaded photo edit data:", data);

  const [saving, setSaving] = useState<boolean>(false);
  const [navigating, setNavigating] = useState<boolean>(false);

  const {
    canvasRef,
    imageRef,
    imageLoaded,
    setBrightness,
    setContrast,
    setSaturate,
    setEdgeDetection,
    handleZoomIn,
    handleZoomOut,
    handlePointerDown,
    handlePointerUp,
    handlePointerMove,
    handleWheel,
    handlePan,
    resetAll,
    exportFile,
    resetKey,
  } = useImageEditor({
    file: image,
  });

  const [edgeDetectionEnabled, setEdgeDetectionEnabled] = useState<boolean>(false);
  const edgeDetectionValueRef = useRef<number>(EDGE_DETECTION.DEFAULT);

  const handleToggleEdgeDetection = useCallback(() => {
    const newEnabled = !edgeDetectionEnabled;
    setEdgeDetectionEnabled(newEnabled);

    if (newEnabled) {
      return setEdgeDetection({ enabled: true, value: edgeDetectionValueRef.current });
    }

    // When toggling off, just disable it (but keep the value in the ref)
    return setEdgeDetection({ enabled: false });
  }, [edgeDetectionEnabled, setEdgeDetection]);

  const handleEdgeDetectionValue = useCallback(
    (value: number) => {
      edgeDetectionValueRef.current = value;
      setEdgeDetection({ enabled: true, value });
    },
    [setEdgeDetection],
  );

  const resetEdgeDetection = useCallback(() => {
    setEdgeDetectionEnabled(false);
    edgeDetectionValueRef.current = EDGE_DETECTION.DEFAULT;
    setEdgeDetection({ enabled: false });
  }, [setEdgeDetection]);

  const handleReset = useCallback(() => {
    resetAll();
    resetEdgeDetection();
  }, [resetAll, resetEdgeDetection]);

  const handleSave = useCallback(async () => {
    setSaving(true);

    try {
      const editedFile = await exportFile();

      if (!editedFile) {
        return;
      }

      const editedFileData = await editedFile.arrayBuffer();

      await window.electronAPI.savePhotoFile(data, editedFileData);
    } catch (error) {
      console.error("Failed to save edited photo file:", error);
    } finally {
      setSaving(false);
    }
  }, [data, exportFile]);

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

  const handlePanDirection = useCallback(
    (direction: EditorPanDirection) => {
      const canvas = canvasRef.current;
      const image = imageRef.current;

      if (!canvas || !image) {
        return;
      }

      const scaleX = image.naturalWidth / canvas.clientWidth;
      const scaleY = image.naturalHeight / canvas.clientHeight;

      let deltaX = 0;
      let deltaY = 0;

      if (direction === EditorPanDirection.LEFT) {
        deltaX = PAN_AMOUNT * scaleX;
      } else if (direction === EditorPanDirection.RIGHT) {
        deltaX = -PAN_AMOUNT * scaleX;
      } else if (direction === EditorPanDirection.UP) {
        deltaY = PAN_AMOUNT * scaleY;
      } else if (direction === EditorPanDirection.DOWN) {
        deltaY = -PAN_AMOUNT * scaleY;
      }

      handlePan({ x: deltaX, y: deltaY });
    },
    [canvasRef, imageRef, handlePan],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const modifierKey = event.ctrlKey || event.metaKey;

      const panDirection = KEYBOARD_CODE_TO_PAN_DIRECTION?.[event.code];
      if (!modifierKey && panDirection) {
        event.preventDefault();
        return handlePanDirection(panDirection);
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
        return handleZoomOut();
      }

      if (modifierKey && key === EDITOR_KEYBOARD_CODES.ZOOM_IN) {
        event.preventDefault();
        return handleZoomIn();
      }
    },
    [
      handlePanDirection,
      handleEditorNavigation,
      handleToggleEdgeDetection,
      handleReset,
      handleSave,
      handleZoomOut,
      handleZoomIn,
    ],
  );

  const previousPhotoIdRef = useRef<string>(`${data.directory}/${data.name}`);
  const loadedPhotoIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentPhotoId = `${data.directory}/${data.name}`;

    if (previousPhotoIdRef.current !== currentPhotoId) {
      previousPhotoIdRef.current = currentPhotoId;

      setNavigating(false);
    }
  }, [data.directory, data.name]);

  useEffect(() => {
    const currentPhotoId = `${data.directory}/${data.name}`;

    if (imageLoaded && loadedPhotoIdRef.current !== currentPhotoId) {
      loadedPhotoIdRef.current = currentPhotoId;

      resetAll();
      resetEdgeDetection();
    }
  }, [data.directory, data.name, imageLoaded, resetAll, resetEdgeDetection]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      document.removeEventListener("keydown", handleKeyDown);
    };

    // We intentionally omit canvasRef from dependencies so this effect only re-runs when
    // handleWheel or handleKeyDown change, not when canvasRef.current changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleWheel, handleKeyDown]);

  return (
    <>
      <LoadingOverlay data={{ show: navigating }} />

      <div className="edit">
        <CanvasImage
          ref={canvasRef}
          handlePointerDown={handlePointerDown}
          handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp}
        />

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
            onClick={handleToggleEdgeDetection}
            keybindingHint={EDITOR_KEYBOARD_HINTS.TOGGLE_EDGE_DETECTION}
          />

          {edgeDetectionEnabled && (
            <Slider
              key={`edge-detection-${resetKey}`}
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
              key={`brightness-${resetKey}`}
              name="Brightness"
              initial={IMAGE_FILTERS.BRIGHTNESS.DEFAULT}
              min={IMAGE_FILTERS.BRIGHTNESS.MIN}
              max={IMAGE_FILTERS.BRIGHTNESS.MAX}
              disabled={edgeDetectionEnabled}
              callback={setBrightness}
            />
            <Slider
              key={`contrast-${resetKey}`}
              name="Contrast"
              initial={IMAGE_FILTERS.CONTRAST.DEFAULT}
              min={IMAGE_FILTERS.CONTRAST.MIN}
              max={IMAGE_FILTERS.CONTRAST.MAX}
              disabled={edgeDetectionEnabled}
              callback={setContrast}
            />
            <Slider
              key={`saturation-${resetKey}`}
              name="Saturation"
              initial={IMAGE_FILTERS.SATURATE.DEFAULT}
              min={IMAGE_FILTERS.SATURATE.MIN}
              max={IMAGE_FILTERS.SATURATE.MAX}
              disabled={edgeDetectionEnabled}
              callback={setSaturate}
            />
          </Stack>

          <ButtonGroup style={{ marginLeft: "auto", marginRight: "var(--stack-gap-spacious)" }}>
            <IconButton
              icon={ChevronLeftIcon}
              size="large"
              aria-label={EDITOR_TOOLTIPS.PAN_LEFT}
              keybindingHint={EDITOR_KEYBOARD_HINTS.PAN_LEFT}
              onClick={() => handlePanDirection(EditorPanDirection.LEFT)}
            />
            <IconButton
              icon={ChevronUpIcon}
              size="large"
              aria-label={EDITOR_TOOLTIPS.PAN_UP}
              keybindingHint={EDITOR_KEYBOARD_HINTS.PAN_UP}
              onClick={() => handlePanDirection(EditorPanDirection.UP)}
            />
            <IconButton
              icon={ChevronDownIcon}
              size="large"
              aria-label={EDITOR_TOOLTIPS.PAN_DOWN}
              keybindingHint={EDITOR_KEYBOARD_HINTS.PAN_DOWN}
              onClick={() => handlePanDirection(EditorPanDirection.DOWN)}
            />
            <IconButton
              icon={ChevronRightIcon}
              size="large"
              aria-label={EDITOR_TOOLTIPS.PAN_RIGHT}
              keybindingHint={EDITOR_KEYBOARD_HINTS.PAN_RIGHT}
              onClick={() => handlePanDirection(EditorPanDirection.RIGHT)}
            />
          </ButtonGroup>

          <ButtonGroup style={{ marginRight: "auto" }}>
            <IconButton
              icon={ZoomOutIcon}
              size="large"
              aria-label={EDITOR_TOOLTIPS.ZOOM_OUT}
              onClick={handleZoomOut}
              keybindingHint={EDITOR_KEYBOARD_HINTS.ZOOM_OUT}
            />
            <IconButton
              icon={ZoomInIcon}
              size="large"
              aria-label={EDITOR_TOOLTIPS.ZOOM_IN}
              onClick={handleZoomIn}
              keybindingHint={EDITOR_KEYBOARD_HINTS.ZOOM_IN}
            />
          </ButtonGroup>

          <ButtonGroup style={{ marginRight: "var(--stack-gap-spacious)" }}>
            <IconButton
              icon={ArrowLeftIcon}
              size="large"
              variant="invisible"
              aria-label={EDITOR_TOOLTIPS.PREVIOUS_PHOTO}
              keybindingHint={EDITOR_KEYBOARD_HINTS.PREVIOUS_PHOTO}
              onClick={() => handleEditorNavigation("prev")}
            />
            <IconButton
              icon={ArrowRightIcon}
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
            onClick={handleReset}
            style={{ marginRight: "var(--stack-gap-normal)" }}
            trailingVisual={<KeybindingHint keys={EDITOR_KEYBOARD_HINTS.RESET} />}
          >
            {EDITOR_TOOLTIPS.RESET}
          </Button>

          <Button
            size="large"
            variant="primary"
            loading={saving}
            disabled={saving}
            onClick={handleSave}
            trailingVisual={<KeybindingHint keys={EDITOR_KEYBOARD_HINTS.SAVE} />}
          >
            {EDITOR_TOOLTIPS.SAVE}
          </Button>
        </div>
      </div>
    </>
  );
};

export default memo(ImageEditor);
