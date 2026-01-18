import type { EdgeDetectionData } from "@/types";

import { useCallback, useRef } from "react";

import { IMAGE_FILTERS } from "@/constants";

interface UseImageFiltersProps {
  onFilterChange: () => void;
}

const useImageFilters = ({ onFilterChange }: UseImageFiltersProps) => {
  const brightnessRef = useRef<number>(IMAGE_FILTERS.BRIGHTNESS.DEFAULT);
  const contrastRef = useRef<number>(IMAGE_FILTERS.CONTRAST.DEFAULT);
  const saturateRef = useRef<number>(IMAGE_FILTERS.SATURATE.DEFAULT);
  const edgeDetectionRef = useRef<EdgeDetectionData>({ enabled: false });

  /**
   * Sets the brightness level for the image.
   * @param value - Brightness percentage (0-200, default 100)
   */
  const setBrightness = useCallback(
    (value: number) => {
      brightnessRef.current = value;
      onFilterChange();
    },
    [onFilterChange],
  );

  /**
   * Sets the contrast level for the image.
   * @param value - Contrast percentage (0-200, default 100)
   */
  const setContrast = useCallback(
    (value: number) => {
      contrastRef.current = value;
      onFilterChange();
    },
    [onFilterChange],
  );

  /**
   * Sets the saturation level for the image.
   * @param value - Saturation percentage (0-200, default 100)
   */
  const setSaturate = useCallback(
    (value: number) => {
      saturateRef.current = value;
      onFilterChange();
    },
    [onFilterChange],
  );

  /**
   * Toggles the visualization of edges on the image.
   * @param state - Edge detection configuration with enabled state and intensity value
   */
  const setEdgeDetection = useCallback(
    (state: EdgeDetectionData) => {
      edgeDetectionRef.current = state;
      onFilterChange();
    },
    [onFilterChange],
  );

  const reset = useCallback(() => {
    brightnessRef.current = IMAGE_FILTERS.BRIGHTNESS.DEFAULT;
    contrastRef.current = IMAGE_FILTERS.CONTRAST.DEFAULT;
    saturateRef.current = IMAGE_FILTERS.SATURATE.DEFAULT;
    edgeDetectionRef.current = { enabled: false };
  }, []);

  return {
    brightnessRef,
    contrastRef,
    saturateRef,
    edgeDetectionRef,
    setBrightness,
    setContrast,
    setSaturate,
    setEdgeDetection,
    reset,
  };
};

export default useImageFilters;
