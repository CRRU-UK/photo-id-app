import type { EditorNavigation, PhotoBody } from "@/types";

import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeClosedIcon,
  EyeIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "@primer/octicons-react";
import { Button, ButtonGroup, FormControl, IconButton, Label, Stack } from "@primer/react";
import { forwardRef, memo, useCallback, useEffect, useRef, useState } from "react";

import { EDGE_DETECTION, IMAGE_FILTERS } from "@/constants";
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
    imageLoaded,
    setBrightness,
    setContrast,
    setSaturate,
    setEdgeDetection,
    getFilters,
    handleZoomIn,
    handleZoomOut,
    handlePointerDown,
    handlePointerUp,
    handlePointerMove,
    handleWheel,
    resetAll,
    exportFile,
    resetKey,
  } = useImageEditor({
    file: image,
  });

  const [edgeDetectionEnabled, setEdgeDetectionEnabled] = useState<boolean>(false);

  const currentEdgeDetection = getFilters().edgeDetection;
  const edgeDetectionValue = currentEdgeDetection.enabled
    ? currentEdgeDetection.value
    : EDGE_DETECTION.DEFAULT;

  const handleToggleEdgeDetection = useCallback(() => {
    const newEnabled = !edgeDetectionEnabled;
    setEdgeDetectionEnabled(newEnabled);

    if (newEnabled) {
      return setEdgeDetection({ enabled: true, value: edgeDetectionValue });
    }

    return setEdgeDetection({ enabled: false });
  }, [edgeDetectionEnabled, edgeDetectionValue, setEdgeDetection]);

  const handleEdgeDetectionValue = useCallback(
    (value: number) => setEdgeDetection({ enabled: true, value }),
    [setEdgeDetection],
  );

  const resetEdgeDetection = useCallback(() => {
    setEdgeDetectionEnabled(false);
    setEdgeDetection({ enabled: false });
  }, [setEdgeDetection]);

  const handleReset = () => {
    resetAll();
    resetEdgeDetection();
  };

  const handleSave = async () => {
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
  };

  const handleEditorNavigation = useCallback(
    async (direction: EditorNavigation) => {
      if (navigating) {
        return;
      }

      setNavigating(true);

      const result = await window.electronAPI.navigateEditorPhoto(data, direction);
      if (result) {
        return setQueryCallback(result);
      }

      setNavigating(false);
    },
    [data, navigating, setQueryCallback],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.code === "ArrowLeft") {
        return handleEditorNavigation("prev");
      }

      if (event.code === "ArrowRight") {
        return handleEditorNavigation("next");
      }
    },
    [handleEditorNavigation],
  );

  const previousPhotoIdRef = useRef<string>(`${data.directory}/${data.name}`);

  useEffect(() => {
    const currentPhotoId = `${data.directory}/${data.name}`;

    if (previousPhotoIdRef.current !== currentPhotoId && imageLoaded) {
      previousPhotoIdRef.current = currentPhotoId;

      resetAll();
      resetEdgeDetection();
      setEdgeDetectionEnabled(false);

      setNavigating(false);
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

    // canvasRef is a stable ref object and doesn't need to be in dependencies
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
            aria-label={edgeDetectionEnabled ? "Disable edge detection" : "Enable edge detection"}
            onClick={handleToggleEdgeDetection}
          />

          {edgeDetectionEnabled && (
            <Slider
              key={`edge-detection-${resetKey}`}
              name="Edge Detection"
              initial={edgeDetectionValue}
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

          <ButtonGroup style={{ marginLeft: "auto", marginRight: "auto" }}>
            <Button
              leadingVisual={ZoomOutIcon}
              size="medium"
              aria-label="Zoom out"
              onClick={handleZoomOut}
            >
              Zoom Out
            </Button>

            <Button
              leadingVisual={ZoomInIcon}
              size="medium"
              aria-label="Zoom In"
              onClick={handleZoomIn}
            >
              Zoom In
            </Button>
          </ButtonGroup>

          <ButtonGroup style={{ marginLeft: "auto", marginRight: "auto" }}>
            <IconButton
              icon={ChevronLeftIcon}
              size="medium"
              aria-label="Previous photo"
              onClick={() => handleEditorNavigation("prev")}
            />
            <IconButton
              icon={ChevronRightIcon}
              size="medium"
              aria-label="Next Photo"
              onClick={() => handleEditorNavigation("next")}
            />
          </ButtonGroup>

          <Button
            leadingVisual={XIcon}
            size="medium"
            variant="danger"
            onClick={handleReset}
            style={{ marginRight: "var(--stack-gap-normal)" }}
          >
            Reset
          </Button>

          <Button
            leadingVisual={CheckIcon}
            size="medium"
            variant="primary"
            loading={saving}
            disabled={saving}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </div>
    </>
  );
};

export default memo(ImageEditor);
