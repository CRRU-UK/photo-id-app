import { DEFAULT_PHOTO_EDITS, EDGE_DETECTION, PHOTO_PROTOCOL_SCHEME, ROUTES } from "@/constants";
import { photoBodySchema } from "@/schemas";
import type { EdgeDetectionData, PhotoBody, PhotoEdits } from "@/types";

/**
 * Encodes photo data for the edit window URL query.
 */
export const encodeEditPayload = (data: PhotoBody): string => {
  const json = JSON.stringify(data);
  if (typeof Buffer === "undefined") {
    const bytes = new TextEncoder().encode(json);
    return btoa(String.fromCodePoint(...bytes));
  }
  return Buffer.from(json, "utf8").toString("base64");
};

/**
 * Decodes photo data from the edit window URL query.
 */
export const decodeEditPayload = (encoded: string): PhotoBody => {
  let decoded: string;

  if (typeof Buffer === "undefined") {
    const binary = atob(encoded);
    decoded = new TextDecoder().decode(
      Uint8Array.from(binary, (character) => character.codePointAt(0) ?? 0),
    );
  } else {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  }

  return photoBodySchema.parse(JSON.parse(decoded));
};

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

/**
 * Convert viewport (client) coordinates to image coordinates by inverting the canvas rendering
 * transform. Without `zoom`/`pan` (defaults: 1 and {0,0}), inverts `fitScale` only. Pass zoom and
 * pan to get the true image pixel under the cursor.
 * @see [ARCHITECTURE.md](../ARCHITECTURE.md) "Canvas rendering and coordinate system"
 */
export const getImageCoordinates = ({
  clientX,
  clientY,
  canvas,
  image,
  zoom = 1,
  pan = { x: 0, y: 0 },
}: {
  clientX: number;
  clientY: number;
  canvas: HTMLCanvasElement | null;
  image: HTMLImageElement | null;
  zoom?: number;
  pan?: { x: number; y: number };
}): {
  x: number;
  y: number;
} | null => {
  if (!canvas || !image) {
    return null;
  }

  const rect = canvas.getBoundingClientRect();

  const offsetX = clientX - rect.left;
  const offsetY = clientY - rect.top;

  const fitScale = Math.min(
    canvas.clientWidth / image.naturalWidth,
    canvas.clientHeight / image.naturalHeight,
  );

  return {
    x:
      (offsetX - canvas.clientWidth / 2 - pan.x * fitScale) / (fitScale * zoom) +
      image.naturalWidth / 2,
    y:
      (offsetY - canvas.clientHeight / 2 - pan.y * fitScale) / (fitScale * zoom) +
      image.naturalHeight / 2,
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

/**
 * Determines if the given hash is an edit window.
 * @param hash - Hash to check
 * @returns Returns `true` if the hash is an edit window, otherwise `false`.
 */
export const isEditWindow = (hash: string): boolean => hash.startsWith(`#${ROUTES.EDIT}`);

/**
 * Strips all whitespace (including invisible characters).
 */
export const stripWhitespace = (value: string): string => value.replaceAll(/\s+/g, "");

/**
 * Builds a valid photo:// URL from a directory path and file name. Normalizes to forward slashes
 * and encodes each path segment so spaces, #, ? etc. are safe. Always produces photo:/// (three
 * slashes) followed by encoded path segments, mirroring the file:// URL format so the main process
 * can swap the scheme and use url.fileURLToPath().
 */
export const buildPhotoUrl = (directory: string, fileName: string): string => {
  const normalizedPath = `${directory}/${fileName}`.replaceAll("\\", "/");
  const segments = normalizedPath.split("/").filter(Boolean);

  const encoded = segments.map(encodeURIComponent).join("/");

  return `${PHOTO_PROTOCOL_SCHEME}:///${encoded}`;
};
