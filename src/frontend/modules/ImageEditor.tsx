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

import { DEFAULT_LINE_SIZES, DEFAULT_LINE_COLOR } from "@/constants";

interface SliderProps {
  name: string;
  value: number;
  callback: React.Dispatch<React.SetStateAction<number>>;
}

const Slider = ({ name, value, callback }: SliderProps) => (
  <FormControl>
    <FormControl.Label>
      {name}
      <Label variant="secondary">
        <pre>{value}</pre>
      </Label>
    </FormControl.Label>
    <input
      type="range"
      min="0"
      max="200"
      value={value}
      onChange={(event) => callback(Number(event.target.value))}
    />
  </FormControl>
);

interface ImageEditorProps {
  image: File;
}

const ImageEditor = ({ image }: ImageEditorProps) => {
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
    defaultLineWidth: Number(DEFAULT_LINE_SIZES.NORMAL),
    defaultLineColor: DEFAULT_LINE_COLOR,
  });

  const handleSave = async () => {
    const editedFile = await generateEditedFile();
    console.debug("editedFile", editedFile);
  };

  return (
    <div className="edit">
      <div className="toolbar">
        <Stack direction="horizontal" align="center">
          <Slider name="Brightness" value={brightness} callback={setBrightness} />
          <Slider name="Contrast" value={contrast} callback={setContrast} />
          <Slider name="Saturation" value={saturate} callback={setSaturate} />
          <Slider name="Grayscale" value={grayscale} callback={setGrayscale} />
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
              fontSize: "var(--text-body-size-medium, .875rem)",
              fontWeight: "var(--base-text-weight-semibold, 600)",
            }}
          >
            Draw
          </Text>

          <ToggleSwitch
            size="small"
            aria-labelledby="draw-toggle"
            checked={mode === "draw"}
            statusLabelPosition="end"
            onClick={(value) => setMode(value ? "draw" : "pan")}
          />

          <div className="color-picker">
            <label htmlFor="line-color" style={{ backgroundColor: lineColor }} />
            <input
              id="line-color"
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
            <Select.Option value={String(DEFAULT_LINE_SIZES.LIGHT)}>Light</Select.Option>
            <Select.Option value={String(DEFAULT_LINE_SIZES.NORMAL)}>Normal</Select.Option>
            <Select.Option value={String(DEFAULT_LINE_SIZES.HEAVY)}>Heavy</Select.Option>
          </Select>
        </Stack>

        <ButtonGroup style={{ marginLeft: "auto", marginRight: "auto" }}>
          <Button leadingVisual={ZoomInIcon} size="small" onClick={handleZoomIn}>
            Zoom In
          </Button>
          <Button leadingVisual={ZoomOutIcon} size="small" onClick={handleZoomOut}>
            Zoom Out
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

        <Button leadingVisual={CheckIcon} size="small" variant="primary" onClick={handleSave}>
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
