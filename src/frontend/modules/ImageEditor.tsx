import type { EditWindowData } from "@/types";

import { useState, useEffect } from "react";
import { usePhotoEditor } from "react-photo-editor";
import {
  Stack,
  ToggleSwitch,
  ButtonGroup,
  Button,
  FormControl,
  Label,
  Text,
  Select,
} from "@primer/react";
import { ZoomOutIcon, ZoomInIcon, CheckIcon, XIcon } from "@primer/octicons-react";

import { LINE_SIZES, DEFAULT_LINE_COLOR } from "@/constants";
import { readFileAsString } from "@/helpers";

interface SliderProps {
  name: string;
  value: number;
  min: number;
  max: number;
  callback: React.Dispatch<React.SetStateAction<number>>;
}

const Slider = ({ name, value, min, max, callback }: SliderProps) => (
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
      onChange={(event) => callback(Number(event.target.value))}
    />
  </FormControl>
);

interface ImageEditorProps {
  data: EditWindowData;
  image: File;
}

const ImageEditor = ({ data, image }: ImageEditorProps) => {
  const [saving, setSaving] = useState<boolean>(false);

  const {
    canvasRef,
    setBrightness,
    brightness,
    contrast,
    setContrast,
    saturate,
    setSaturate,
    grayscale,
    setGrayscale,
    mode,
    setMode,
    lineColor,
    setLineColor,
    lineWidth,
    setLineWidth,
    handleZoomIn,
    handleZoomOut,
    generateEditedFile,
    handlePointerDown,
    handlePointerUp,
    handlePointerMove,
    handleWheel,
    resetFilters,
  } = usePhotoEditor({
    file: image,
    defaultLineWidth: Number(LINE_SIZES.NORMAL),
    defaultLineColor: DEFAULT_LINE_COLOR,
  });

  const handleSave = async () => {
    setSaving(true);

    const editedFile = await generateEditedFile();
    const editedFileData = await readFileAsString(editedFile as File);

    window.electronAPI.savePhotoFile(data, editedFileData);
  };

  useEffect(() => {
    window.electronAPI.onLoading((show) => setSaving(show));
  });

  return (
    <div className="edit">
      <div className="toolbar">
        <Stack direction="horizontal" align="center">
          <Slider name="Brightness" value={brightness} min={0} max={200} callback={setBrightness} />
          <Slider name="Contrast" value={contrast} min={0} max={200} callback={setContrast} />
          <Slider name="Saturation" value={saturate} min={0} max={200} callback={setSaturate} />
          <Slider name="Grayscale" value={grayscale} min={0} max={100} callback={setGrayscale} />
        </Stack>

        <Stack
          direction="horizontal"
          align="center"
          gap="condensed"
          sx={{ marginLeft: "auto", marginRight: "auto" }}
        >
          <Text
            id="captioned-toggle-label"
            sx={{
              fontSize: "var(--text-body-size-medium)",
              fontWeight: "var(--base-text-weight-semibold)",
            }}
          >
            Draw
          </Text>

          <ToggleSwitch
            size="small"
            aria-labelledby="draw-toggle"
            statusLabelPosition="end"
            checked={mode == "draw"}
            onClick={() => setMode(mode === "pan" ? "draw" : "pan")}
          />

          <div className="colour-picker">
            <label
              htmlFor="line-colour"
              style={{ backgroundColor: lineColor }}
              aria-label="Colour"
            />
            <input
              id="line-colour"
              type="color"
              value={lineColor}
              onChange={(event) => setLineColor(event.target.value)}
            />
          </div>

          <Select
            size="small"
            value={String(lineWidth)}
            onChange={(event) => setLineWidth(Number(event.target.value))}
          >
            <Select.Option value={String(LINE_SIZES.LIGHT)}>Light</Select.Option>
            <Select.Option value={String(LINE_SIZES.NORMAL)}>Normal</Select.Option>
            <Select.Option value={String(LINE_SIZES.HEAVY)}>Heavy</Select.Option>
          </Select>
        </Stack>

        <ButtonGroup style={{ marginLeft: "auto", marginRight: "auto" }}>
          <Button leadingVisual={ZoomOutIcon} size="small" onClick={handleZoomOut}>
            Zoom Out
          </Button>
          <Button leadingVisual={ZoomInIcon} size="small" onClick={handleZoomIn}>
            Zoom In
          </Button>
        </ButtonGroup>

        <Button
          leadingVisual={XIcon}
          size="small"
          variant="danger"
          onClick={resetFilters}
          style={{ marginRight: "var(--stack-gap-normal)" }}
        >
          Reset
        </Button>

        <Button
          leadingVisual={CheckIcon}
          size="small"
          variant="primary"
          loading={saving}
          disabled={saving}
          onClick={handleSave}
        >
          Save
        </Button>
      </div>

      <canvas
        ref={canvasRef}
        className={`canvas ${mode}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />
    </div>
  );
};

export default ImageEditor;
