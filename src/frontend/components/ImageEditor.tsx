import type { EditorNavigation, PhotoBody } from "@/types";

import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "@primer/octicons-react";
import { Button, ButtonGroup, FormControl, IconButton, Label, Stack } from "@primer/react";
import { memo, useEffect, useState } from "react";

import usePhotoEditor from "../hooks/usePhotoEditor";

interface SliderProps {
  name: string;
  min: number;
  max: number;
  initial: number;
  callback: React.Dispatch<React.SetStateAction<number>>;
}

const Slider = ({ name, min, max, initial, callback }: SliderProps) => {
  const [value, setValue] = useState<number>(initial);

  return (
    <FormControl>
      <FormControl.Label>
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
  handleWheel: (event: React.WheelEvent<HTMLCanvasElement>) => void;
}

const CanvasImage = ({
  ref,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handleWheel,
}: CanvasImageProps) => {
  return (
    <canvas
      ref={ref}
      className="canvas"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
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

  const {
    canvasRef,
    setBrightness,
    setContrast,
    setSaturate,
    handleZoomIn,
    handleZoomOut,
    handlePointerDown,
    handlePointerUp,
    handlePointerMove,
    handleWheel,
    resetFilters,
    exportFile,
  } = usePhotoEditor({
    file: image,
  });

  const handleSave = async () => {
    setSaving(true);

    const editedFile = await exportFile();
    const editedFileData = await (editedFile as File).arrayBuffer();

    await window.electronAPI.savePhotoFile(data, editedFileData);

    setSaving(false);
  };

  const handleEditorNavigation = async (direction: EditorNavigation) => {
    if (navigating) {
      return;
    }

    setNavigating(true);

    const result = await window.electronAPI.navigateEditorPhoto(data, direction);
    if (result) {
      setQueryCallback(result);

      // TODO: Move this to useEffect on data change as there is a delay from setQueryCallback
      resetFilters();
      setNavigating(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.code === "ArrowLeft") {
      handleEditorNavigation("prev");
    }

    if (event.code === "ArrowRight") {
      handleEditorNavigation("next");
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  return (
    <div className="edit">
      <div className="toolbar">
        <Stack direction="horizontal" align="center">
          <Slider name="Brightness" initial={100} min={0} max={200} callback={setBrightness} />
          <Slider name="Contrast" initial={100} min={0} max={200} callback={setContrast} />
          <Slider name="Saturation" initial={100} min={0} max={200} callback={setSaturate} />
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
          onClick={resetFilters}
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

      <CanvasImage
        ref={canvasRef}
        handlePointerDown={handlePointerDown}
        handlePointerMove={handlePointerMove}
        handlePointerUp={handlePointerUp}
        handleWheel={handleWheel}
      />
    </div>
  );
};

export default memo(ImageEditor);
