import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { IMAGE_FILTERS } from "@/constants";
import type { EdgeDetectionData, ImageFilters } from "@/types";
import { useCanvasRenderer } from "./imageEditor/useCanvasRenderer";
import { useImageLoader } from "./imageEditor/useImageLoader";
import { useImageTransform } from "./imageEditor/useImageTransform";
import { useLoupe } from "./imageEditor/useLoupe";
import { usePanInteraction } from "./imageEditor/usePanInteraction";
import { useZoomInteraction } from "./imageEditor/useZoomInteraction";

interface UseImageEditorProps {
  file: File;
  loupeEnabled: boolean;
  onEdit?: () => void;
  onError?: () => void;
}

const useImageEditor = ({ file, loupeEnabled, onEdit, onError }: UseImageEditorProps) => {
  const [resetKey, setResetKey] = useState(0);

  const { imageRef, imageLoaded } = useImageLoader(file, { onError });

  const brightnessRef = useRef<number>(IMAGE_FILTERS.BRIGHTNESS.DEFAULT);
  const contrastRef = useRef<number>(IMAGE_FILTERS.CONTRAST.DEFAULT);
  const saturateRef = useRef<number>(IMAGE_FILTERS.SATURATE.DEFAULT);
  const edgeDetectionRef = useRef<EdgeDetectionData>({ enabled: false });

  const getFilters = useCallback(
    (): ImageFilters => ({
      brightness: brightnessRef.current,
      contrast: contrastRef.current,
      saturate: saturateRef.current,
      edgeDetection: edgeDetectionRef.current,
    }),
    [],
  );

  const resetFiltersInternal = useCallback(() => {
    brightnessRef.current = IMAGE_FILTERS.BRIGHTNESS.DEFAULT;
    contrastRef.current = IMAGE_FILTERS.CONTRAST.DEFAULT;
    saturateRef.current = IMAGE_FILTERS.SATURATE.DEFAULT;
    edgeDetectionRef.current = { enabled: false };
  }, []);

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

  const { loupeCanvasRef, loupeContainerRef, handleLoupeMove, handleLoupeLeave, redrawLoupe } =
    useLoupe({
      enabled: loupeEnabled,
      imageRef,
      canvasRef,
      getFilters,
      getTransform,
    });

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
      redrawLoupe();
      onEdit?.();
    },
    [getTransform, setPanInternal, clamp, canvasRef, drawThrottled, redrawLoupe, onEdit],
  );

  // Wraps the drag-pan setter so a pointer-drag also marks the edit as dirty
  const handleDragPan = useCallback(
    (pan: { x: number; y: number }) => {
      setPanInternal(pan);
      onEdit?.();
    },
    [setPanInternal, onEdit],
  );

  const { handlePointerDown, handlePointerMove, handlePointerUp, handleDirectionalPan } =
    usePanInteraction({
      canvasRef,
      imageRef,
      onPan: handleDragPan,
      onDirectionalPan: handlePan,
      onDraw: draw,
      onDrawThrottled: drawThrottled,
      onCancelThrottle: cancelThrottle,
      getTransform,
    });

  const {
    handleWheel: handleWheelInternal,
    handleZoomIn: handleZoomInInternal,
    handleZoomOut: handleZoomOutInternal,
  } = useZoomInteraction({
    canvasRef,
    imageRef,
    getImageCoords,
    getTransform,
    setZoom: setZoomInternal,
    setPan: setPanInternal,
    clamp,
    onDraw: draw,
  });

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      handleWheelInternal(event);
      redrawLoupe();
      onEdit?.();
    },
    [handleWheelInternal, redrawLoupe, onEdit],
  );

  const handleZoomIn = useCallback(() => {
    handleZoomInInternal();
    redrawLoupe();
    onEdit?.();
  }, [handleZoomInInternal, redrawLoupe, onEdit]);

  const handleZoomOut = useCallback(() => {
    handleZoomOutInternal();
    redrawLoupe();
    onEdit?.();
  }, [handleZoomOutInternal, redrawLoupe, onEdit]);

  /**
   * Builds a brightness/contrast/saturation setter (each 0-200, default 100): writes its ref,
   * re-renders via the throttled draw, and marks the edit dirty.
   */
  const makeFilterSetter = useCallback(
    (ref: RefObject<number>) => (value: number) => {
      ref.current = value;
      drawThrottled();
      onEdit?.();
    },
    [drawThrottled, onEdit],
  );

  const setBrightness = useMemo(() => makeFilterSetter(brightnessRef), [makeFilterSetter]);
  const setContrast = useMemo(() => makeFilterSetter(contrastRef), [makeFilterSetter]);
  const setSaturate = useMemo(() => makeFilterSetter(saturateRef), [makeFilterSetter]);

  /**
   * Toggles the visualization of edges on the image.
   * @param state - Edge detection configuration with enabled state and intensity value
   */
  const setEdgeDetection = useCallback(
    (state: EdgeDetectionData) => {
      edgeDetectionRef.current = state;
      drawThrottled();
      redrawLoupe();
    },
    [drawThrottled, redrawLoupe],
  );

  const resetAll = useCallback(() => {
    resetFiltersInternal();
    resetTransformInternal();

    setResetKey((prev) => prev + 1);

    draw();
    redrawLoupe();
  }, [resetFiltersInternal, resetTransformInternal, draw, redrawLoupe]);

  const applyEdits = useCallback(
    (value: {
      brightness: number;
      contrast: number;
      saturate: number;
      zoom: number;
      pan: { x: number; y: number };
    }) => {
      brightnessRef.current = value.brightness;
      contrastRef.current = value.contrast;
      saturateRef.current = value.saturate;
      setZoomInternal(value.zoom);
      setPanInternal({ x: value.pan.x, y: value.pan.y });

      setResetKey((prev) => prev + 1);

      draw();
    },
    [setZoomInternal, setPanInternal, draw],
  );

  // All values below are already stable (useCallback/useRef), so no useMemo wrapper needed
  return {
    refs: {
      canvasRef,
      imageRef,
      loupeCanvasRef,
      loupeContainerRef,
    },
    state: {
      imageLoaded,
      resetKey,
    },
    getters: {
      getFilters,
      getTransform,
    },
    filters: {
      setBrightness,
      setContrast,
      setSaturate,
      setEdgeDetection,
    },
    handlers: {
      handleZoomIn,
      handleZoomOut,
      handlePointerDown,
      handlePointerUp,
      handlePointerMove,
      handleWheel,
      handleDirectionalPan,
      handleLoupeMove,
      handleLoupeLeave,
    },
    actions: {
      draw,
      resetAll,
      applyEdits,
    },
  };
};

export default useImageEditor;
