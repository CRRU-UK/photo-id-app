import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MLMatchResponse, MLModel, PhotoBody, PhotoEdits } from "@/types";

type RenderApiImageOptions = { sourcePath: string; edits: PhotoEdits };

const mockRenderApiImage = vi.fn<(options: RenderApiImageOptions) => Promise<Buffer>>();

vi.mock("@/backend/imageRenderer", () => ({
  renderApiImage: (options: RenderApiImageOptions) => mockRenderApiImage(options),
}));

const mockFetch = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", mockFetch);

const { analyseStack, cancelAnalyseStack } = await import("./model");

const defaultSettings: MLModel = {
  id: "test-model-id",
  name: "Test Model",
  endpoint: "https://api.example.com",
  apiKey: "test-api-key",
};

const defaultPhoto: PhotoBody = {
  directory: "/project",
  name: "photo.jpg",
  thumbnail: "thumbnails/photo.jpg",
  edits: { brightness: 100, contrast: 100, saturate: 100, zoom: 1, pan: { x: 0, y: 0 } },
  isEdited: false,
};

const successResponse: MLMatchResponse = {
  matches: [
    { rank: 1, id: "047", rating: 0.91, details: "047_20220615_0034.jpg" },
    { rank: 2, id: "012", rating: 0.73, details: "012_20190801_0005.jpg" },
  ],
};

describe(analyseStack, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderApiImage.mockResolvedValue(Buffer.from("image-data"));
  });

  it("returns ranked matches on a successful response", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    const result = await analyseStack({ photos: [defaultPhoto], settings: defaultSettings });

    expect(result).toStrictEqual(successResponse);
  });

  it("sends a POST to the endpoint /match URL", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    await analyseStack({ photos: [defaultPhoto], settings: defaultSettings });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/match",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("strips a trailing slash from the endpoint before appending /match", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    const settingsWithTrailingSlash = { ...defaultSettings, endpoint: "https://api.example.com/" };
    await analyseStack({ photos: [defaultPhoto], settings: settingsWithTrailingSlash });

    const [url] = mockFetch.mock.calls[0];

    expect(url).toBe("https://api.example.com/match");
  });

  it("sends the Authorization bearer token header", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    await analyseStack({ photos: [defaultPhoto], settings: defaultSettings });

    const [, callInit] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const headers = callInit.headers as Record<string, string>;

    expect(headers["Authorization"]).toBe("Bearer test-api-key");
  });

  it("renders each photo via renderApiImage with its edits", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    const editedPhoto: PhotoBody = {
      ...defaultPhoto,
      edits: { brightness: 150, contrast: 80, saturate: 120, zoom: 2, pan: { x: 10, y: -5 } },
    };

    await analyseStack({ photos: [editedPhoto], settings: defaultSettings });

    expect(mockRenderApiImage).toHaveBeenCalledWith({
      sourcePath: "/project/photo.jpg",
      edits: editedPhoto.edits,
    });
  });

  it("sends one rendered image per photo in the stack", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    const secondPhoto: PhotoBody = { ...defaultPhoto, name: "photo2.jpg" };
    await analyseStack({ photos: [defaultPhoto, secondPhoto], settings: defaultSettings });

    expect(mockRenderApiImage).toHaveBeenCalledTimes(2);
  });

  it("throws the API error detail on a 401 response", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: "Invalid or missing API key" }), { status: 401 }),
    );

    await expect(
      analyseStack({ photos: [defaultPhoto], settings: defaultSettings }),
    ).rejects.toThrowError("Invalid or missing API key");
  });

  it("throws the API error detail on a 422 response", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: "'bad_file.txt' could not be decoded as an image." }), {
        status: 422,
      }),
    );

    await expect(
      analyseStack({ photos: [defaultPhoto], settings: defaultSettings }),
    ).rejects.toThrowError("could not be decoded as an image");
  });

  it("throws a generic HTTP error when the response body has no detail field", async () => {
    mockFetch.mockResolvedValue(new Response("Internal Server Error", { status: 503 }));

    await expect(
      analyseStack({ photos: [defaultPhoto], settings: defaultSettings }),
    ).rejects.toThrowError("HTTP 503");
  });

  it("returns null when the request is cancelled", async () => {
    mockFetch.mockImplementation((_url, options) => {
      return new Promise((_resolve, reject) => {
        const signal = options?.signal;

        const abort = () => {
          const error = new Error("The operation was aborted.");
          error.name = "AbortError";
          reject(error);
        };

        if (signal?.aborted) {
          abort();
          return;
        }

        signal?.addEventListener("abort", abort);
      });
    });

    const promise = analyseStack({ photos: [defaultPhoto], settings: defaultSettings });
    cancelAnalyseStack();

    const result = await promise;

    expect(result).toBeNull();
  });

  it("throws network errors that are not abort errors", async () => {
    mockFetch.mockRejectedValue(new Error("Network connection failed"));

    await expect(
      analyseStack({ photos: [defaultPhoto], settings: defaultSettings }),
    ).rejects.toThrowError("Network connection failed");
  });

  it("throws when called with an empty photos array", async () => {
    await expect(analyseStack({ photos: [], settings: defaultSettings })).rejects.toThrowError(
      "No photos to analyse.",
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null without sending the request when cancelled during image rendering", async () => {
    let renderCount = 0;
    mockRenderApiImage.mockImplementation(() => {
      renderCount = renderCount + 1;
      if (renderCount === 1) {
        cancelAnalyseStack();
      }
      return Promise.resolve(Buffer.from("image-data"));
    });

    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    const secondPhoto: PhotoBody = { ...defaultPhoto, name: "photo2.jpg" };
    const result = await analyseStack({
      photos: [defaultPhoto, secondPhoto],
      settings: defaultSettings,
    });

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("throws a timeout error when the request exceeds the timeout", async () => {
    mockFetch.mockRejectedValue(
      (() => {
        const error = new Error("The operation timed out.");
        error.name = "TimeoutError";
        return error;
      })(),
    );

    await expect(
      analyseStack({ photos: [defaultPhoto], settings: defaultSettings }),
    ).rejects.toThrowError("The request timed out. The server took too long to respond.");
  });

  it("does not log the API key", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    await analyseStack({ photos: [defaultPhoto], settings: defaultSettings });

    const debugOutput = JSON.stringify(debugSpy.mock.calls);

    expect(debugOutput).not.toContain(defaultSettings.apiKey);

    debugSpy.mockRestore();
  });
});

describe(cancelAnalyseStack, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderApiImage.mockResolvedValue(Buffer.from("image-data"));
  });

  it("does not throw when there is no in-flight request", () => {
    expect(() => cancelAnalyseStack()).not.toThrowError();
  });
});
