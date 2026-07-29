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

const defaultProvider = {
  name: "Test Provider",
  endpoint: "https://api.example.com",
  token: "test-token",
};

const defaultProviders = [defaultProvider];

const secondProvider = {
  name: "Second Provider",
  endpoint: "https://second.example.com",
  token: "second-token",
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

const annotatedSuccessMatches = successResponse.matches.map((match) => ({
  ...match,
  provider: defaultProvider.name,
}));

describe(analyseMatches, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderApiImage.mockResolvedValue(Buffer.from("image-data"));
  });

  it("returns matches annotated with the provider name on a successful response", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    const result = await analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      providers: defaultProviders,
    });

    expect(result).toStrictEqual({ matches: annotatedSuccessMatches, failures: [] });
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
      providers: defaultProviders,
    });

    expect(result?.matches.map(({ rank }) => rank)).toStrictEqual([1, 2, 3]);
  });

  it("sends a POST to the endpoint /match URL", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    await analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      providers: defaultProviders,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/match",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("strips a trailing slash from the endpoint before appending /match", async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    await analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      providers: [{ ...defaultProvider, endpoint: "https://api.example.com/" }],
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
      providers: defaultProviders,
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
      providers: defaultProviders,
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
      providers: defaultProviders,
    });

    expect(mockRenderApiImage).toHaveBeenCalledTimes(2);
  });

  it("reports the API error detail from a 401 response as a provider failure", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: "Invalid or missing token" }), { status: 401 }),
    );

    const result = await analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      providers: defaultProviders,
    });

    expect(result).toStrictEqual({
      matches: [],
      failures: [{ provider: defaultProvider.name, message: "Invalid or missing token" }],
    });
  });

  it("reports the API error detail from a 422 response as a provider failure", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: "'bad_file.txt' could not be decoded as an image." }), {
        status: 422,
      }),
    );

    const result = await analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      providers: defaultProviders,
    });

    expect(result?.failures[0].message).toContain("could not be decoded as an image");
  });

  it("reports a generic HTTP error when the response body has no detail field", async () => {
    mockFetch.mockResolvedValue(new Response("Internal Server Error", { status: 503 }));

    const result = await analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      providers: defaultProviders,
    });

    expect(result?.failures[0].message).toBe("HTTP 503");
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
      providers: defaultProviders,
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
      providers: defaultProviders,
    });
    cancelAnalyseMatches(1);

    const result = await promise;

    expect(result).toBeNull();
  });

  it("reports network errors that are not abort errors as provider failures", async () => {
    mockFetch.mockRejectedValue(new Error("Network connection failed"));

    const result = await analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      providers: defaultProviders,
    });

    expect(result?.failures).toStrictEqual([
      { provider: defaultProvider.name, message: "Network connection failed" },
    ]);
  });

  it("throws when renderApiImage fails", async () => {
    mockRenderApiImage.mockRejectedValue(new Error("Could not load image: file not found"));

    await expect(
      analyseMatches({
        windowId: 1,
        directory: "/project",
        photos: [defaultPhoto],
        providers: defaultProviders,
      }),
    ).rejects.toThrow("Could not load image: file not found");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("throws when called with an empty photos array", async () => {
    await expect(
      analyseMatches({
        windowId: 1,
        directory: "/project",
        photos: [],
        providers: defaultProviders,
      }),
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
      providers: defaultProviders,
    });

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("reports a timeout error when the request exceeds the timeout", async () => {
    mockFetch.mockRejectedValue(
      (() => {
        const error = new Error("The operation timed out.");
        error.name = "TimeoutError";
        return error;
      })(),
    );

    const result = await analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      providers: defaultProviders,
    });

    expect(result?.failures[0].message).toBe(
      "The request timed out. The API took too long to respond.",
    );
  });

  it("does not log the token", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    mockFetch.mockResolvedValue(new Response(JSON.stringify(successResponse), { status: 200 }));

    await analyseMatches({
      windowId: 1,
      directory: "/project",
      photos: [defaultPhoto],
      providers: defaultProviders,
    });

    const debugOutput = JSON.stringify(debugSpy.mock.calls);

    expect(debugOutput).not.toContain(defaultProvider.token);

    debugSpy.mockRestore();
  });

  describe("multiple providers", () => {
    /**
     * Deliberately rated lower than the first provider's rank 2 match, so interleaving by rank
     * produces a different order to sorting by rating.
     */
    const secondProviderResponse: AnalysisMatchResponse = {
      matches: [
        { rank: 1, id: "331", rating: 0.6, details: "331_20210402_0091.jpg" },
        { rank: 2, id: "418", rating: 0.55, details: "418_20170518_0022.jpg" },
      ],
    };

    const mockResponsePerProvider = () => {
      mockFetch.mockImplementation((url) => {
        const body = String(url).startsWith(secondProvider.endpoint)
          ? secondProviderResponse
          : successResponse;

        return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
      });
    };

    it("sends one request per provider with that provider's own token", async () => {
      mockResponsePerProvider();

      await analyseMatches({
        windowId: 1,
        directory: "/project",
        photos: [defaultPhoto],
        providers: [defaultProvider, secondProvider],
      });

      const calls = mockFetch.mock.calls as unknown as [string, RequestInit][];
      const tokensByUrl = Object.fromEntries(
        calls.map(([url, init]) => [url, (init.headers as Record<string, string>).Authorization]),
      );

      expect(tokensByUrl).toStrictEqual({
        "https://api.example.com/match": "Bearer test-token",
        "https://second.example.com/match": "Bearer second-token",
      });
    });

    it("renders each photo only once regardless of how many providers are selected", async () => {
      mockResponsePerProvider();

      const secondPhoto: PhotoBody = { ...defaultPhoto, name: "photo2.jpg" };

      await analyseMatches({
        windowId: 1,
        directory: "/project",
        photos: [defaultPhoto, secondPhoto],
        providers: [defaultProvider, secondProvider],
      });

      expect(mockRenderApiImage).toHaveBeenCalledTimes(2);
    });

    it("interleaves matches from every provider by rank", async () => {
      mockResponsePerProvider();

      const result = await analyseMatches({
        windowId: 1,
        directory: "/project",
        photos: [defaultPhoto],
        providers: [defaultProvider, secondProvider],
      });

      expect(result?.matches).toStrictEqual([
        { ...successResponse.matches[0], provider: defaultProvider.name },
        { ...secondProviderResponse.matches[0], provider: secondProvider.name },
        { ...successResponse.matches[1], provider: defaultProvider.name },
        { ...secondProviderResponse.matches[1], provider: secondProvider.name },
      ]);
      expect(result?.failures).toStrictEqual([]);
    });

    it("keeps providers in the selected order within each rank", async () => {
      mockResponsePerProvider();

      const result = await analyseMatches({
        windowId: 1,
        directory: "/project",
        photos: [defaultPhoto],
        providers: [secondProvider, defaultProvider],
      });

      expect(result?.matches.map(({ rank, provider }) => [rank, provider])).toStrictEqual([
        [1, secondProvider.name],
        [1, defaultProvider.name],
        [2, secondProvider.name],
        [2, defaultProvider.name],
      ]);
    });

    it("keeps the remaining ranks of providers that returned more matches", async () => {
      const longerResponse: AnalysisMatchResponse = {
        matches: [
          ...successResponse.matches,
          { rank: 3, id: "237", rating: 0.68, details: "237_20180623_0152.jpg" },
        ],
      };

      mockFetch.mockImplementation((url) => {
        const body = String(url).startsWith(secondProvider.endpoint)
          ? { matches: [secondProviderResponse.matches[0]] }
          : longerResponse;

        return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
      });

      const result = await analyseMatches({
        windowId: 1,
        directory: "/project",
        photos: [defaultPhoto],
        providers: [defaultProvider, secondProvider],
      });

      expect(result?.matches.map(({ rank, provider }) => [rank, provider])).toStrictEqual([
        [1, defaultProvider.name],
        [1, secondProvider.name],
        [2, defaultProvider.name],
        [3, defaultProvider.name],
      ]);
    });

    it("keeps the matches from providers that succeeded when another fails", async () => {
      mockFetch.mockImplementation((url) => {
        if (String(url).startsWith(secondProvider.endpoint)) {
          return Promise.reject(new Error("Network connection failed"));
        }

        return Promise.resolve(new Response(JSON.stringify(successResponse), { status: 200 }));
      });

      const result = await analyseMatches({
        windowId: 1,
        directory: "/project",
        photos: [defaultPhoto],
        providers: [defaultProvider, secondProvider],
      });

      expect(result?.matches).toStrictEqual(annotatedSuccessMatches);
      expect(result?.failures).toStrictEqual([
        { provider: secondProvider.name, message: "Network connection failed" },
      ]);
    });

    it("returns no matches and every failure when all providers fail", async () => {
      mockFetch.mockImplementation((url) =>
        Promise.reject(new Error(`Unreachable: ${String(url)}`)),
      );

      const result = await analyseMatches({
        windowId: 1,
        directory: "/project",
        photos: [defaultPhoto],
        providers: [defaultProvider, secondProvider],
      });

      expect(result?.matches).toStrictEqual([]);
      expect(result?.failures.map(({ provider }) => provider)).toStrictEqual([
        defaultProvider.name,
        secondProvider.name,
      ]);
    });

    it("returns null when cancelled, even if some providers already responded", async () => {
      mockFetch.mockImplementation((url, options) => {
        if (String(url).startsWith(defaultProvider.endpoint)) {
          return Promise.resolve(new Response(JSON.stringify(successResponse), { status: 200 }));
        }

        return new Promise((_resolve, reject) => {
          const signal = options?.signal;

          const abort = () => reject(new DOMException("aborted", "AbortError"));

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
        providers: [defaultProvider, secondProvider],
      });
      cancelAnalyseMatches(1);

      await expect(promise).resolves.toBeNull();
    });
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
      providers: defaultProviders,
    });
    const promiseB = analyseMatches({
      windowId: 2,
      directory: "/project",
      photos: [defaultPhoto],
      providers: defaultProviders,
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
    expect(resultB).toStrictEqual({ matches: annotatedSuccessMatches, failures: [] });
  });
});
