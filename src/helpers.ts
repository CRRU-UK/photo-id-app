import type { EdgeDetectionData } from "@/types";

import { EDGE_DETECTION } from "@/constants";

export const getAlphabetLetter = (index: number): string => {
  let result = "";

  while (index > 0) {
    index--;
    result = String.fromCodePoint((index % 26) + 65) + result;
    index = Math.floor(index / 26);
  }

  return result;
};

export const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
};

/**
 * Generates CSS filter string for canvas.
 * @param options - Options
 * @param options.brightness - Brightness percentage
 * @param options.contrast - Contrast percentage
 * @param options.saturate - Saturation percentage
 * @param options.edgeDetection - Whether to enable edge detection filters
 * @returns CSS filter string.
 */
export const getCanvasFilters = ({
  brightness,
  contrast,
  saturate,
  edgeDetection,
}: {
  brightness: number;
  contrast: number;
  saturate: number;
  edgeDetection: EdgeDetectionData;
}): string => {
  if (edgeDetection.enabled) {
    const contrast = EDGE_DETECTION.CONTRAST + edgeDetection.value * 2;
    return ["grayscale(1)", "invert(1)", `contrast(${contrast}%)`].join(" ");
  }

  return [`brightness(${brightness}%)`, `contrast(${contrast}%)`, `saturate(${saturate}%)`].join(
    " ",
  );
};

// Calculate boundaries for given canvas and image size
export const getBoundaries = (
  canvasSize: number,
  scaledImageSize: number,
): { min: number; max: number } => ({
  min: (canvasSize - scaledImageSize) / 2,
  max: (scaledImageSize - canvasSize) / 2,
});
