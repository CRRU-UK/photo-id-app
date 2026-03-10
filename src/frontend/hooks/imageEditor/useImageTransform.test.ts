import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IMAGE_EDITS } from "@/constants";

import { useImageTransform } from "./useImageTransform";

const createImageRef = (
  naturalWidth = 1600,
  naturalHeight = 1200,
): React.RefObject<HTMLImageElement | null> => ({
  current: { naturalWidth, naturalHeight } as HTMLImageElement,
});

const createNullImageRef = (): React.RefObject<HTMLImageElement | null> => ({
  current: null,
});

describe(useImageTransform, () => {
  describe("getTransform", () => {
    it("returns default transform values on initialisation", () => {
      const imageRef = createImageRef();
      const { result } = renderHook(() => useImageTransform(imageRef));

      const transform = result.current.getTransform();

      expect(transform).toStrictEqual({
        zoom: IMAGE_EDITS.ZOOM,
        pan: { x: IMAGE_EDITS.PAN_X, y: IMAGE_EDITS.PAN_Y },
      });
    });

    it("returns a copy of pan to prevent external mutation", () => {
      const imageRef = createImageRef();
      const { result } = renderHook(() => useImageTransform(imageRef));

      const transform1 = result.current.getTransform();
      transform1.pan.x = 999;

      const transform2 = result.current.getTransform();

      expect(transform2.pan.x).toBe(IMAGE_EDITS.PAN_X);
    });
  });

  describe("setZoom", () => {
    it("updates the zoom value", () => {
      const imageRef = createImageRef();
      const { result } = renderHook(() => useImageTransform(imageRef));

      act(() => {
        result.current.setZoom(2.5);
      });

      expect(result.current.getTransform().zoom).toBe(2.5);
    });

    it("clamps zoom to minimum of 1", () => {
      const imageRef = createImageRef();
      const { result } = renderHook(() => useImageTransform(imageRef));

      act(() => {
        result.current.setZoom(0.5);
      });

      expect(result.current.getTransform().zoom).toBe(1);
    });

    it("allows zoom of exactly 1", () => {
      const imageRef = createImageRef();
      const { result } = renderHook(() => useImageTransform(imageRef));

      act(() => {
        result.current.setZoom(3);
      });

      act(() => {
        result.current.setZoom(1);
      });

      expect(result.current.getTransform().zoom).toBe(1);
    });

    it("allows very large zoom values", () => {
      const imageRef = createImageRef();
      const { result } = renderHook(() => useImageTransform(imageRef));

      act(() => {
        result.current.setZoom(100);
      });

      expect(result.current.getTransform().zoom).toBe(100);
    });
  });

  describe("setPan", () => {
    it("updates pan values", () => {
      const imageRef = createImageRef();
      const { result } = renderHook(() => useImageTransform(imageRef));

      act(() => {
        result.current.setPan({ x: 50, y: -30 });
      });

      expect(result.current.getTransform().pan).toStrictEqual({ x: 50, y: -30 });
    });

    it("allows negative pan values", () => {
      const imageRef = createImageRef();
      const { result } = renderHook(() => useImageTransform(imageRef));

      act(() => {
        result.current.setPan({ x: -100, y: -200 });
      });

      expect(result.current.getTransform().pan).toStrictEqual({ x: -100, y: -200 });
    });
  });

  describe("clamp", () => {
    it("does nothing when canvas is null", () => {
      const imageRef = createImageRef();
      const { result } = renderHook(() => useImageTransform(imageRef));

      act(() => {
        result.current.setPan({ x: 9999, y: 9999 });
        result.current.clamp(null);
      });

      // Pan should remain unchanged since clamp was a no-op
      expect(result.current.getTransform().pan).toStrictEqual({ x: 9999, y: 9999 });
    });

    it("does nothing when image ref is null", () => {
      const imageRef = createNullImageRef();
      const { result } = renderHook(() => useImageTransform(imageRef));

      const canvas = { clientWidth: 800, clientHeight: 600 } as HTMLCanvasElement;

      act(() => {
        result.current.setPan({ x: 9999, y: 9999 });
        result.current.clamp(canvas);
      });

      expect(result.current.getTransform().pan).toStrictEqual({ x: 9999, y: 9999 });
    });

    it("clamps pan values to within boundaries", () => {
      const imageRef = createImageRef(1600, 1200);
      const { result } = renderHook(() => useImageTransform(imageRef));

      // Boundary is the photo area edge (independent of canvas/window size).
      // At zoom 2: maxPanX = 1600 * (2-1) / 2 = 800 image px
      //            maxPanY = 1200 * (2-1) / 2 = 600 image px
      const canvas = { clientWidth: 800, clientHeight: 600 } as HTMLCanvasElement;

      act(() => {
        result.current.setZoom(2);
        result.current.setPan({ x: 9999, y: 9999 });
        result.current.clamp(canvas);
      });

      const transform = result.current.getTransform();

      expect(transform.pan.x).toBe(800);
      expect(transform.pan.y).toBe(600);
    });

    it("uses the same boundary regardless of canvas size (photo area is the constraint)", () => {
      const imageRef = createImageRef(1600, 1200);
      const { result } = renderHook(() => useImageTransform(imageRef));

      // A wider canvas does not change the pan boundary — the photo area edge is always
      // naturalDim * (zoom-1) / 2 in image pixels, regardless of window size.
      const canvas = { clientWidth: 1200, clientHeight: 600 } as HTMLCanvasElement;

      act(() => {
        result.current.setZoom(2);
        result.current.setPan({ x: 9999, y: 9999 });
        result.current.clamp(canvas);
      });

      const transform = result.current.getTransform();

      // Same boundary as the 800×600 case above — window size has no effect.
      expect(transform.pan.x).toBe(800);
      expect(transform.pan.y).toBe(600);
    });

    it("locks pan to zero at zoom 1", () => {
      const imageRef = createImageRef(1600, 1200);
      const { result } = renderHook(() => useImageTransform(imageRef));

      // At zoom 1: maxPanX = 1600 * (1-1) / 2 = 0 → pan locked to (0, 0).
      const canvas = { clientWidth: 800, clientHeight: 600 } as HTMLCanvasElement;

      act(() => {
        result.current.setZoom(1);
        result.current.setPan({ x: 9999, y: 9999 });
        result.current.clamp(canvas);
      });

      const transform = result.current.getTransform();

      expect(transform.pan.x).toBe(0);
      expect(transform.pan.y).toBe(0);
    });

    it("locks pan to zero at zoom 1 regardless of letterbox space", () => {
      const imageRef = createImageRef(1600, 1200);
      const { result } = renderHook(() => useImageTransform(imageRef));

      // Even with a canvas wider than the photo area (letterbox on sides), pan is locked
      // to zero at zoom 1 because the boundary is the photo area, not the canvas edge.
      const canvas = { clientWidth: 1200, clientHeight: 600 } as HTMLCanvasElement;

      act(() => {
        result.current.setZoom(1);
        result.current.setPan({ x: 9999, y: 9999 });
        result.current.clamp(canvas);
      });

      const transform = result.current.getTransform();

      expect(transform.pan.x).toBe(0);
      expect(transform.pan.y).toBe(0);
    });
  });

  describe("getImageCoords", () => {
    it("returns null when canvas is null", () => {
      const imageRef = createImageRef();
      const { result } = renderHook(() => useImageTransform(imageRef));

      const coords = result.current.getImageCoords(100, 100, null);

      expect(coords).toBeNull();
    });

    it("returns null when image ref is null", () => {
      const imageRef = createNullImageRef();
      const { result } = renderHook(() => useImageTransform(imageRef));

      const canvas = {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
        clientWidth: 800,
        clientHeight: 600,
      } as unknown as HTMLCanvasElement;

      const coords = result.current.getImageCoords(100, 100, canvas);

      expect(coords).toBeNull();
    });

    it("converts screen coordinates to image coordinates", () => {
      const imageRef = createImageRef(1600, 1200);
      const { result } = renderHook(() => useImageTransform(imageRef));

      const canvas = {
        getBoundingClientRect: () => ({ left: 0, top: 0 }),
        clientWidth: 800,
        clientHeight: 600,
      } as unknown as HTMLCanvasElement;

      const coords = result.current.getImageCoords(400, 300, canvas);

      // Scale: 1600/800 = 2, 1200/600 = 2
      expect(coords).toStrictEqual({ x: 800, y: 600 });
    });
  });

  describe("resetTransform", () => {
    it("resets zoom and pan to defaults", () => {
      const imageRef = createImageRef();
      const { result } = renderHook(() => useImageTransform(imageRef));

      act(() => {
        result.current.setZoom(3);
        result.current.setPan({ x: 100, y: -50 });
      });

      act(() => {
        result.current.resetTransform();
      });

      const transform = result.current.getTransform();

      expect(transform.zoom).toBe(IMAGE_EDITS.ZOOM);
      expect(transform.pan).toStrictEqual({ x: IMAGE_EDITS.PAN_X, y: IMAGE_EDITS.PAN_Y });
    });
  });
});
