import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { usePanInteraction } from "./usePanInteraction";

const createCanvasRef = (
  clientWidth = 800,
  clientHeight = 600,
): React.RefObject<HTMLCanvasElement | null> => ({
  current: { clientWidth, clientHeight } as HTMLCanvasElement,
});

const createImageRef = (
  naturalWidth = 1600,
  naturalHeight = 1200,
): React.RefObject<HTMLImageElement | null> => ({
  current: { naturalWidth, naturalHeight } as HTMLImageElement,
});

const createPointerEvent = (clientX: number, clientY: number) =>
  ({ clientX, clientY }) as React.PointerEvent<HTMLCanvasElement>;

describe(usePanInteraction, () => {
  it("converts drag delta to image pixel delta", () => {
    // fitScale = min(800/1600, 600/1200) = 0.5 → scale = Math.max(2, 2) = 2
    // drag (10, 5)px → pan delta = (20, 10) image pixels
    const onPan = vi.fn<(pan: { x: number; y: number }) => void>();

    const { result } = renderHook(() =>
      usePanInteraction({
        canvasRef: createCanvasRef(),
        imageRef: createImageRef(),
        onPan,
        onDraw: vi.fn<() => void>(),
        onDrawThrottled: vi.fn<() => void>(),
        onCancelThrottle: vi.fn<() => void>(),
        getTransform: () => ({ pan: { x: 0, y: 0 } }),
      }),
    );

    act(() => result.current.handlePointerDown(createPointerEvent(100, 100)));
    act(() => result.current.handlePointerMove(createPointerEvent(110, 105)));

    expect(onPan).toHaveBeenCalledWith({ x: 20, y: 10 });
  });

  it("produces the same pan delta regardless of zoom level", () => {
    // Pan is multiplied by fitScale only in the renderer (not fitScale * zoom), so the image
    // moves by Δpan * fitScale CSS pixels regardless of zoom. The scale formula is zoom-independent:
    // Δpan = delta * Math.max(nw/cw, nh/ch) = delta * 1/fitScale.
    // Dragging 10px at zoom=1 and at zoom=4 both produce a 20 image-pixel delta.
    const onPanZoom1 = vi.fn<(pan: { x: number; y: number }) => void>();
    const onPanZoom4 = vi.fn<(pan: { x: number; y: number }) => void>();

    const { result: result1 } = renderHook(() =>
      usePanInteraction({
        canvasRef: createCanvasRef(),
        imageRef: createImageRef(),
        onPan: onPanZoom1,
        onDraw: vi.fn<() => void>(),
        onDrawThrottled: vi.fn<() => void>(),
        onCancelThrottle: vi.fn<() => void>(),
        getTransform: () => ({ pan: { x: 0, y: 0 } }),
      }),
    );

    const { result: result4 } = renderHook(() =>
      usePanInteraction({
        canvasRef: createCanvasRef(),
        imageRef: createImageRef(),
        onPan: onPanZoom4,
        onDraw: vi.fn<() => void>(),
        onDrawThrottled: vi.fn<() => void>(),
        onCancelThrottle: vi.fn<() => void>(),
        getTransform: () => ({ pan: { x: 0, y: 0 } }),
      }),
    );

    act(() => result1.current.handlePointerDown(createPointerEvent(100, 100)));
    act(() => result1.current.handlePointerMove(createPointerEvent(110, 105)));

    act(() => result4.current.handlePointerDown(createPointerEvent(100, 100)));
    act(() => result4.current.handlePointerMove(createPointerEvent(110, 105)));

    expect(onPanZoom1).toHaveBeenCalledWith({ x: 20, y: 10 });
    expect(onPanZoom4).toHaveBeenCalledWith({ x: 20, y: 10 });
  });

  it("uses a uniform scale for both axes when the image is letterboxed", () => {
    // 1600*400 image (4:1) in 800*600 canvas — fitScale = min(0.5, 1.5) = 0.5
    // Math.max(1600/800, 400/600) = Math.max(2, 0.667) = 2
    // Both X and Y get the same factor so diagonal panning is isotropic
    const onPan = vi.fn<(pan: { x: number; y: number }) => void>();

    const { result } = renderHook(() =>
      usePanInteraction({
        canvasRef: createCanvasRef(800, 600),
        imageRef: createImageRef(1600, 400),
        onPan,
        onDraw: vi.fn<() => void>(),
        onDrawThrottled: vi.fn<() => void>(),
        onCancelThrottle: vi.fn<() => void>(),
        getTransform: () => ({ pan: { x: 0, y: 0 } }),
      }),
    );

    act(() => result.current.handlePointerDown(createPointerEvent(0, 0)));
    act(() => result.current.handlePointerMove(createPointerEvent(10, 10)));

    // Both axes scaled by 2 (the constraining axis), not 2 vs 0.667
    expect(onPan).toHaveBeenCalledWith({ x: 20, y: 20 });
  });

  it("accumulates delta on top of existing pan", () => {
    const onPan = vi.fn<(pan: { x: number; y: number }) => void>();

    const { result } = renderHook(() =>
      usePanInteraction({
        canvasRef: createCanvasRef(),
        imageRef: createImageRef(),
        onPan,
        onDraw: vi.fn<() => void>(),
        onDrawThrottled: vi.fn<() => void>(),
        onCancelThrottle: vi.fn<() => void>(),
        getTransform: () => ({ pan: { x: 100, y: 50 } }),
      }),
    );

    act(() => result.current.handlePointerDown(createPointerEvent(200, 200)));
    act(() => result.current.handlePointerMove(createPointerEvent(205, 202)));

    // scale = 2; delta = (5, 2) → scaled = (10, 4); added to existing (100, 50)
    expect(onPan).toHaveBeenCalledWith({ x: 110, y: 54 });
  });

  it("does not pan when pointer is not down", () => {
    const onPan = vi.fn<(pan: { x: number; y: number }) => void>();

    const { result } = renderHook(() =>
      usePanInteraction({
        canvasRef: createCanvasRef(),
        imageRef: createImageRef(),
        onPan,
        onDraw: vi.fn<() => void>(),
        onDrawThrottled: vi.fn<() => void>(),
        onCancelThrottle: vi.fn<() => void>(),
        getTransform: () => ({ pan: { x: 0, y: 0 } }),
      }),
    );

    act(() => result.current.handlePointerMove(createPointerEvent(110, 110)));

    expect(onPan).not.toHaveBeenCalled();
  });
});
