import { useCallback, useRef } from "react";

import type { EdgeDetectionData } from "@/types";

import { IMAGE_FILTERS } from "@/constants";

interface ImageFilters {
  brightness: number;
  contrast: number;
  saturate: number;
  edgeDetection: EdgeDetectionData;
}

export const useImageFilters = () => {
  const brightnessRef = useRef<number>(IMAGE_FILTERS.BRIGHTNESS.DEFAULT);
  const contrastRef = useRef<number>(IMAGE_FILTERS.CONTRAST.DEFAULT);
  const saturateRef = useRef<number>(IMAGE_FILTERS.SATURATE.DEFAULT);
  const edgeDetectionRef = useRef<EdgeDetectionData>({ enabled: false });

  const setBrightness = useCallback((value: number) => {
    brightnessRef.current = value;
  }, []);

  const setContrast = useCallback((value: number) => {
    contrastRef.current = value;
  }, []);

  const setSaturate = useCallback((value: number) => {
    saturateRef.current = value;
  }, []);

  const setEdgeDetection = useCallback((state: EdgeDetectionData) => {
    edgeDetectionRef.current = state;
  }, []);

  const resetFilters = useCallback(() => {
    brightnessRef.current = IMAGE_FILTERS.BRIGHTNESS.DEFAULT;
    contrastRef.current = IMAGE_FILTERS.CONTRAST.DEFAULT;
    saturateRef.current = IMAGE_FILTERS.SATURATE.DEFAULT;
    edgeDetectionRef.current = { enabled: false };
  }, []);

  const getFilters = useCallback((): ImageFilters => {
    return {
      brightness: brightnessRef.current,
      contrast: contrastRef.current,
      saturate: saturateRef.current,
      edgeDetection: edgeDetectionRef.current,
    };
  }, []);

  return {
    setBrightness,
    setContrast,
    setSaturate,
    setEdgeDetection,
    resetFilters,
    getFilters,
  };
};
