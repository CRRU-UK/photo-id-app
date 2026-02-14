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

      const canvas = { width: 800, height: 600 } as HTMLCanvasElement;

      act(() => {
        result.current.setPan({ x: 9999, y: 9999 });
        result.current.clamp(canvas);
      });

      expect(result.current.getTransform().pan).toStrictEqual({ x: 9999, y: 9999 });
    });

    it("clamps pan values to within boundaries", () => {
      const imageRef = createImageRef(1600, 1200);
      const { result } = renderHook(() => useImageTransform(imageRef));

      const canvas = { width: 800, height: 600 } as HTMLCanvasElement;

      act(() => {
        // At zoom 1, image matches canvas (no overflow), so pan clamps to 0
        result.current.setZoom(1);
        result.current.setPan({ x: 500, y: 500 });
        result.current.clamp(canvas);
      });

      const transform = result.current.getTransform();

      // With zoom 1, scaled image = 1600x1200, canvas = 800x600
      // boundary X: (1600 - 800) / 2 = 400
      // boundary Y: (1200 - 600) / 2 = 300
      expect(transform.pan.x).toBe(400);
      expect(transform.pan.y).toBe(300);
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
