import type { EdgeDetectionData, PhotoEdits } from "@/types";

import { DEFAULT_PHOTO_EDITS, EDGE_DETECTION } from "@/constants";

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
 * @param options.edgeDetection - Edge detection settings including enabled state and intensity value
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
    const edgeContrast = EDGE_DETECTION.CONTRAST + edgeDetection.value * 2;
    return ["grayscale(1)", "invert(1)", `contrast(${edgeContrast}%)`].join(" ");
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

/**
 * Convert screen coordinates to image coordinates
 */
export const getImageCoordinates = ({
  screenX,
  screenY,
  canvas,
  image,
}: {
  screenX: number;
  screenY: number;
  canvas: HTMLCanvasElement | null;
  image: HTMLImageElement | null;
}): {
  x: number;
  y: number;
} | null => {
  if (!canvas || !image) {
    return null;
  }

  const rect = canvas.getBoundingClientRect();

  const screenImageX = screenX - rect.left;
  const screenImageY = screenY - rect.top;

  const scaleX = image.naturalWidth / canvas.clientWidth;
  const scaleY = image.naturalHeight / canvas.clientHeight;

  return {
    x: screenImageX * scaleX,
    y: screenImageY * scaleY,
  };
};

/**
 * Clamp pan values to ensure image stays within canvas bounds
 */
export const clampPan = ({
  pan,
  canvas,
  scaledImage,
}: {
  pan: { x: number; y: number };
  canvas: { width: number; height: number };
  scaledImage: { width: number; height: number };
}): {
  x: number;
  y: number;
} => {
  const boundaryX = getBoundaries(canvas.width, scaledImage.width);
  const boundaryY = getBoundaries(canvas.height, scaledImage.height);

  return {
    x: Math.max(boundaryX.min, Math.min(boundaryX.max, pan.x)),
    y: Math.max(boundaryY.min, Math.min(boundaryY.max, pan.y)),
  };
};

/**
 * Determines if photo edits differ from default values.
 * @param edits - Photo edits to check
 * @returns Returns `true` if any edit value differs from defaults, otherwise `false`.
 */
export const computeIsEdited = (edits: PhotoEdits): boolean =>
  edits.brightness !== DEFAULT_PHOTO_EDITS.brightness ||
  edits.contrast !== DEFAULT_PHOTO_EDITS.contrast ||
  edits.saturate !== DEFAULT_PHOTO_EDITS.saturate ||
  edits.zoom !== DEFAULT_PHOTO_EDITS.zoom ||
  edits.pan.x !== DEFAULT_PHOTO_EDITS.pan.x ||
  edits.pan.y !== DEFAULT_PHOTO_EDITS.pan.y;
