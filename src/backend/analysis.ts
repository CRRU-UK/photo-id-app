import path from "node:path";

import { renderApiImage } from "@/backend/imageRenderer";
import { resolvePhotoPath } from "@/backend/projects";
import { ANALYSIS_API_REQUEST_TIMEOUT_MS } from "@/constants";
import { analysisMatchResponseSchema } from "@/schemas";
import type {
  AnalysisFailure,
  AnalysisMatchResponse,
  AnalysisMatchResult,
  AnalysisMatchResults,
  PhotoBody,
} from "@/types";

type AnalyseMatchesProvider = {
  name: string;
  endpoint: string;
  token: string;
};

type AnalyseMatchesOptions = {
  windowId: number;
  directory: string;
  photos: PhotoBody[];
  providers: AnalyseMatchesProvider[];
};

type ImageBlob = {
  blob: Blob;
  filename: string;
};

const abortControllersByWindow = new Map<number, AbortController>();

/**
 * Generates a blob from a photo. Resolves the source path against the active project directory.
 */
const generateImageBlob = async (directory: string, photo: PhotoBody): Promise<Blob> => {
  const sourcePath = resolvePhotoPath(directory, photo.name);
  const imageBuffer = await renderApiImage({ sourcePath, edits: photo.edits });

  const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/jpeg" });

  return blob;
};

/**
 * Renders one JPEG blob per photo. Returns null if the abort controller is signalled during
 * processing.
 *
 * Blobs are rendered once and shared by every provider request, so the pixel data is only held in
 * memory once no matter how many providers are selected. All photo blobs are held in memory until
 * the request bodies are sent. This is a deliberate trade-off for simplicity. For large stacks
 * memory usage can be high, and because provider requests are dispatched concurrently the socket
 * buffers and uplink usage scale with the number of selected providers. A pipeline (streaming
 * multipart) would require API support and a more complex implementation.
 */
const buildImageBlobs = async (
  directory: string,
  photos: PhotoBody[],
  abortController: AbortController,
): Promise<ImageBlob[] | null> => {
  const blobs: ImageBlob[] = [];

  for (const photo of photos) {
    if (abortController.signal.aborted) {
      return null;
    }

    const blob = await generateImageBlob(directory, photo);
    const filename = `${path.basename(photo.name, path.extname(photo.name))}.jpg`;

    blobs.push({ blob, filename });
  }

  return blobs;
};

/**
 * Builds a FormData object for a single provider request from the shared image blobs.
 */
const buildFormData = (blobs: ImageBlob[]): FormData => {
  const formData = new FormData();

  for (const { blob, filename } of blobs) {
    formData.append("images", blob, filename);
  }

  return formData;
};

/**
 * Trims trailing slashes from an endpoint so the `/match` path can be appended. Uses a loop rather
 * than a `/\/+$/` regex: that pattern backtracks quadratically over a long run of slashes, and
 * endpoints come from user input.
 */
const trimTrailingSlashes = (endpoint: string): string => {
  let end = endpoint.length;

  while (end > 0 && endpoint[end - 1] === "/") {
    end = end - 1;
  }

  return endpoint.slice(0, end);
};

/**
 * Performs the POST to a provider's `/match` endpoint and validates the response.
 */
const performMatchRequest = async (
  formData: FormData,
  provider: AnalyseMatchesProvider,
  abortController: AbortController,
): Promise<AnalysisMatchResponse> => {
  const endpoint = trimTrailingSlashes(provider.endpoint);
  const url = `${endpoint}/match`;

  const signal = AbortSignal.any([
    abortController.signal,
    AbortSignal.timeout(ANALYSIS_API_REQUEST_TIMEOUT_MS),
  ]);

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.token}`,
    },
    body: formData,
    signal,
  };

  console.debug("request", { url, method: options.method });

  const response = await fetch(url, options);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `HTTP ${response.status}`);
  }

  const result = analysisMatchResponseSchema.parse(await response.json());

  console.debug("response", { provider: provider.name, ...result });

  return result;
};

/**
 * Requests matches from a single provider and annotates each match with the provider name so the
 * combined results table can attribute them.
 */
const requestProviderMatches = async (
  blobs: ImageBlob[],
  provider: AnalyseMatchesProvider,
  abortController: AbortController,
): Promise<AnalysisMatchResult[]> => {
  const response = await performMatchRequest(buildFormData(blobs), provider, abortController);

  return response.matches.map((match) => ({ ...match, provider: provider.name }));
};

/**
 * Turns an error thrown by a single provider request into a message for the failures list. Aborts
 * are not handled here: the only signal that can abort a request is the window's abort controller,
 * and `analyseMatches` returns null on an aborted controller before failures are collected.
 */
const describeRequestError = (error: unknown): string => {
  if (error instanceof Error && error.name === "TimeoutError") {
    return "The request timed out. The API took too long to respond.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
};

/**
 * Sends all photos in a stack to every selected provider's /match endpoint and combines the
 * responses. Requests are dispatched concurrently; a provider that fails is reported in `failures`
 * rather than failing the whole analysis, so results from the providers that succeeded are still
 * usable. Returns null if the request is cancelled via `cancelAnalyseMatches` for the same window.
 * Triggering a fresh analysis for the same `windowId` aborts and replaces any in-flight one for that
 * window; analyses in other windows are unaffected.
 */
const analyseMatches = async ({
  windowId,
  directory,
  photos,
  providers,
}: AnalyseMatchesOptions): Promise<AnalysisMatchResults | null> => {
  if (photos.length === 0) {
    throw new Error("No photos to analyse");
  }

  const previous = abortControllersByWindow.get(windowId);
  if (previous) {
    previous.abort();
  }

  const abortController = new AbortController();
  abortControllersByWindow.set(windowId, abortController);

  try {
    let blobs: ImageBlob[] | null;

    try {
      blobs = await buildImageBlobs(directory, photos, abortController);
    } catch (error) {
      // A cancel mid-render can surface as a render error; treat it as a cancellation, not a failure
      if (abortController.signal.aborted) {
        return null;
      }

      throw error;
    }

    if (!blobs) {
      return null;
    }

    const settled = await Promise.allSettled(
      providers.map((provider) => requestProviderMatches(blobs, provider, abortController)),
    );

    if (abortController.signal.aborted) {
      return null;
    }

    const matches: AnalysisMatchResult[] = [];
    const failures: AnalysisFailure[] = [];

    settled.forEach((result, index) => {
      if (result.status === "fulfilled") {
        matches.push(...result.value);
        return;
      }

      failures.push({
        provider: providers[index].name,
        message: describeRequestError(result.reason),
      });
    });

    /**
     * Results are interleaved by rank so each provider's rank 1 sits together at the top, then
     * every rank 2, and so on, which lets ranks be compared side by side without paginating.
     * `toSorted` is stable and matches were collected in provider order, so within one rank the
     * providers stay in the order they were selected. Providers returning fewer matches simply
     * drop out of the later rank groups.
     */
    return {
      matches: matches.toSorted((a, b) => a.rank - b.rank),
      failures,
      providerCount: providers.length,
    };
  } finally {
    if (abortControllersByWindow.get(windowId) === abortController) {
      abortControllersByWindow.delete(windowId);
    }
  }
};

/**
 * Cancels the in-flight analysis for a specific window, if any. Analyses in other windows are
 * not affected.
 */
const cancelAnalyseMatches = (windowId: number): void => {
  const controller = abortControllersByWindow.get(windowId);
  if (!controller) {
    return;
  }

  controller.abort();
  abortControllersByWindow.delete(windowId);
};

export { analyseMatches, cancelAnalyseMatches };
