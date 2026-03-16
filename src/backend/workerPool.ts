/**
 * Manages a fixed-size pool of image worker threads. Tasks are queued and dispatched to the first
 * available worker, so the pool size controls peak concurrency (and memory usage) while the main
 * thread stays completely unblocked.
 *
 * The pool is lazily initialised on the first task and persists for the lifetime of the app
 * process, avoiding repeated worker startup costs.
 */
import os from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";

import {
  ANALYSIS_API_IMAGE_JPEG_QUALITY,
  ANALYSIS_API_IMAGE_SIZE,
  IMAGE_WORKER_POOL_SIZE,
  THUMBNAIL_SIZE,
} from "@/constants";
import type { PhotoEdits } from "@/types";

import type { WorkerResult } from "@/backend/imageWorker";

type TaskType = "renderThumbnail" | "renderFullImage" | "renderApiImage";

type PendingTask = {
  taskId: number;
  type: TaskType;
  sourcePath: string;
  edits: PhotoEdits;
  maxSize?: number;
  jpegQuality?: number;
  resolve: (buffer: Buffer) => void;
  reject: (error: Error) => void;
};

let workers: Worker[] = [];
let availableWorkers: Worker[] = [];
let taskQueue: PendingTask[] = [];
let nextTaskId = 0;
let initialised = false;

/**
 * Resolves the path to the compiled image worker entry point. During development Vite serves from
 * `.vite/build/`, while in production the worker is bundled alongside the main process output.
 */
const getWorkerPath = (): string => {
  // In the Vite/Forge build the worker entry is compiled alongside the main process.
  // __dirname points to the directory of the compiled main bundle.
  return path.join(__dirname, "imageWorker.js");
};

const dispatch = () => {
  while (availableWorkers.length > 0 && taskQueue.length > 0) {
    const worker = availableWorkers.pop()!;
    const task = taskQueue.shift()!;

    const onMessage = (result: WorkerResult) => {
      worker.off("message", onMessage);
      worker.off("error", onError);

      if ("error" in result) {
        task.reject(new Error(result.error));
      } else {
        task.resolve(Buffer.from(result.buffer));
      }

      availableWorkers.push(worker);
      dispatch();
    };

    const onError = (error: Error) => {
      worker.off("message", onMessage);
      worker.off("error", onError);

      task.reject(error);

      // Worker errored — do not push back to available pool. Replace it.
      replaceWorker(worker);
      dispatch();
    };

    worker.on("message", onMessage);
    worker.on("error", onError);

    worker.postMessage({
      taskId: task.taskId,
      type: task.type,
      sourcePath: task.sourcePath,
      edits: task.edits,
      maxSize: task.maxSize,
      jpegQuality: task.jpegQuality,
    });
  }
};

const createWorker = (): Worker => {
  const workerPath = getWorkerPath();
  return new Worker(workerPath);
};

const replaceWorker = (oldWorker: Worker) => {
  const index = workers.indexOf(oldWorker);
  void oldWorker.terminate();

  const newWorker = createWorker();

  if (index >= 0) {
    workers[index] = newWorker;
  } else {
    workers.push(newWorker);
  }

  availableWorkers.push(newWorker);
};

const ensureInitialised = () => {
  if (initialised) {
    return;
  }

  const poolSize = Math.max(1, Math.min(os.cpus().length, IMAGE_WORKER_POOL_SIZE));

  for (let i = 0; i < poolSize; i++) {
    const worker = createWorker();
    workers.push(worker);
    availableWorkers.push(worker);
  }

  initialised = true;
};

const submitTask = (
  type: TaskType,
  sourcePath: string,
  edits: PhotoEdits,
  maxSize?: number,
  jpegQuality?: number,
): Promise<Buffer> => {
  ensureInitialised();

  return new Promise<Buffer>((resolve, reject) => {
    const taskId = nextTaskId++;

    taskQueue.push({
      taskId,
      type,
      sourcePath,
      edits,
      maxSize,
      jpegQuality,
      resolve,
      reject,
    });

    dispatch();
  });
};

/**
 * Renders a thumbnail (scaled to THUMBNAIL_SIZE) using a worker thread.
 */
export const renderThumbnailInWorker = (sourcePath: string, edits: PhotoEdits): Promise<Buffer> =>
  submitTask("renderThumbnail", sourcePath, edits, THUMBNAIL_SIZE);

/**
 * Renders a full-resolution image with edits applied using a worker thread.
 */
export const renderFullImageInWorker = (sourcePath: string, edits: PhotoEdits): Promise<Buffer> =>
  submitTask("renderFullImage", sourcePath, edits);

/**
 * Renders an API-sized image (scaled, JPEG) using a worker thread.
 */
export const renderApiImageInWorker = (sourcePath: string, edits: PhotoEdits): Promise<Buffer> =>
  submitTask(
    "renderApiImage",
    sourcePath,
    edits,
    ANALYSIS_API_IMAGE_SIZE,
    ANALYSIS_API_IMAGE_JPEG_QUALITY,
  );

/**
 * Terminates all worker threads. Call during app shutdown for a clean exit.
 */
export const terminateWorkerPool = async (): Promise<void> => {
  const terminations = workers.map((worker) => worker.terminate());
  await Promise.all(terminations);

  workers = [];
  availableWorkers = [];
  taskQueue = [];
  initialised = false;
};
