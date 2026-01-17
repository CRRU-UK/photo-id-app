import { useCallback, useEffect, useRef, useState } from "react";

interface UsePhotoEditorProps {
  file: File;
}

const DEFAULT_LEVELS = {
  BRIGHTNESS: 100,
  CONTRAST: 100,
  SATURATE: 100,
  ZOOM: 1,
  PAN_X: 0,
  PAN_Y: 0,
};

const ZOOM_FACTOR_BUTTON = 1.2;
const ZOOM_FACTOR_WHEEL = 1.02;

const usePhotoEditor = ({ file }: UsePhotoEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const brightnessRef = useRef<number>(DEFAULT_LEVELS.BRIGHTNESS);
  const contrastRef = useRef<number>(DEFAULT_LEVELS.CONTRAST);
  const saturateRef = useRef<number>(DEFAULT_LEVELS.SATURATE);
  const zoomRef = useRef<number>(DEFAULT_LEVELS.ZOOM);

  const [zoom, setZoom] = useState<number>(DEFAULT_LEVELS.ZOOM);

  const isPanningRef = useRef<boolean>(false);
  const panXRef = useRef<number>(DEFAULT_LEVELS.PAN_X);
  const panYRef = useRef<number>(DEFAULT_LEVELS.PAN_Y);
  const lastPointerXRef = useRef<number>(0);
  const lastPointerYRef = useRef<number>(0);

  // Ensures the image is within the canvas bounds
  const clamp = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image) {
      return;
    }

    const zoom = zoomRef.current;
    const scaledImageWidth = image.naturalWidth * zoom;
    const scaledImageHeight = image.naturalHeight * zoom;

    const minPanX = (canvas.width - scaledImageWidth) / 2;
    const maxPanX = (scaledImageWidth - canvas.width) / 2;

    const minPanY = (canvas.height - scaledImageHeight) / 2;
    const maxPanY = (scaledImageHeight - canvas.height) / 2;

    panXRef.current = Math.max(minPanX, Math.min(maxPanX, panXRef.current));
    panYRef.current = Math.max(minPanY, Math.min(maxPanY, panYRef.current));
  }, []);

  const draw = useCallback(() => {
    setZoom(zoomRef.current);

    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const zoom = zoomRef.current;
    const centreX = canvas.width / 2;
    const centreY = canvas.height / 2;

    clamp();

    context.translate(centreX + panXRef.current, centreY + panYRef.current);
    context.scale(zoom, zoom);
    context.translate(-centreX, -centreY);

    context.filter = [
      `brightness(${brightnessRef.current}%)`,
      `contrast(${contrastRef.current}%)`,
      `saturate(${saturateRef.current}%)`,
    ].join(" ");

    context.drawImage(image, 0, 0);

    console.table({
      brightness: brightnessRef.current,
      contrast: contrastRef.current,
      saturate: saturateRef.current,
      zoom: zoomRef.current,
      isPanning: isPanningRef.current,
      panX: panXRef.current,
      panY: panYRef.current,
    });
  }, [clamp]);

  useEffect(() => {
    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      imageRef.current = image;
      draw();
    };

    image.src = url;

    return () => {
      URL.revokeObjectURL(url);
      imageRef.current = null;
    };
  }, [file]);

  // Draw on load
  useEffect(() => {
    draw();
  }, [draw]);

  const exportFile = useCallback(async (): Promise<File | null> => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const mime = file.type;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          return resolve(null);
        }

        const name = file.name;
        const edited = new File([blob], name, { type: mime });

        resolve(edited);
      }, mime);
    });
  }, [file]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    isPanningRef.current = true;
    lastPointerXRef.current = event.clientX;
    lastPointerYRef.current = event.clientY;
  }, []);

  // Pan the image from the last cursor position (i.e. 1:1 movement)
  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isPanningRef.current) {
        return;
      }

      const canvas = canvasRef.current;
      const image = imageRef.current;

      if (!canvas || !image) {
        return;
      }

      const deltaX = event.clientX - lastPointerXRef.current;
      const deltaY = event.clientY - lastPointerYRef.current;

      const scaleX = image.naturalWidth / canvas.clientWidth;
      const scaleY = image.naturalHeight / canvas.clientHeight;

      const scaledDeltaX = deltaX * scaleX;
      const scaledDeltaY = deltaY * scaleY;

      const zoom = zoomRef.current;
      const scaledImageWidth = image.naturalWidth * zoom;
      const scaledImageHeight = image.naturalHeight * zoom;

      const minPanX = (canvas.width - scaledImageWidth) / 2;
      const maxPanX = (scaledImageWidth - canvas.width) / 2;
      const minPanY = (canvas.height - scaledImageHeight) / 2;
      const maxPanY = (scaledImageHeight - canvas.height) / 2;

      panXRef.current = Math.max(minPanX, Math.min(maxPanX, panXRef.current + scaledDeltaX));
      panYRef.current = Math.max(minPanY, Math.min(maxPanY, panYRef.current + scaledDeltaY));

      lastPointerXRef.current = event.clientX;
      lastPointerYRef.current = event.clientY;

      draw();
    },
    [draw],
  );

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  // Zoom the image towards where the cursor currently is
  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();

      const canvas = canvasRef.current;
      const image = imageRef.current;

      if (!canvas || !image) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const cursorScreenX = event.clientX - rect.left;
      const cursorScreenY = event.clientY - rect.top;

      const scaleX = image.naturalWidth / canvas.clientWidth;
      const scaleY = image.naturalHeight / canvas.clientHeight;

      const cursorImageX = cursorScreenX * scaleX;
      const cursorImageY = cursorScreenY * scaleY;

      const zoom = zoomRef.current;
      const centreX = canvas.width / 2;
      const centreY = canvas.height / 2;

      const imagePointX = (cursorImageX - centreX - panXRef.current) / zoom + centreX;
      const imagePointY = (cursorImageY - centreY - panYRef.current) / zoom + centreY;

      const delta = event.deltaY > 0 ? 1 / ZOOM_FACTOR_WHEEL : ZOOM_FACTOR_WHEEL;
      const newZoom = zoomRef.current * delta;

      zoomRef.current = Math.max(newZoom, 1);
      panXRef.current = cursorImageX - centreX - (imagePointX - centreX) * zoomRef.current;
      panYRef.current = cursorImageY - centreY - (imagePointY - centreY) * zoomRef.current;

      draw();
    },
    [draw],
  );

  // Zoom in from the centre of the canvas
  const handleZoomIn = useCallback(() => {
    zoomRef.current = zoomRef.current * ZOOM_FACTOR_BUTTON;
    panXRef.current = panXRef.current * ZOOM_FACTOR_BUTTON;
    panYRef.current = panYRef.current * ZOOM_FACTOR_BUTTON;

    draw();
  }, [draw]);

  // Zoom out from the centre of the canvas
  const handleZoomOut = useCallback(() => {
    const newZoom = zoomRef.current / ZOOM_FACTOR_BUTTON;
    zoomRef.current = Math.max(newZoom, 1);

    panXRef.current = panXRef.current / ZOOM_FACTOR_BUTTON;
    panYRef.current = panYRef.current / ZOOM_FACTOR_BUTTON;

    draw();
  }, [draw]);

  const setBrightness = useCallback(
    (value: number) => {
      brightnessRef.current = value;

      draw();
    },
    [draw],
  );

  const setContrast = useCallback(
    (value: number) => {
      contrastRef.current = value;

      draw();
    },
    [draw],
  );

  const setSaturate = useCallback(
    (value: number) => {
      saturateRef.current = value;

      draw();
    },
    [draw],
  );

  const resetFilters = useCallback(() => {
    brightnessRef.current = DEFAULT_LEVELS.BRIGHTNESS;
    contrastRef.current = DEFAULT_LEVELS.CONTRAST;
    saturateRef.current = DEFAULT_LEVELS.SATURATE;
    zoomRef.current = DEFAULT_LEVELS.ZOOM;
    panXRef.current = DEFAULT_LEVELS.PAN_X;
    panYRef.current = DEFAULT_LEVELS.PAN_Y;

    setZoom(DEFAULT_LEVELS.ZOOM);
    draw();
  }, [draw]);

  return {
    canvasRef,
    setBrightness,
    setContrast,
    setSaturate,
    zoom,
    handleZoomIn,
    handleZoomOut,
    handlePointerDown,
    handlePointerUp,
    handlePointerMove,
    handleWheel,
    resetFilters,
    exportFile,
  };
};

export default usePhotoEditor;
