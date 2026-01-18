import { useCallback, useEffect, useRef, useState } from "react";

import { getCanvasFilters } from "@/helpers";

import useImageFilters from "@/frontend/hooks/useImageFilters";
import useImageTransform from "@/frontend/hooks/useImageTransform";

interface UseImageEditorProps {
  file: File;
}

const useImageEditor = ({ file }: UseImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const isPanningRef = useRef<boolean>(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

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
      brightness: filters.brightnessRef.current,
      contrast: filters.contrastRef.current,
      saturate: filters.saturateRef.current,
      edgeDetection: filters.edgeDetectionRef.current,
    });

    context.drawImage(image, 0, 0);
  }, []);

  const filters = useImageFilters({
    onFilterChange: draw,
  });

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
      brightness: filters.brightnessRef.current,
      contrast: filters.contrastRef.current,
      saturate: filters.saturateRef.current,
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
  }, [file, filters, transform]);

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

  const resetFilters = useCallback(() => {
    filters.reset();
    transform.reset();

    setResetKey((prev) => prev + 1);

    draw();
  }, [draw, filters, transform]);

  return {
    canvasRef,
    setBrightness: filters.setBrightness,
    setContrast: filters.setContrast,
    setSaturate: filters.setSaturate,
    setEdgeDetection: filters.setEdgeDetection,
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
