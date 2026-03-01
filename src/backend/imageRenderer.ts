import path from "node:path";

import { type Canvas, createCanvas, loadImage } from "@napi-rs/canvas";

import {
  ANALYSIS_API_IMAGE_JPEG_QUALITY,
  ANALYSIS_API_IMAGE_SIZE,
  THUMBNAIL_SIZE,
} from "@/constants";
import { getCanvasFilters } from "@/helpers";
import type { PhotoEdits } from "@/types";

type RenderCanvasOptions = {
  sourcePath: string;
  edits: PhotoEdits;
};

const drawImageWithEditsToCanvas = async ({ sourcePath, edits }: RenderCanvasOptions) => {
  const image = await loadImage(sourcePath);

  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");

  const centreX = canvas.width / 2;
  const centreY = canvas.height / 2;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.translate(centreX + edits.pan.x, centreY + edits.pan.y);
  context.scale(edits.zoom, edits.zoom);
  context.translate(-centreX, -centreY);

  context.filter = getCanvasFilters({
    brightness: edits.brightness,
    contrast: edits.contrast,
    saturate: edits.saturate,
    edgeDetection: { enabled: false },
  });

  context.drawImage(image, 0, 0, image.width, image.height);

  return canvas;
};

/**
 * Scales a canvas so that its longest edge equals maxSize, preserving aspect ratio.
 */
const scaleCanvas = (source: Canvas, maxSize: number): Canvas => {
  const isLandscape = source.width >= source.height;
  const scale = isLandscape ? maxSize / source.width : maxSize / source.height;

  const outputWidth = Math.round(source.width * scale);
  const outputHeight = Math.round(source.height * scale);

  const output = createCanvas(outputWidth, outputHeight);
  const context = output.getContext("2d");

  context.drawImage(source, 0, 0, source.width, source.height, 0, 0, outputWidth, outputHeight);

  return output;
};

export const renderThumbnailWithEdits = async ({
  sourcePath,
  edits,
}: RenderCanvasOptions): Promise<Buffer> => {
  const canvasWithEdits = await drawImageWithEditsToCanvas({ sourcePath, edits });
  const scaled = scaleCanvas(canvasWithEdits, THUMBNAIL_SIZE);

  const extension = path.extname(sourcePath).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") {
    return scaled.encode("jpeg");
  }

  return scaled.encode("png");
};

export const renderApiImage = async ({
  sourcePath,
  edits,
}: RenderCanvasOptions): Promise<Buffer> => {
  const canvasWithEdits = await drawImageWithEditsToCanvas({ sourcePath, edits });
  const scaled = scaleCanvas(canvasWithEdits, ANALYSIS_API_IMAGE_SIZE);

  return scaled.encode("jpeg", ANALYSIS_API_IMAGE_JPEG_QUALITY);
};

export const renderFullImageWithEdits = async ({
  sourcePath,
  edits,
}: RenderCanvasOptions): Promise<Buffer> => {
  const canvasWithEdits = await drawImageWithEditsToCanvas({ sourcePath, edits });

  const extension = path.extname(sourcePath).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") {
    return canvasWithEdits.encode("jpeg");
  }

  return canvasWithEdits.encode("png");
};
