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

  const getCurrentPan = useCallback(() => {
    return getTransform().pan;
  }, [getTransform]);

  const getCurrentZoom = useCallback(() => {
    return getTransform().zoom;
  }, [getTransform]);

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
    getCurrentPan,
  });

  const { handleWheel, handleZoomIn, handleZoomOut } = useZoomInteraction({
    canvasRef,
    imageRef,
    getImageCoords,
    getCurrentZoom,
    getCurrentPan,
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
      draw();
    },
    [setBrightnessInternal, draw],
  );

  /**
   * Sets the contrast level for the image.
   * @param value - Contrast percentage (0-200, default 100)
   */
  const setContrast = useCallback(
    (value: number) => {
      setContrastInternal(value);
      draw();
    },
    [setContrastInternal, draw],
  );

  /**
   * Sets the saturation level for the image.
   * @param value - Saturation percentage (0-200, default 100)
   */
  const setSaturate = useCallback(
    (value: number) => {
      setSaturateInternal(value);
      draw();
    },
    [setSaturateInternal, draw],
  );

  /**
   * Toggles the visualization of edges on the image.
   * @param state - Edge detection configuration with enabled state and intensity value
   */
  const setEdgeDetection = useCallback(
    (state: Parameters<typeof setEdgeDetectionInternal>[0]) => {
      setEdgeDetectionInternal(state);
      draw();
    },
    [setEdgeDetectionInternal, draw],
  );

  const resetAll = useCallback(() => {
    resetFiltersInternal();
    resetTransformInternal();

    setResetKey((prev) => prev + 1);

    draw();
  }, [resetFiltersInternal, resetTransformInternal, draw]);

  return {
    canvasRef,
    imageLoaded,
    setBrightness,
    setContrast,
    setSaturate,
    setEdgeDetection,
    getFilters,
    handleZoomIn,
    handleZoomOut,
    handlePointerDown,
    handlePointerUp,
    handlePointerMove,
    handleWheel,
    resetAll,
    exportFile,
    resetKey,
  };
};

export default useImageEditor;
