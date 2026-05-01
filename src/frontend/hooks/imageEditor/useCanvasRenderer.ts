import { useCallback, useEffect, useRef } from "react";
import { CANVAS_DRAW_DEBOUNCE_MS } from "@/constants";
import { getCanvasFilters } from "@/helpers";
import type { ImageFilters, ImageTransformations } from "@/types";

interface RenderOptions {
  clamp: (canvas: HTMLCanvasElement | null) => void;
  getFilters: () => ImageFilters;
  getTransform: () => ImageTransformations;
  imageRef: React.RefObject<HTMLImageElement | null>;
}

/**
 * @link [ARCHITECTURE.md](../../../../ARCHITECTURE.md)
 */
export const useCanvasRenderer = ({ imageRef, getFilters, getTransform, clamp }: RenderOptions) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const throttleRef = useRef<number | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image) {
      return;
    }

    // Cache the context to avoid repeated getContext calls (returns the same object per spec)
    if (contextRef.current?.canvas !== canvas) {
      contextRef.current = canvas.getContext("2d");
    }

    const context = contextRef.current;

    if (!context) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;

    const bufferWidth = Math.round(canvas.clientWidth * dpr);
    const bufferHeight = Math.round(canvas.clientHeight * dpr);

    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
    }

    // Scale the transform so all subsequent drawing operations work in CSS pixels
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    const filters = getFilters();

    const fitScale = Math.min(
      canvas.clientWidth / image.naturalWidth,
      canvas.clientHeight / image.naturalHeight,
    );

    const centreX = canvas.clientWidth / 2;
    const centreY = canvas.clientHeight / 2;

    clamp(canvas);

    const transform = getTransform();

    context.save();
    context.beginPath();

    // Clip to the image display rectangle so the image never bleeds into letterbox space
    context.rect(
      centreX - (image.naturalWidth * fitScale) / 2,
      centreY - (image.naturalHeight * fitScale) / 2,
      image.naturalWidth * fitScale,
      image.naturalHeight * fitScale,
    );

    context.clip();

    // Pan is stored in image pixels, multiply by `fitScale` to convert to the CSS-pixel offset
    context.translate(centreX + transform.pan.x * fitScale, centreY + transform.pan.y * fitScale);
    context.scale(fitScale * transform.zoom, fitScale * transform.zoom);
    context.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);

    context.filter = getCanvasFilters({
      brightness: filters.brightness,
      contrast: filters.contrast,
      saturate: filters.saturate,
      edgeDetection: filters.edgeDetection,
    });

    context.drawImage(image, 0, 0);

    context.restore();
  }, [imageRef, getFilters, getTransform, clamp]);

  /**
   * Schedules a single draw after `CANVAS_DRAW_DEBOUNCE_MS` of no further calls. Ensures a final
   * render after interactions stop (e.g. slider release).
   */
  const drawDebounced = useCallback(() => {
    if (debounceTimeoutRef.current !== null) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    debounceTimeoutRef.current = setTimeout(() => {
      draw();
      debounceTimeoutRef.current = null;
    }, CANVAS_DRAW_DEBOUNCE_MS);
  }, [draw]);

  const drawThrottled = useCallback(() => {
    drawDebounced();

    if (throttleRef.current !== null) {
      return;
    }

    throttleRef.current = requestAnimationFrame(() => {
      draw();
      throttleRef.current = null;
    });
  }, [draw, drawDebounced]);

  const cancelThrottle = useCallback(() => {
    if (throttleRef.current !== null) {
      cancelAnimationFrame(throttleRef.current);
      throttleRef.current = null;
    }

    if (debounceTimeoutRef.current !== null) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, []);

  // Redraw on resize (e.g. window/canvas element resize) to recompute `fitScale` and the buffer
  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const observer = new ResizeObserver(() => {
      drawThrottled();
    });

    observer.observe(canvas);

    return () => {
      observer.disconnect();
    };
  }, [drawThrottled]);

  useEffect(() => {
    return () => {
      cancelThrottle();
    };
  }, [cancelThrottle]);

  return {
    canvasRef,
    draw,
    drawThrottled,
    cancelThrottle,
  };
};
