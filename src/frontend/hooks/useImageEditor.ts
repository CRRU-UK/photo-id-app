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
    getCurrentPan: () => getTransform().pan,
  });

  const { handleWheel, handleZoomIn, handleZoomOut } = useZoomInteraction({
    canvasRef,
    imageRef,
    getImageCoords,
    getCurrentZoom: () => getTransform().zoom,
    getCurrentPan: () => getTransform().pan,
    setZoom: setZoomInternal,
    setPan: setPanInternal,
    clamp,
    onDraw: draw,
  });

  const { exportFile } = useImageExport({
    imageRef,
    canvasRef,
    file,
    getFilters,
    getTransform,
  });

  const setBrightness = useCallback(
    (value: number) => {
      setBrightnessInternal(value);
      draw();
    },
    [setBrightnessInternal, draw],
  );

  const setContrast = useCallback(
    (value: number) => {
      setContrastInternal(value);
      draw();
    },
    [setContrastInternal, draw],
  );

  const setSaturate = useCallback(
    (value: number) => {
      setSaturateInternal(value);
      draw();
    },
    [setSaturateInternal, draw],
  );

  const setEdgeDetection = useCallback(
    (state: Parameters<typeof setEdgeDetectionInternal>[0]) => {
      setEdgeDetectionInternal(state);
      draw();
    },
    [setEdgeDetectionInternal, draw],
  );

  const resetFilters = useCallback(() => {
    resetFiltersInternal();
    resetTransformInternal();
    setResetKey((prev) => prev + 1);
    draw();
  }, [resetFiltersInternal, resetTransformInternal, draw]);

  return {
    canvasRef,
    setBrightness,
    setContrast,
    setSaturate,
    setEdgeDetection,
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
