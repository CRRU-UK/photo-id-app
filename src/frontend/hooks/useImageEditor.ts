import { useCallback, useEffect, useState } from "react";

import { useCanvasRenderer } from "./imageEditor/useCanvasRenderer";
import { useImageExport } from "./imageEditor/useImageExport";
import { useImageFilters } from "./imageEditor/useImageFilters";
import { useImageLoader } from "./imageEditor/useImageLoader";
import { useImageTransform } from "./imageEditor/useImageTransform";
import { usePanInteraction } from "./imageEditor/usePanInteraction";
import { useZoomInteraction } from "./imageEditor/useZoomInteraction";

interface UseImageEditorProps {
  file: File;
}

const useImageEditor = ({ file }: UseImageEditorProps) => {
  const [resetKey, setResetKey] = useState(0);

  const { imageRef, imageLoaded } = useImageLoader(file);

  const {
    setBrightness: setBrightnessInternal,
    setContrast: setContrastInternal,
    setSaturate: setSaturateInternal,
    setEdgeDetection: setEdgeDetectionInternal,
    resetFilters: resetFiltersInternal,
    getFilters,
  } = useImageFilters();

  const {
    getTransform,
    setZoom: setZoomInternal,
    setPan: setPanInternal,
    clamp,
    getImageCoords,
    resetTransform: resetTransformInternal,
  } = useImageTransform(imageRef);

  const { canvasRef, draw, drawThrottled, cancelThrottle } = useCanvasRenderer({
    imageRef,
    getFilters,
    getTransform,
    clamp,
  });

  useEffect(() => {
    if (imageLoaded) {
      draw();
    }
  }, [imageLoaded, draw]);

  const { handlePointerDown, handlePointerMove, handlePointerUp } = usePanInteraction({
    canvasRef,
    imageRef,
    onPan: setPanInternal,
    onDraw: draw,
    onDrawThrottled: drawThrottled,
    onCancelThrottle: cancelThrottle,
    getTransform,
  });

  const { handleWheel, handleZoomIn, handleZoomOut } = useZoomInteraction({
    canvasRef,
    imageRef,
    getImageCoords,
    getTransform,
    setZoom: setZoomInternal,
    setPan: setPanInternal,
    clamp,
    onDraw: draw,
  });

  const { exportFile } = useImageExport({
    imageRef,
    file,
    getFilters,
    getTransform,
  });

  /**
   * Sets the brightness level for the image.
   * @param value - Brightness percentage (0-200, default 100)
   */
  const setBrightness = useCallback(
    (value: number) => {
      setBrightnessInternal(value);
      drawThrottled();
    },
    [setBrightnessInternal, drawThrottled],
  );

  /**
   * Sets the contrast level for the image.
   * @param value - Contrast percentage (0-200, default 100)
   */
  const setContrast = useCallback(
    (value: number) => {
      setContrastInternal(value);
      drawThrottled();
    },
    [setContrastInternal, drawThrottled],
  );

  /**
   * Sets the saturation level for the image.
   * @param value - Saturation percentage (0-200, default 100)
   */
  const setSaturate = useCallback(
    (value: number) => {
      setSaturateInternal(value);
      drawThrottled();
    },
    [setSaturateInternal, drawThrottled],
  );

  /**
   * Toggles the visualization of edges on the image.
   * @param state - Edge detection configuration with enabled state and intensity value
   */
  const setEdgeDetection = useCallback(
    (state: Parameters<typeof setEdgeDetectionInternal>[0]) => {
      setEdgeDetectionInternal(state);
      drawThrottled();
    },
    [setEdgeDetectionInternal, drawThrottled],
  );

  /**
   * Pans the image by a delta amount in image coordinates.
   * @param delta - Delta pan values in image coordinates
   */
  const handlePan = useCallback(
    (delta: { x: number; y: number }) => {
      const currentTransform = getTransform();
      const newPan = {
        x: currentTransform.pan.x + delta.x,
        y: currentTransform.pan.y + delta.y,
      };

      setPanInternal(newPan);
      clamp(canvasRef.current);
      drawThrottled();
    },
    [getTransform, setPanInternal, clamp, canvasRef, drawThrottled],
  );

  const resetAll = useCallback(() => {
    resetFiltersInternal();
    resetTransformInternal();

    setResetKey((prev) => prev + 1);

    draw();
  }, [resetFiltersInternal, resetTransformInternal, draw]);

  const applyEdits = useCallback(
    (value: {
      brightness: number;
      contrast: number;
      saturate: number;
      zoom: number;
      pan: { x: number; y: number };
    }) => {
      setBrightnessInternal(value.brightness);
      setContrastInternal(value.contrast);
      setSaturateInternal(value.saturate);
      setZoomInternal(value.zoom);
      setPanInternal({ x: value.pan.x, y: value.pan.y });

      setResetKey((prev) => prev + 1);

      draw();
    },
    [
      setBrightnessInternal,
      setContrastInternal,
      setSaturateInternal,
      setZoomInternal,
      setPanInternal,
      draw,
    ],
  );

  return {
    canvasRef,
    imageRef,
    imageLoaded,
    setBrightness,
    setContrast,
    setSaturate,
    setEdgeDetection,
    getFilters,
    getTransform,
    handleZoomIn,
    handleZoomOut,
    handlePointerDown,
    handlePointerUp,
    handlePointerMove,
    handleWheel,
    handlePan,
    resetAll,
    applyEdits,
    exportFile,
    resetKey,
  };
};

export default useImageEditor;
