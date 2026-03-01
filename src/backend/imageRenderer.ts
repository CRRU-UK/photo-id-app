import path from "node:path";

import { createCanvas, loadImage } from "@napi-rs/canvas";

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

export const renderThumbnailWithEdits = async ({
  sourcePath,
  edits,
}: RenderCanvasOptions): Promise<Buffer> => {
  const canvasWithEdits = await drawImageWithEditsToCanvas({ sourcePath, edits });

  const isLandscape = canvasWithEdits.width >= canvasWithEdits.height;
  const scale = isLandscape
    ? THUMBNAIL_SIZE / canvasWithEdits.width
    : THUMBNAIL_SIZE / canvasWithEdits.height;

  const thumbnailWidth = Math.round(canvasWithEdits.width * scale);
  const thumbnailHeight = Math.round(canvasWithEdits.height * scale);

  const thumbnailCanvas = createCanvas(thumbnailWidth, thumbnailHeight);
  const thumbnailContext = thumbnailCanvas.getContext("2d");

  thumbnailContext.drawImage(
    canvasWithEdits,
    0,
    0,
    canvasWithEdits.width,
    canvasWithEdits.height,
    0,
    0,
    thumbnailWidth,
    thumbnailHeight,
  );

  const extension = path.extname(sourcePath).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") {
    return thumbnailCanvas.encode("jpeg");
  }

  return thumbnailCanvas.encode("png");
};

export const renderApiImage = async ({
  sourcePath,
  edits,
}: RenderCanvasOptions): Promise<Buffer> => {
  const canvasWithEdits = await drawImageWithEditsToCanvas({ sourcePath, edits });

  const isLandscape = canvasWithEdits.width >= canvasWithEdits.height;
  const scale = isLandscape
    ? ANALYSIS_API_IMAGE_SIZE / canvasWithEdits.width
    : ANALYSIS_API_IMAGE_SIZE / canvasWithEdits.height;

  const outputWidth = Math.round(canvasWithEdits.width * scale);
  const outputHeight = Math.round(canvasWithEdits.height * scale);

  const outputCanvas = createCanvas(outputWidth, outputHeight);
  const outputContext = outputCanvas.getContext("2d");

  outputContext.drawImage(
    canvasWithEdits,
    0,
    0,
    canvasWithEdits.width,
    canvasWithEdits.height,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return outputCanvas.encode("jpeg", ANALYSIS_API_IMAGE_JPEG_QUALITY);
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
