import path from "node:path";

import { renderApiImage } from "@/backend/imageRenderer";
import type { MLMatchResponse, MLModel, PhotoBody } from "@/types";

type AnalyseStackOptions = {
  photos: PhotoBody[];
  settings: MLModel;
};

let currentAbortController: AbortController | null = null;

/**
 * Sends all photos in a stack to the ML API /match endpoint. Renders each photo at API image size
 * (longest edge 1000px, JPEG quality 85%) with edits applied before sending.
 *
 * Returns null when the request was cancelled via cancelAnalyseStack.
 */
const analyseStack = async ({
  photos,
  settings,
}: AnalyseStackOptions): Promise<MLMatchResponse | null> => {
  if (currentAbortController) {
    currentAbortController.abort();
  }

  const abortController = new AbortController();
  currentAbortController = abortController;

  try {
    const formData = new FormData();

    for (const photo of photos) {
      const sourcePath = path.join(photo.directory, photo.name);
      const imageBuffer = await renderApiImage({ sourcePath, edits: photo.edits });
      const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" });

      formData.append("images", blob, `${path.basename(photo.name, path.extname(photo.name))}.jpg`);
    }

    const endpoint = settings.endpoint.replace(/\/+$/, "");
    const url = `${endpoint}/match`;

    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: formData,
      signal: abortController.signal,
    };

    console.debug("Request:", {
      url,
      method: options.method,
      headers: options.headers,
    });

    const response = await fetch(url, options);

    currentAbortController = null;

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { detail?: string } | null;
      throw new Error(body?.detail ?? `HTTP ${response.status}`);
    }

    const result = (await response.json()) as MLMatchResponse;

    console.debug("Response:", result);

    return result;
  } catch (error) {
    currentAbortController = null;

    if (error instanceof Error && error.name === "AbortError") {
      return null;
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
