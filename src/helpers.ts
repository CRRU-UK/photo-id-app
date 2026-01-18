import { EdgeDetectionData } from "@/types";

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
  const filterString = [`brightness(${brightness}%)`];

  if (edgeDetection.enabled) {
    filterString.push("invert(100%)", "saturate(0)", `contrast(${edgeDetection.value}%)`);
  } else {
    filterString.push(`contrast(${contrast}%)`, `saturate(${saturate}%)`);
  }

  return filterString.join(" ");
};

// Calculate boundaries for given canvas and image size
export const getBoundaries = (
  canvasSize: number,
  scaledImageSize: number,
): { min: number; max: number } => ({
  min: (canvasSize - scaledImageSize) / 2,
  max: (scaledImageSize - canvasSize) / 2,
});
