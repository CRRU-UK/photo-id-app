import { useCallback, useEffect, useRef, useState } from "react";

import { IMAGE_EDITS, IMAGE_FILTERS, MAX_CANVAS_DIMENSION, ZOOM_FACTORS } from "@/constants";
import { getBoundaries, getCanvasFilters } from "@/helpers";

interface UseImageEditorProps {
  file: File;
}

const useImageEditor = ({ file }: UseImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasScaleRef = useRef<number>(1);

  const brightnessRef = useRef<number>(IMAGE_FILTERS.BRIGHTNESS.DEFAULT);
  const contrastRef = useRef<number>(IMAGE_FILTERS.CONTRAST.DEFAULT);
  const saturateRef = useRef<number>(IMAGE_FILTERS.SATURATE.DEFAULT);
  const zoomRef = useRef<number>(IMAGE_EDITS.ZOOM);

  const isPanningRef = useRef<boolean>(false);
  const panRef = useRef({ x: IMAGE_EDITS.PAN_X, y: IMAGE_EDITS.PAN_Y });
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const throttleRef = useRef<number | null>(null);

  const [resetKey, setResetKey] = useState(0);

  // Convert screen coordinates to canvas coordinates
  const getCanvasCoordinates = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current;

      if (!canvas) {
        return null;
      }

      const rect = canvas.getBoundingClientRect();
      const screenImageX = screenX - rect.left;
      const screenImageY = screenY - rect.top;

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

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
    const scaledImageWidth = canvas.width * zoom;
    const scaledImageHeight = canvas.height * zoom;

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
    context.clearRect(0, 0, canvas.width, canvas.height);

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

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  }, [clamp]);

  useEffect(() => {
    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      imageRef.current = image;

      const canvas = canvasRef.current;
      if (canvas) {
        // Calculate scaled canvas dimensions to limit memory usage
        const maxDimension = Math.max(image.naturalWidth, image.naturalHeight);
        const scale = Math.min(1, MAX_CANVAS_DIMENSION / maxDimension);
        const scaledWidth = Math.round(image.naturalWidth * scale);
        const scaledHeight = Math.round(image.naturalHeight * scale);

        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        canvasScaleRef.current = scale;
      }

      draw();
    };

    image.src = url;

    return () => {
      URL.revokeObjectURL(url);
      imageRef.current = null;
      offscreenCanvasRef.current = null;

      // Cancel any pending requestAnimationFrame
      if (throttleRef.current !== null) {
        cancelAnimationFrame(throttleRef.current);
        throttleRef.current = null;
      }
    };
  }, [file, draw]);

  const exportFile = useCallback(async (): Promise<File | null> => {
    const image = imageRef.current;
    if (!image) {
      return null;
    }

    // Create or reuse off-screen canvas at full resolution for export
    let offscreenCanvas = offscreenCanvasRef.current;
    if (!offscreenCanvas) {
      offscreenCanvas = document.createElement("canvas");
      offscreenCanvasRef.current = offscreenCanvas;
    }

    offscreenCanvas.width = image.naturalWidth;
    offscreenCanvas.height = image.naturalHeight;

    const context = offscreenCanvas.getContext("2d");
    if (!context) {
      return null;
    }

    const zoom = zoomRef.current;
    const centreX = offscreenCanvas.width / 2;
    const centreY = offscreenCanvas.height / 2;

    // Scale pan values back to full resolution
    const scale = canvasScaleRef.current;
    if (scale <= 0 || !Number.isFinite(scale)) {
      return null;
    }

    const fullResPanX = panRef.current.x / scale;
    const fullResPanY = panRef.current.y / scale;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

    context.translate(centreX + fullResPanX, centreY + fullResPanY);
    context.scale(zoom, zoom);
    context.translate(-centreX, -centreY);

    context.filter = getCanvasFilters({
      brightness: brightnessRef.current,
      contrast: contrastRef.current,
      saturate: saturateRef.current,
    });

    context.drawImage(image, 0, 0);

    const mime = file.type;

    return new Promise((resolve) => {
      if (!offscreenCanvas) {
        return resolve(null);
      }

      offscreenCanvas.toBlob((blob) => {
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

      if (!canvas) {
        return;
      }

      const deltaX = event.clientX - lastPointerRef.current.x;
      const deltaY = event.clientY - lastPointerRef.current.y;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

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
    (event: WheelEvent | React.WheelEvent<HTMLCanvasElement>) => {
      event.preventDefault();

      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const canvasCoords = getCanvasCoordinates(event.clientX, event.clientY);
      if (!canvasCoords) {
        return;
      }

      const zoom = zoomRef.current;
      const centreX = canvas.width / 2;
      const centreY = canvas.height / 2;

      const canvasPointX = (canvasCoords.x - centreX - panRef.current.x) / zoom + centreX;
      const canvasPointY = (canvasCoords.y - centreY - panRef.current.y) / zoom + centreY;

      const delta = event.deltaY > 0 ? 1 / ZOOM_FACTORS.WHEEL : ZOOM_FACTORS.WHEEL;
      const newZoom = zoomRef.current * delta;

      zoomRef.current = Math.max(newZoom, 1);
      panRef.current.x = canvasCoords.x - centreX - (canvasPointX - centreX) * zoomRef.current;
      panRef.current.y = canvasCoords.y - centreY - (canvasPointY - centreY) * zoomRef.current;

      clamp();
      draw();
    },
    [clamp, draw, getCanvasCoordinates],
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
    applyZoom(ZOOM_FACTORS.WHEEL);
  }, [applyZoom]);

  // Zoom out from the centre of the canvas
  const handleZoomOut = useCallback(() => {
    applyZoom(1 / ZOOM_FACTORS.WHEEL);
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
    brightnessRef.current = IMAGE_FILTERS.BRIGHTNESS.DEFAULT;
    contrastRef.current = IMAGE_FILTERS.CONTRAST.DEFAULT;
    saturateRef.current = IMAGE_FILTERS.SATURATE.DEFAULT;
    zoomRef.current = IMAGE_EDITS.ZOOM;
    panRef.current = { x: IMAGE_EDITS.PAN_X, y: IMAGE_EDITS.PAN_Y };

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
