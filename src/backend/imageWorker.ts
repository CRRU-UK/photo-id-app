/**
 * Worker thread entry point for image rendering operations. Runs @napi-rs/canvas in a separate
 * thread so the main Electron process stays responsive during heavy image processing (thumbnail
 * generation, exports, ML image preparation).
 *
 * Communication protocol: receives task messages via `parentPort`, processes them, and posts back
 * results with the rendered buffer transferred (zero-copy) to the main thread.
 */

import path from "node:path";
import { parentPort } from "node:worker_threads";

import { type Canvas, createCanvas, loadImage } from "@napi-rs/canvas";

import { getCanvasFilters } from "@/helpers";
import type { PhotoEdits } from "@/types";

type TaskType = "renderThumbnail" | "renderFullImage" | "renderApiImage";

type TaskMessage = {
  taskId: number;
  type: TaskType;
  sourcePath: string;
  edits: PhotoEdits;
  maxSize?: number;
  jpegQuality?: number;
};

type SuccessResult = {
  taskId: number;
  buffer: ArrayBuffer;
};

type ErrorResult = {
  taskId: number;
  error: string;
};

export type WorkerResult = SuccessResult | ErrorResult;

const drawImageWithEditsToCanvas = async (sourcePath: string, edits: PhotoEdits) => {
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

const encodeCanvas = async (canvas: Canvas, sourcePath: string): Promise<Buffer> => {
  const extension = path.extname(sourcePath).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") {
    return canvas.encode("jpeg");
  }

  return canvas.encode("png");
};

const handleTask = async (msg: TaskMessage): Promise<void> => {
  try {
    const canvasWithEdits = await drawImageWithEditsToCanvas(msg.sourcePath, msg.edits);

    let buffer: Buffer;

    if (msg.type === "renderThumbnail" && msg.maxSize) {
      const scaled = scaleCanvas(canvasWithEdits, msg.maxSize);
      buffer = await encodeCanvas(scaled, msg.sourcePath);
    } else if (msg.type === "renderApiImage" && msg.maxSize) {
      const scaled = scaleCanvas(canvasWithEdits, msg.maxSize);
      buffer = await scaled.encode("jpeg", msg.jpegQuality);
    } else {
      // renderFullImage
      buffer = await encodeCanvas(canvasWithEdits, msg.sourcePath);
    }

    /**
     * Transfer the underlying ArrayBuffer (zero-copy) back to the main thread. The slice creates an
     * owned ArrayBuffer from the possibly-shared backing store.
     */
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    ) as ArrayBuffer;

    parentPort!.postMessage({ taskId: msg.taskId, buffer: arrayBuffer } as SuccessResult, [
      arrayBuffer,
    ]);
  } catch (error) {
    parentPort!.postMessage({
      taskId: msg.taskId,
      error: error instanceof Error ? error.message : String(error),
    } as ErrorResult);
  }
};

parentPort!.on("message", (msg: TaskMessage) => {
  void handleTask(msg);
});
