import type { EdgeDetectionData, EditorNavigation, PhotoBody } from "@/types";

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
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { EDGE_DETECTION, IMAGE_FILTERS } from "@/constants";

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
  ref: React.RefObject<HTMLCanvasElement | null>;
  handlePointerDown: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerMove: (event: React.PointerEvent<HTMLCanvasElement>) => void;
  handlePointerUp: (event: React.PointerEvent<HTMLCanvasElement>) => void;
}

const CanvasImage = ({
  ref,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
}: CanvasImageProps) => {
  return (
    <canvas
      ref={ref}
      className="canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
};

interface ImageEditorProps {
  data: PhotoBody;
  image: File;
  setQueryCallback: React.Dispatch<React.SetStateAction<string>>;
}

const ImageEditor = ({ data, image, setQueryCallback }: ImageEditorProps) => {
  console.log("Loaded photo edit data:", data);

  const [saving, setSaving] = useState<boolean>(false);
  const [navigating, setNavigating] = useState<boolean>(false);

  const [edgeDetectionData, setEdgeDetectionData] = useState<EdgeDetectionData>({
    enabled: false,
  });

  const {
    canvasRef,
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
    resetFilters,
    exportFile,
    resetKey,
  } = useImageEditor({
    file: image,
  });

  const handleSetImageDetection = () => {
    setEdgeDetectionData((prev) => {
      if (prev.enabled) {
        return { enabled: false };
      }

      return { enabled: true, value: EDGE_DETECTION.DEFAULT };
    });
  };

  const handleEdgeDetectionSlider = (value: number) => {
    setEdgeDetectionData({
      enabled: true,
      value,
    });
  };

  const handleReset = useCallback(() => {
    resetFilters();
    setEdgeDetectionData({ enabled: false });
  }, [resetFilters]);

  useEffect(() => {
    setEdgeDetection(edgeDetectionData);
  }, [edgeDetectionData, setEdgeDetection]);

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
        setQueryCallback(result);
      }
    },
    [data, navigating, setQueryCallback],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.code === "ArrowLeft") {
        handleEditorNavigation("prev");
      }

      if (event.code === "ArrowRight") {
        handleEditorNavigation("next");
      }
    },
    [handleEditorNavigation],
  );

  const previousPhotoIdRef = useRef<string>(`${data.directory}/${data.name}`);

  useEffect(() => {
    const currentPhotoId = `${data.directory}/${data.name}`;

    if (previousPhotoIdRef.current !== currentPhotoId) {
      resetFilters();
      setNavigating(false);
      setEdgeDetectionData({ enabled: false });

      previousPhotoIdRef.current = currentPhotoId;
    }
  }, [data.directory, data.name, resetFilters]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas) {
      canvas.addEventListener("wheel", handleWheel, { passive: false });
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      if (canvas) {
        canvas.removeEventListener("wheel", handleWheel);
      }

      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [canvasRef, handleWheel, handleKeyDown]);

  return (
    <div className="edit">
      <CanvasImage
        ref={canvasRef}
        handlePointerDown={handlePointerDown}
        handlePointerMove={handlePointerMove}
        handlePointerUp={handlePointerUp}
      />

      <Stack className="edge-toggle" direction="horizontal" align="center" spacing="none">
        <IconButton
          icon={edgeDetectionData.enabled ? EyeIcon : EyeClosedIcon}
          variant={edgeDetectionData.enabled ? "primary" : "default"}
          size="medium"
          aria-label="Edge detection"
          onClick={handleSetImageDetection}
        />

        {edgeDetectionData.enabled && (
          <Slider
            key={`edge-detection-${resetKey}`}
            name="Edge Detection"
            initial={edgeDetectionData.enabled ? edgeDetectionData.value : EDGE_DETECTION.DEFAULT}
            min={EDGE_DETECTION.MIN}
            max={EDGE_DETECTION.MAX}
            simple
            callback={handleEdgeDetectionSlider}
          />
        )}
      </Stack>

      <div className="toolbar">
        <Stack direction="horizontal" gap="condensed">
          <Slider
            key={`brightness-${resetKey}`}
            name="Brightness"
            initial={IMAGE_FILTERS.BRIGHTNESS.DEFAULT}
            min={IMAGE_FILTERS.BRIGHTNESS.MIN}
            max={IMAGE_FILTERS.BRIGHTNESS.MAX}
            disabled={edgeDetectionData.enabled}
            callback={setBrightness}
          />
          <Slider
            key={`contrast-${resetKey}`}
            name="Contrast"
            initial={IMAGE_FILTERS.CONTRAST.DEFAULT}
            min={IMAGE_FILTERS.CONTRAST.MIN}
            max={IMAGE_FILTERS.CONTRAST.MAX}
            disabled={edgeDetectionData.enabled}
            callback={setContrast}
          />
          <Slider
            key={`saturation-${resetKey}`}
            name="Saturation"
            initial={IMAGE_FILTERS.SATURATE.DEFAULT}
            min={IMAGE_FILTERS.SATURATE.MIN}
            max={IMAGE_FILTERS.SATURATE.MAX}
            disabled={edgeDetectionData.enabled}
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
  );
};

export default memo(ImageEditor);
