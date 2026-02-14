import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IMAGE_FILTERS } from "@/constants";

import { useImageFilters } from "./useImageFilters";

describe(useImageFilters, () => {
  describe("getFilters", () => {
    it("returns default filter values on initialisation", () => {
      const { result } = renderHook(() => useImageFilters());

      const filters = result.current.getFilters();

      expect(filters).toStrictEqual({
        brightness: IMAGE_FILTERS.BRIGHTNESS.DEFAULT,
        contrast: IMAGE_FILTERS.CONTRAST.DEFAULT,
        saturate: IMAGE_FILTERS.SATURATE.DEFAULT,
        edgeDetection: { enabled: false },
      });
    });
  });

  describe("setBrightness", () => {
    it("updates the brightness value", () => {
      const { result } = renderHook(() => useImageFilters());

      act(() => {
        result.current.setBrightness(150);
      });

      expect(result.current.getFilters().brightness).toBe(150);
    });

    it("allows setting brightness to zero", () => {
      const { result } = renderHook(() => useImageFilters());

      act(() => {
        result.current.setBrightness(0);
      });

      expect(result.current.getFilters().brightness).toBe(0);
    });

    it("allows setting brightness to maximum", () => {
      const { result } = renderHook(() => useImageFilters());

      act(() => {
        result.current.setBrightness(IMAGE_FILTERS.BRIGHTNESS.MAX);
      });

      expect(result.current.getFilters().brightness).toBe(IMAGE_FILTERS.BRIGHTNESS.MAX);
    });
  });

  describe("setContrast", () => {
    it("updates the contrast value", () => {
      const { result } = renderHook(() => useImageFilters());

      act(() => {
        result.current.setContrast(80);
      });

      expect(result.current.getFilters().contrast).toBe(80);
    });
  });

  describe("setSaturate", () => {
    it("updates the saturate value", () => {
      const { result } = renderHook(() => useImageFilters());

      act(() => {
        result.current.setSaturate(175);
      });

      expect(result.current.getFilters().saturate).toBe(175);
    });
  });

  describe("setEdgeDetection", () => {
    it("enables edge detection with a value", () => {
      const { result } = renderHook(() => useImageFilters());

      act(() => {
        result.current.setEdgeDetection({ enabled: true, value: 50 });
      });

      expect(result.current.getFilters().edgeDetection).toStrictEqual({
        enabled: true,
        value: 50,
      });
    });

    it("disables edge detection", () => {
      const { result } = renderHook(() => useImageFilters());

      act(() => {
        result.current.setEdgeDetection({ enabled: true, value: 75 });
      });

      act(() => {
        result.current.setEdgeDetection({ enabled: false });
      });

      expect(result.current.getFilters().edgeDetection).toStrictEqual({ enabled: false });
    });
  });

  describe("resetFilters", () => {
    it("resets all filters back to defaults", () => {
      const { result } = renderHook(() => useImageFilters());

      act(() => {
        result.current.setBrightness(150);
        result.current.setContrast(80);
        result.current.setSaturate(175);
        result.current.setEdgeDetection({ enabled: true, value: 50 });
      });

      act(() => {
        result.current.resetFilters();
      });

      const filters = result.current.getFilters();

      expect(filters).toStrictEqual({
        brightness: IMAGE_FILTERS.BRIGHTNESS.DEFAULT,
        contrast: IMAGE_FILTERS.CONTRAST.DEFAULT,
        saturate: IMAGE_FILTERS.SATURATE.DEFAULT,
        edgeDetection: { enabled: false },
      });
    });
  });

  describe("multiple filter changes", () => {
    it("preserves other filter values when changing one", () => {
      const { result } = renderHook(() => useImageFilters());

      act(() => {
        result.current.setBrightness(120);
        result.current.setContrast(80);
      });

      act(() => {
        result.current.setSaturate(160);
      });

      const filters = result.current.getFilters();

      expect(filters.brightness).toBe(120);
      expect(filters.contrast).toBe(80);
      expect(filters.saturate).toBe(160);
    });
  });
});
