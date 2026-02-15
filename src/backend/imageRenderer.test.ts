import { beforeEach, describe, expect, it, vi } from "vitest";

import { THUMBNAIL_SIZE } from "@/constants";

const mockEncode = vi.fn<(format: "jpeg" | "png") => Promise<Buffer>>();

const mockContext = {
  setTransform: vi.fn<() => void>(),
  clearRect: vi.fn<() => void>(),
  translate: vi.fn<() => void>(),
  scale: vi.fn<() => void>(),
  drawImage: vi.fn<() => void>(),
  filter: "",
};

const mockCreateCanvas = vi.fn<(width: number, height: number) => object>();
const mockLoadImage = vi.fn<(path: string) => Promise<object>>();

vi.mock("@napi-rs/canvas", () => ({
  createCanvas: (...args: Parameters<typeof mockCreateCanvas>) => mockCreateCanvas(...args),
  loadImage: (...args: Parameters<typeof mockLoadImage>) => mockLoadImage(...args),
}));

const { renderThumbnailWithEdits, renderFullImageWithEdits } = await import("./imageRenderer");

const defaultEdits = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  zoom: 1,
  pan: { x: 0, y: 0 },
};

describe(renderThumbnailWithEdits, () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockLoadImage.mockResolvedValue({ width: 4000, height: 3000 });

    // First call: main canvas for full image with edits
    // Second call: thumbnail canvas for resized output
    mockCreateCanvas
      .mockReturnValueOnce({
        width: 4000,
        height: 3000,
        getContext: () => mockContext,
        encode: mockEncode,
      })
      .mockReturnValueOnce({
        width: THUMBNAIL_SIZE,
        height: 750,
        getContext: () => mockContext,
        encode: mockEncode,
      });

    mockEncode.mockResolvedValue(Buffer.from("encoded-data"));
  });

  it("returns a buffer", async () => {
    const result = await renderThumbnailWithEdits({
      sourcePath: "/project/photo.jpg",
      edits: defaultEdits,
    });

    expect(result).toBeInstanceOf(Buffer);
  });

  it("loads the image from the source path", async () => {
    await renderThumbnailWithEdits({
      sourcePath: "/project/photo.jpg",
      edits: defaultEdits,
    });

    expect(mockLoadImage).toHaveBeenCalledWith("/project/photo.jpg");
  });

  it("creates a canvas matching the source image size", async () => {
    await renderThumbnailWithEdits({
      sourcePath: "/project/photo.jpg",
      edits: defaultEdits,
    });

    // First canvas should match the loaded image dimensions
    expect(mockCreateCanvas).toHaveBeenCalledWith(4000, 3000);
  });

  it("creates a downscaled thumbnail canvas", async () => {
    await renderThumbnailWithEdits({
      sourcePath: "/project/photo.jpg",
      edits: defaultEdits,
    });

    // Second canvas is the thumbnail — width should be THUMBNAIL_SIZE for landscape
    const secondCall = mockCreateCanvas.mock.calls[1];

    expect(secondCall[0]).toBe(THUMBNAIL_SIZE);
    expect(secondCall[1]).toBeLessThan(THUMBNAIL_SIZE);
  });

  it("scales based on height for portrait images", async () => {
    mockLoadImage.mockResolvedValue({ width: 2000, height: 4000 });

    mockCreateCanvas
      .mockReset()
      .mockReturnValueOnce({
        width: 2000,
        height: 4000,
        getContext: () => mockContext,
        encode: mockEncode,
      })
      .mockReturnValueOnce({
        width: 500,
        height: THUMBNAIL_SIZE,
        getContext: () => mockContext,
        encode: mockEncode,
      });

    await renderThumbnailWithEdits({
      sourcePath: "/project/portrait.jpg",
      edits: defaultEdits,
    });

    // For portrait, height should be THUMBNAIL_SIZE
    const secondCall = mockCreateCanvas.mock.calls[1];

    expect(secondCall[0]).toBeLessThan(THUMBNAIL_SIZE);
    expect(secondCall[1]).toBe(THUMBNAIL_SIZE);
  });

  it.each([
    ["photo.jpg", "jpeg"],
    ["photo.jpeg", "jpeg"],
    ["photo.png", "png"],
    ["photo.tiff", "png"],
  ] as const)("encodes %s as %s", async (fileName, expectedFormat) => {
    await renderThumbnailWithEdits({
      sourcePath: `/project/${fileName}`,
      edits: defaultEdits,
    });

    expect(mockEncode).toHaveBeenCalledWith(expectedFormat);
  });

  it("applies zoom and pan transforms", async () => {
    await renderThumbnailWithEdits({
      sourcePath: "/project/photo.jpg",
      edits: { ...defaultEdits, zoom: 2, pan: { x: 50, y: -30 } },
    });

    expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
    // translate is called multiple times for centering + pan + un-centering
    expect(mockContext.translate).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
  });

  it("applies filter settings via context.filter", async () => {
    await renderThumbnailWithEdits({
      sourcePath: "/project/photo.jpg",
      edits: { ...defaultEdits, brightness: 150, contrast: 80, saturate: 120 },
    });

    expect(mockContext.filter).toContain("brightness(150%)");
    expect(mockContext.filter).toContain("contrast(80%)");
    expect(mockContext.filter).toContain("saturate(120%)");
  });
});

describe(renderFullImageWithEdits, () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockLoadImage.mockResolvedValue({ width: 4000, height: 3000 });

    mockCreateCanvas.mockReturnValue({
      width: 4000,
      height: 3000,
      getContext: () => mockContext,
      encode: mockEncode,
    });

    mockEncode.mockResolvedValue(Buffer.from("full-image-data"));
  });

  it("returns a buffer", async () => {
    const result = await renderFullImageWithEdits({
      sourcePath: "/project/photo.jpg",
      edits: defaultEdits,
    });

    expect(result).toBeInstanceOf(Buffer);
  });

  it("creates a canvas at full image resolution", async () => {
    await renderFullImageWithEdits({
      sourcePath: "/project/photo.jpg",
      edits: defaultEdits,
    });

    // Only one canvas call (no thumbnail resizing)
    expect(mockCreateCanvas).toHaveBeenCalledTimes(1);
    expect(mockCreateCanvas).toHaveBeenCalledWith(4000, 3000);
  });

  it.each([
    ["photo.jpg", "jpeg"],
    ["photo.jpeg", "jpeg"],
    ["photo.png", "png"],
    ["photo.tiff", "png"],
  ] as const)("encodes %s as %s", async (fileName, expectedFormat) => {
    await renderFullImageWithEdits({
      sourcePath: `/project/${fileName}`,
      edits: defaultEdits,
    });

    expect(mockEncode).toHaveBeenCalledWith(expectedFormat);
  });

  it("draws the image onto the canvas", async () => {
    await renderFullImageWithEdits({
      sourcePath: "/project/photo.jpg",
      edits: defaultEdits,
    });

    expect(mockContext.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      expect.any(Number),
      expect.any(Number),
    );
  });
});
