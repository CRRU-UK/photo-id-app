import { useCallback, useEffect, useRef, useState } from "react";

import { getCanvasFilters } from "@/helpers";

import useImageFilters from "@/frontend/hooks/useImageFilters";
import useImagePanning from "@/frontend/hooks/useImagePanning";
import useImageTransform from "@/frontend/hooks/useImageTransform";

interface UseImageEditorProps {
  file: File;
}

const useImageEditor = ({ file }: UseImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [resetKey, setResetKey] = useState(0);

  // Initialize hooks first, passing a placeholder draw function via ref
  // The ref will be updated with the actual draw function after it's defined
  const drawRef = useRef<() => void>(() => {});

  const filters = useImageFilters({
    onFilterChange: () => drawRef.current(),
  });

  const transform = useImageTransform({
    canvasRef,
    imageRef,
    onTransformChange: () => drawRef.current(),
  });

  const panning = useImagePanning({
    canvasRef,
    imageRef,
    panRef: transform.panRef,
    onPanChange: () => drawRef.current(),
    clampFn: transform.clamp,
  });

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
  }, [filters, transform]);

  // Update the draw ref to point to the latest draw function
  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

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
      panning.cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the panning object creates a new reference on every render, only cleanup is needed
  }, [file, draw, panning.cleanup]);

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
    handlePointerDown: panning.handlePointerDown,
    handlePointerUp: panning.handlePointerUp,
    handlePointerMove: panning.handlePointerMove,
    handleWheel: transform.handleWheel,
    resetFilters,
    exportFile,
    resetKey,
  };
};

export default useImageEditor;
