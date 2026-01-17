import { useCallback, useEffect, useRef, useState } from "react";

import { getBoundaries, getCanvasFilters } from "@/helpers";

interface UseImageEditorProps {
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

const useImageEditor = ({ file }: UseImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const brightnessRef = useRef<number>(DEFAULT_LEVELS.BRIGHTNESS);
  const contrastRef = useRef<number>(DEFAULT_LEVELS.CONTRAST);
  const saturateRef = useRef<number>(DEFAULT_LEVELS.SATURATE);
  const zoomRef = useRef<number>(DEFAULT_LEVELS.ZOOM);

  const isPanningRef = useRef<boolean>(false);
  const panRef = useRef({ x: DEFAULT_LEVELS.PAN_X, y: DEFAULT_LEVELS.PAN_Y });
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const throttleRef = useRef<number | null>(null);

  const [resetKey, setResetKey] = useState(0);

  // Convert screen coordinates to image coordinates
  const getImageCoordinates = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      const image = imageRef.current;

      if (!canvas || !image) {
        return null;
      }

      const rect = canvas.getBoundingClientRect();
      const screenImageX = screenX - rect.left;
      const screenImageY = screenY - rect.top;

      const scaleX = image.naturalWidth / canvas.clientWidth;
      const scaleY = image.naturalHeight / canvas.clientHeight;

      return {
        x: screenImageX * scaleX,
        y: screenImageY * scaleY,
      };
    },
    [],
  );

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

    const boundaryX = getBoundaries(canvas.width, scaledImageWidth);
    const boundaryY = getBoundaries(canvas.height, scaledImageHeight);

    panRef.current.x = Math.max(boundaryX.min, Math.min(boundaryX.max, panRef.current.x));
    panRef.current.y = Math.max(boundaryY.min, Math.min(boundaryY.max, panRef.current.y));
  }, []);

  const draw = useCallback(() => {
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

    context.translate(centreX + panRef.current.x, centreY + panRef.current.y);
    context.scale(zoom, zoom);
    context.translate(-centreX, -centreY);

    context.filter = getCanvasFilters({
      brightness: brightnessRef.current,
      contrast: contrastRef.current,
      saturate: saturateRef.current,
    });

    context.drawImage(image, 0, 0);
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
  }, [file, draw]);

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
    lastPointerRef.current.x = event.clientX;
    lastPointerRef.current.y = event.clientY;
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

      const deltaX = event.clientX - lastPointerRef.current.x;
      const deltaY = event.clientY - lastPointerRef.current.y;

      const scaleX = image.naturalWidth / canvas.clientWidth;
      const scaleY = image.naturalHeight / canvas.clientHeight;

      const scaledDeltaX = deltaX * scaleX;
      const scaledDeltaY = deltaY * scaleY;

      panRef.current.x = panRef.current.x + scaledDeltaX;
      panRef.current.y = panRef.current.y + scaledDeltaY;

      lastPointerRef.current.x = event.clientX;
      lastPointerRef.current.y = event.clientY;

      // Use requestAnimationFrame to throttle draw calls during panning
      if (throttleRef.current === null) {
        throttleRef.current = requestAnimationFrame(() => {
          draw();
          throttleRef.current = null;
        });
      }
    },
    [draw],
  );

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false;

    // Cancel any pending animation frame
    if (throttleRef.current !== null) {
      cancelAnimationFrame(throttleRef.current);
      throttleRef.current = null;
    }

    // Ensure final position is within bounds
    clamp();
    draw();
  }, [clamp, draw]);

  // Zoom the image towards where the cursor currently is
  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();

      const canvas = canvasRef.current;
      const image = imageRef.current;

      if (!canvas || !image) {
        return;
      }

      const imageCoords = getImageCoordinates(event.clientX, event.clientY);
      if (!imageCoords) {
        return;
      }

      const zoom = zoomRef.current;
      const centreX = canvas.width / 2;
      const centreY = canvas.height / 2;

      const imagePointX = (imageCoords.x - centreX - panRef.current.x) / zoom + centreX;
      const imagePointY = (imageCoords.y - centreY - panRef.current.y) / zoom + centreY;

      const delta = event.deltaY > 0 ? 1 / ZOOM_FACTOR_WHEEL : ZOOM_FACTOR_WHEEL;
      const newZoom = zoomRef.current * delta;

      zoomRef.current = Math.max(newZoom, 1);
      panRef.current.x = imageCoords.x - centreX - (imagePointX - centreX) * zoomRef.current;
      panRef.current.y = imageCoords.y - centreY - (imagePointY - centreY) * zoomRef.current;

      clamp();
      draw();
    },
    [clamp, draw, getImageCoordinates],
  );

  // Apply zoom with given factor, scales pan proportionally
  const applyZoom = useCallback(
    (zoomFactor: number) => {
      zoomRef.current = Math.max(zoomRef.current * zoomFactor, 1);
      panRef.current.x = panRef.current.x * zoomFactor;
      panRef.current.y = panRef.current.y * zoomFactor;

      clamp();
      draw();
    },
    [clamp, draw],
  );

  // Zoom in from the centre of the canvas
  const handleZoomIn = useCallback(() => {
    applyZoom(ZOOM_FACTOR_BUTTON);
  }, [applyZoom]);

  // Zoom out from the centre of the canvas
  const handleZoomOut = useCallback(() => {
    applyZoom(1 / ZOOM_FACTOR_BUTTON);
  }, [applyZoom]);

  /**
   * Sets the brightness level for the image.
   * @param value - Brightness percentage value (0-200, where 100 is normal)
   */
  const setBrightness = useCallback(
    (value: number) => {
      brightnessRef.current = value;

      draw();
    },
    [draw],
  );

  /**
   * Sets the contrast level for the image.
   * @param value - Contrast percentage value (0-200, where 100 is normal)
   */
  const setContrast = useCallback(
    (value: number) => {
      contrastRef.current = value;

      draw();
    },
    [draw],
  );

  /**
   * Sets the saturation level for the image.
   * @param value - Saturation percentage value (0-200, where 100 is normal)
   */
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
    panRef.current = { x: DEFAULT_LEVELS.PAN_X, y: DEFAULT_LEVELS.PAN_Y };

    setResetKey((prev) => prev + 1);
    draw();
  }, [draw]);

  return {
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
    resetKey,
  };
};

export default useImageEditor;
