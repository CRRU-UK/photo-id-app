import type { EdgeDetectionData } from "@/types";

import { useCallback, useEffect, useRef, useState } from "react";

import { IMAGE_EDITS, IMAGE_FILTERS, ZOOM_FACTORS } from "@/constants";
import { getBoundaries, getCanvasFilters } from "@/helpers";

interface UseImageEditorProps {
  file: File;
}

const useImageEditor = ({ file }: UseImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const brightnessRef = useRef<number>(IMAGE_FILTERS.BRIGHTNESS.DEFAULT);
  const contrastRef = useRef<number>(IMAGE_FILTERS.CONTRAST.DEFAULT);
  const saturateRef = useRef<number>(IMAGE_FILTERS.SATURATE.DEFAULT);

  const zoomRef = useRef<number>(IMAGE_EDITS.ZOOM);
  const isPanningRef = useRef<boolean>(false);
  const panRef = useRef({ x: IMAGE_EDITS.PAN_X, y: IMAGE_EDITS.PAN_Y });
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const edgeDetectionRef = useRef<EdgeDetectionData>({
    enabled: false,
  });

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
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (canvas.width !== image.naturalWidth || canvas.height !== image.naturalHeight) {
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
    }

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
      edgeDetection: edgeDetectionRef.current,
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

    const mime = file.type;

    // Create off-screen canvas for export (excludes edge detection filter)
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = image.naturalWidth;
    exportCanvas.height = image.naturalHeight;

    const context = exportCanvas.getContext("2d");

    if (!context) {
      return null;
    }

    // Apply all filters EXCEPT edge detection
    context.filter = getCanvasFilters({
      brightness: brightnessRef.current,
      contrast: contrastRef.current,
      saturate: saturateRef.current,
      edgeDetection: { enabled: false },
    });

    context.drawImage(image, 0, 0);

    return new Promise((resolve) => {
      exportCanvas.toBlob((blob) => {
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
      throttleRef.current ??= requestAnimationFrame(() => {
        draw();
        throttleRef.current = null;
      });
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
    (event: WheelEvent) => {
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

      const delta = event.deltaY > 0 ? 1 / ZOOM_FACTORS.WHEEL : ZOOM_FACTORS.WHEEL;
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
    applyZoom(ZOOM_FACTORS.BUTTON);
  }, [applyZoom]);

  // Zoom out from the centre of the canvas
  const handleZoomOut = useCallback(() => {
    applyZoom(1 / ZOOM_FACTORS.BUTTON);
  }, [applyZoom]);

  /**
   * Sets the brightness level for the image.
   * @param value - Brightness percentage (0-200, default 100)
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
   * @param value - Contrast percentage (0-200, default 100)
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
   * @param value - Saturation percentage (0-200, default 100)
   */
  const setSaturate = useCallback(
    (value: number) => {
      saturateRef.current = value;

      draw();
    },
    [draw],
  );

  /**
   * Toggles the visualization of edges on the image.
   * @param state - Edge detection configuration with enabled state and intensity value
   */
  const setImageDetection = useCallback(
    (state: EdgeDetectionData) => {
      edgeDetectionRef.current = state;

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

    edgeDetectionRef.current = { enabled: false };

    setResetKey((prev) => prev + 1);

    draw();
  }, [draw]);

  return {
    canvasRef,
    setBrightness,
    setContrast,
    setSaturate,
    setImageDetection,
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
