import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalysisMatchResponse, PhotoBody, PhotoEdits } from "@/types";

type RenderApiImageOptions = { sourcePath: string; edits: PhotoEdits };

const mockRenderApiImage = vi.fn<(options: RenderApiImageOptions) => Promise<Buffer>>();

vi.mock("@/backend/imageRenderer", () => ({
  renderApiImage: (options: RenderApiImageOptions) => mockRenderApiImage(options),
}));

vi.mock("@/backend/projects", () => ({
  resolvePhotoPath: (_directory: string, fileName: string) => `/project/${fileName}`,
}));

const mockFetch = vi.fn<typeof fetch>();
vi.stubGlobal("fetch", mockFetch);

const { analyseMatches, cancelAnalyseMatches } = await import("./analysis");

const defaultSettings = {
  endpoint: "https://api.example.com",
  token: "test-token",
};

const defaultPhoto: PhotoBody = {
  name: "photo.jpg",
  thumbnail: "thumbnails/photo.jpg",
  edits: { brightness: 100, contrast: 100, saturate: 100, zoom: 1, pan: { x: 0, y: 0 } },
  isEdited: false,
};

const successResponse: AnalysisMatchResponse = {
  matches: [
    { rank: 1, id: "047", rating: 0.91, details: "047_20220615_0034.jpg" },
    { rank: 2, id: "012", rating: 0.73, details: "012_20190801_0005.jpg" },
  ],
};

describe(analyseMatches, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderApiImage.mockResolvedValue(Buffer.from("image-data"));
  });

  it("returns ranked matches on a successful response", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    const result = await analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      settings: defaultSettings,
    });

    expect(result).toStrictEqual(successResponse);
  });

  it("sorts matches by rank ascending", async () => {
    const unorderedResponse: AnalysisMatchResponse = {
      matches: [
        { rank: 3, id: "237", rating: 0.71, details: "237_20180623_0152.jpg" },
        { rank: 1, id: "047", rating: 0.91, details: "047_20220615_0034.jpg" },
        { rank: 2, id: "012", rating: 0.73, details: "012_20190801_0005.jpg" },
      ],
    };
    mockFetch.mockResolvedValue(new Response(JSON.stringify(unorderedResponse), { status: 200 }));

    const result = await analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      settings: defaultSettings,
    });

    expect(result?.matches.map(({ rank }) => rank)).toStrictEqual([1, 2, 3]);
  });

  it("sends a POST to the endpoint /match URL", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    await analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      settings: defaultSettings,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/match",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("strips a trailing slash from the endpoint before appending /match", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    const settingsWithTrailingSlash = { ...defaultSettings, endpoint: "https://api.example.com/" };
    await analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      settings: settingsWithTrailingSlash,
    });

    const [url] = mockFetch.mock.calls[0];

    expect(url).toBe("https://api.example.com/match");
  });

  it("sends the Authorization bearer token header", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    await analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      settings: defaultSettings,
    });

    const [, callInit] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
    const headers = callInit.headers as Record<string, string>;

    expect(headers.Authorization).toBe("Bearer test-token");
  });

  it("renders each photo via renderApiImage with its edits", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    const editedPhoto: PhotoBody = {
      ...defaultPhoto,
      edits: { brightness: 150, contrast: 80, saturate: 120, zoom: 2, pan: { x: 10, y: -5 } },
    };

    await analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [editedPhoto],
      settings: defaultSettings,
    });

    expect(mockRenderApiImage).toHaveBeenCalledWith({
      sourcePath: "/project/photo.jpg",
      edits: editedPhoto.edits,
    });
  });

  it("sends one rendered image per photo in the stack", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    const secondPhoto: PhotoBody = { ...defaultPhoto, name: "photo2.jpg" };
    await analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto, secondPhoto],
      settings: defaultSettings,
    });

    expect(mockRenderApiImage).toHaveBeenCalledTimes(2);
  });

  it("throws the API error detail on a 401 response", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: "Invalid or missing token" }), { status: 401 }),
    );

    await expect(
      analyseMatches({
        windowId: 1,
        directory: "/project",
        photos: [defaultPhoto],
        settings: defaultSettings,
      }),
    ).rejects.toThrow("Invalid or missing token");
  });

  it("throws the API error detail on a 422 response", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: "'bad_file.txt' could not be decoded as an image." }), {
        status: 422,
      }),
    );

    await expect(
      analyseMatches({
        windowId: 1,
        directory: "/project",
        photos: [defaultPhoto],
        settings: defaultSettings,
      }),
    ).rejects.toThrow("could not be decoded as an image");
  });

  it("throws a generic HTTP error when the response body has no detail field", async () => {
    mockFetch.mockResolvedValue(new Response("Internal Server Error", { status: 503 }));

    await expect(
      analyseMatches({
        windowId: 1,
        directory: "/project",
        photos: [defaultPhoto],
        settings: defaultSettings,
      }),
    ).rejects.toThrow("HTTP 503");
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

    const promise = analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      settings: defaultSettings,
    });
    cancelAnalyseMatches(1);

    const result = await promise;

    expect(result).toBeNull();
  });

  it("returns null when the request is cancelled and the fetch throws a non-AbortError", async () => {
    mockFetch.mockImplementation((_url, options) => {
      return new Promise((_resolve, reject) => {
        const signal = options?.signal;

        const abort = () => {
          const error = new TypeError("Invalid state: ReadableStream is already closed");
          reject(error);
        };

        if (signal?.aborted) {
          abort();
          return;
        }

        signal?.addEventListener("abort", abort);
      });
    });

    const promise = analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      settings: defaultSettings,
    });
    cancelAnalyseMatches(1);

    const result = await promise;

    expect(result).toBeNull();
  });

  it("throws network errors that are not abort errors", async () => {
    mockFetch.mockRejectedValue(new Error("Network connection failed"));

    await expect(
      analyseMatches({
        windowId: 1,
        directory: "/project",
        photos: [defaultPhoto],
        settings: defaultSettings,
      }),
    ).rejects.toThrow("Network connection failed");
  });

  it("throws when renderApiImage fails", async () => {
    mockRenderApiImage.mockRejectedValue(new Error("Could not load image: file not found"));

    await expect(
      analyseMatches({
        windowId: 1,
        directory: "/project",
        photos: [defaultPhoto],
        settings: defaultSettings,
      }),
    ).rejects.toThrow("Could not load image: file not found");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("throws when called with an empty photos array", async () => {
    await expect(
      analyseMatches({ windowId: 1, directory: "/project", photos: [], settings: defaultSettings }),
    ).rejects.toThrow("No photos to analyse");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null without sending the request when cancelled during image rendering", async () => {
    let renderCount = 0;
    mockRenderApiImage.mockImplementation(() => {
      renderCount = renderCount + 1;
      if (renderCount === 1) {
        cancelAnalyseMatches(1);
      }
      return Promise.resolve(Buffer.from("image-data"));
    });

    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    const secondPhoto: PhotoBody = { ...defaultPhoto, name: "photo2.jpg" };
    const result = await analyseMatches({
      windowId: 1,
      directory: "/project",
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
      analyseMatches({
        windowId: 1,
        directory: "/project",
        photos: [defaultPhoto],
        settings: defaultSettings,
      }),
    ).rejects.toThrow("The request timed out. The API took too long to respond.");
  });

  it("does not log the token", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    await analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      settings: defaultSettings,
    });

    const debugOutput = JSON.stringify(debugSpy.mock.calls);

    expect(debugOutput).not.toContain(defaultSettings.token);

    debugSpy.mockRestore();
  });
});

describe(cancelAnalyseMatches, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderApiImage.mockResolvedValue(Buffer.from("image-data"));
  });

  it("does not throw when there is no in-flight request for the window", () => {
    expect(() => cancelAnalyseMatches(1)).not.toThrow();
  });

  it("only cancels the request for the given window — other windows are unaffected", async () => {
    // The pending resolver for whichever fetch call did NOT see an already-aborted signal —
    // i.e. window B's fetch in this scenario. Window A's signal is aborted before fetch is
    // entered, so its fetch promise rejects immediately and never registers a resolver.
    let pendingResolve: ((value: Response) => void) | null = null;

    mockFetch.mockImplementation(
      (_url, init) =>
        new Promise<Response>((resolve, reject) => {
          const signal = (init as RequestInit | undefined)?.signal as AbortSignal | undefined;
          if (signal?.aborted) {
            reject(new DOMException("aborted", "AbortError"));
            return;
          }
          if (signal) {
            signal.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }
          pendingResolve = resolve;
        }),
    );

    const promiseA = analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      settings: defaultSettings,
    });
    const promiseB = analyseMatches({
      windowId: 2,
      directory: "/project",
      photos: [defaultPhoto],
      settings: defaultSettings,
    });

    // Cancel only window A. Window A's analyseMatches eventually reaches fetch with an
    // already-aborted signal, which the mock rejects synchronously.
    cancelAnalyseMatches(1);

    const resultA = await promiseA;
    expect(resultA).toBeNull();

    // Window B's fetch was registered with a non-aborted signal — its resolver is pending.
    // biome-ignore lint/style/noNonNullAssertion: window B reached fetch before promiseA resolved
    pendingResolve!(new Response(JSON.stringify(successResponse), { status: 200 }));
    const resultB = await promiseB;
    expect(resultB).toStrictEqual(successResponse);
  });
});
