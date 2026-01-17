import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import useImageEditor from "./useImageEditor";

// Mock URL.createObjectURL and URL.revokeObjectURL
vi.spyOn(URL, "createObjectURL").mockImplementation<typeof URL.createObjectURL>(() => "mock-url");
vi.spyOn(URL, "revokeObjectURL").mockImplementation<typeof URL.revokeObjectURL>(() => {});

// Mock HTMLCanvasElement methods
const mockGetContext = vi.fn<typeof HTMLCanvasElement.prototype.getContext>(() => ({
  setTransform: vi.fn<CanvasRenderingContext2D["setTransform"]>(),
  translate: vi.fn<CanvasRenderingContext2D["translate"]>(),
  scale: vi.fn<CanvasRenderingContext2D["scale"]>(),
  drawImage: vi.fn<CanvasRenderingContext2D["drawImage"]>(),
  filter: "",
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;

HTMLCanvasElement.prototype.getContext = mockGetContext;

const mockToBlob = vi.fn<typeof HTMLCanvasElement.prototype.toBlob>((callback) => {
  const blob = new Blob(["test"], { type: "image/jpeg" });
  callback(blob);
});

HTMLCanvasElement.prototype.toBlob = mockToBlob;

describe("useImageEditor", () => {
  let mockFile: File;

  beforeEach(() => {
    mockFile = new File(["test"], "test.jpg", { type: "image/jpeg" });
    vi.clearAllMocks();
  });

  it("initializes with all expected functions and properties", () => {
    const { result } = renderHook(() => useImageEditor({ file: mockFile }));

    expect(result.current).toHaveProperty("canvasRef");
    expect(result.current).toHaveProperty("setBrightness");
    expect(result.current).toHaveProperty("setContrast");
    expect(result.current).toHaveProperty("setSaturate");
    expect(result.current).toHaveProperty("handleZoomIn");
    expect(result.current).toHaveProperty("handleZoomOut");
    expect(result.current).toHaveProperty("handlePointerDown");
    expect(result.current).toHaveProperty("handlePointerUp");
    expect(result.current).toHaveProperty("handlePointerMove");
    expect(result.current).toHaveProperty("handleWheel");
    expect(result.current).toHaveProperty("resetFilters");
    expect(result.current).toHaveProperty("exportFile");
    expect(result.current).toHaveProperty("resetKey");
  });

  it("increments resetKey when resetFilters is called", async () => {
    const { result } = renderHook(() => useImageEditor({ file: mockFile }));

    await waitFor(() => {
      expect(result.current.resetKey).toBe(0);
    });

    const initialResetKey = result.current.resetKey;

    result.current.resetFilters();

    await waitFor(() => {
      expect(result.current.resetKey).toBe(initialResetKey + 1);
    });
  });

  it("returns null from exportFile when canvas is not available", async () => {
    const { result } = renderHook(() => useImageEditor({ file: mockFile }));

    // Canvas ref will be null initially
    const exportedFile = await result.current.exportFile();

    expect(exportedFile).toBeNull();
  });

  it("filter setter functions can be called", () => {
    const { result } = renderHook(() => useImageEditor({ file: mockFile }));

    // These should not throw
    expect(() => result.current.setBrightness(150)).not.toThrowError();
    expect(() => result.current.setContrast(120)).not.toThrowError();
    expect(() => result.current.setSaturate(80)).not.toThrowError();
  });

  it("zoom functions can be called", () => {
    const { result } = renderHook(() => useImageEditor({ file: mockFile }));

    // These should not throw
    expect(() => result.current.handleZoomIn()).not.toThrowError();
    expect(() => result.current.handleZoomOut()).not.toThrowError();
  });

  it("pointer event handlers can be called", () => {
    const { result } = renderHook(() => useImageEditor({ file: mockFile }));

    const mockPointerEvent = {
      clientX: 100,
      clientY: 100,
    } as React.PointerEvent<HTMLCanvasElement>;

    // These should not throw
    expect(() => result.current.handlePointerDown(mockPointerEvent)).not.toThrowError();
    expect(() => result.current.handlePointerMove(mockPointerEvent)).not.toThrowError();
    expect(() => result.current.handlePointerUp()).not.toThrowError();
  });
});
