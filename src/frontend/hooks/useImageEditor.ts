import type { EdgeDetectionData } from "@/types";

import { useCallback, useEffect, useRef, useState } from "react";

import { IMAGE_FILTERS } from "@/constants";
import { getCanvasFilters } from "@/helpers";

import useImageTransform from "@/frontend/hooks/useImageTransform";

interface UseImageEditorProps {
  file: File;
}

const useImageEditor = ({ file }: UseImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const brightnessRef = useRef<number>(IMAGE_FILTERS.BRIGHTNESS.DEFAULT);
  const contrastRef = useRef<number>(IMAGE_FILTERS.CONTRAST.DEFAULT);
  const saturateRef = useRef<number>(IMAGE_FILTERS.SATURATE.DEFAULT);

  const isPanningRef = useRef<boolean>(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const edgeDetectionRef = useRef<EdgeDetectionData>({ enabled: false });

  const throttleRef = useRef<number | null>(null);

  const [resetKey, setResetKey] = useState(0);

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

    const zoom = transform.zoomRef.current;
    const centreX = canvas.width / 2;
    const centreY = canvas.height / 2;

    transform.clamp();

    context.translate(centreX + transform.panRef.current.x, centreY + transform.panRef.current.y);
    context.scale(zoom, zoom);
    context.translate(-centreX, -centreY);

    context.filter = getCanvasFilters({
      brightness: brightnessRef.current,
      contrast: contrastRef.current,
      saturate: saturateRef.current,
      edgeDetection: edgeDetectionRef.current,
    });

    context.drawImage(image, 0, 0);
  }, []);

  const transform = useImageTransform({
    canvasRef,
    imageRef,
    onTransformChange: draw,
  });

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

    const zoom = transform.zoomRef.current;
    const centreX = exportCanvas.width / 2;
    const centreY = exportCanvas.height / 2;

    // Apply zoom and pan transformations
    context.translate(centreX + transform.panRef.current.x, centreY + transform.panRef.current.y);
    context.scale(zoom, zoom);
    context.translate(-centreX, -centreY);

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
  }, [file, transform]);

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

      transform.panRef.current.x = transform.panRef.current.x + scaledDeltaX;
      transform.panRef.current.y = transform.panRef.current.y + scaledDeltaY;

      lastPointerRef.current.x = event.clientX;
      lastPointerRef.current.y = event.clientY;

      // Use requestAnimationFrame to throttle draw calls during panning
      throttleRef.current ??= requestAnimationFrame(() => {
        draw();
        throttleRef.current = null;
      });
    },
    [draw, transform],
  );

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false;

    // Cancel any pending animation frame
    if (throttleRef.current !== null) {
      cancelAnimationFrame(throttleRef.current);
      throttleRef.current = null;
    }

    // Ensure final position is within bounds
    transform.clamp();
    draw();
  }, [transform, draw]);

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
  const setEdgeDetection = useCallback(
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

    transform.reset();

    edgeDetectionRef.current = { enabled: false };

    setResetKey((prev) => prev + 1);

    draw();
  }, [draw, transform]);

  return {
    canvasRef,
    setBrightness,
    setContrast,
    setSaturate,
    setEdgeDetection,
    handleZoomIn: transform.handleZoomIn,
    handleZoomOut: transform.handleZoomOut,
    handlePointerDown,
    handlePointerUp,
    handlePointerMove,
    handleWheel: transform.handleWheel,
    resetFilters,
    exportFile,
    resetKey,
  };
};

export default useImageEditor;
