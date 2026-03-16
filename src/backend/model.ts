import path from "node:path";

import { renderApiImageInWorker } from "@/backend/workerPool";
import { ANALYSIS_API_REQUEST_TIMEOUT_MS } from "@/constants";
import type { MLMatchResponse, PhotoBody } from "@/types";

type AnalyseStackSettings = {
  endpoint: string;
  token: string;
};

type AnalyseStackOptions = {
  photos: PhotoBody[];
  settings: AnalyseStackSettings;
};

let currentAbortController: AbortController | null = null;

/**
 * Generates a blob from a photo.
 */
const generateImageBlob = async (photo: PhotoBody): Promise<Blob> => {
  const sourcePath = path.join(photo.directory, photo.name);
  const imageBuffer = await renderApiImageInWorker(sourcePath, photo.edits);
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" });

  return blob;
};

/**
 * Sends all photos in a stack to the API /match endpoint. Returns null if the request is cancelled
 * via cancelAnalyseStack.
 */
const analyseStack = async ({
  photos,
  settings,
}: AnalyseStackOptions): Promise<MLMatchResponse | null> => {
  if (photos.length === 0) {
    throw new Error("No photos to analyse");
  }

  if (currentAbortController) {
    currentAbortController.abort();
  }

  const abortController = new AbortController();
  currentAbortController = abortController;

  try {
    const formData = new FormData();

    // All photo blobs are held in memory in FormData until the request body is sent. This is a
    // deliberate trade-off for simplicity; for large stacks memory usage can be high. A pipeline
    // (streaming multipart) would require API support and a more complex implementation.
    for (const photo of photos) {
      if (abortController.signal.aborted) {
        return null;
      }

      const blob = await generateImageBlob(photo);
      formData.append("images", blob, `${path.basename(photo.name, path.extname(photo.name))}.jpg`);
    }

    const endpoint = settings.endpoint.replace(/\/+$/, "");
    const url = `${endpoint}/match`;

    const signal = AbortSignal.any([
      abortController.signal,
      AbortSignal.timeout(ANALYSIS_API_REQUEST_TIMEOUT_MS),
    ]);

    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.token}`,
      },
      body: formData,
      signal,
    };

    console.debug("request", { url, method: options.method });

    const response = await fetch(url, options);

    if (currentAbortController === abortController) {
      currentAbortController = null;
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { detail?: string } | null;
      throw new Error(body?.detail ?? `HTTP ${response.status}`);
    }

    const result = (await response.json()) as MLMatchResponse;

    // Ensure data is sorted by rank ascending
    result.matches = result.matches.toSorted((a, b) => a.rank - b.rank);

    console.debug("response", result);

    return result;
  } catch (error) {
    if (currentAbortController === abortController) {
      currentAbortController = null;
    }

    if (error instanceof Error && error.name === "AbortError") {
      return null;
    }

    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("The request timed out. The API took too long to respond.");
    }

    throw error;
  }
};

/**
 * Cancels any in-flight analyseStack request.
 */
const cancelAnalyseStack = (): void => {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
};

export { analyseStack, cancelAnalyseStack };
