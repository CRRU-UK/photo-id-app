import type { ImageFilters, ImageTransformations } from "@/types";

import { useCallback, useEffect, useRef } from "react";

import { getCanvasFilters } from "@/helpers";

const TRAILING_DRAW_DEBOUNCE_MS = 100;

interface RenderOptions {
  imageRef: React.RefObject<HTMLImageElement | null>;
  getFilters: () => ImageFilters;
  getTransform: () => ImageTransformations;
  clamp: (canvas: HTMLCanvasElement | null) => void;
}

export const useCanvasRenderer = ({ imageRef, getFilters, getTransform, clamp }: RenderOptions) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const throttleRef = useRef<number | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    // Size the canvas buffer to the display area scaled by device pixel ratio so rendering is
    // sharp on high-DPI displays and the buffer avoids holding the full image at natural resolution
    const dpr = window.devicePixelRatio || 1;
    const bufferWidth = Math.round(canvas.clientWidth * dpr);
    const bufferHeight = Math.round(canvas.clientHeight * dpr);

    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
    }

    // Scale the transform so all subsequent drawing operations work in CSS pixels.
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

    const filters = getFilters();

    // fitScale maps image pixels to CSS pixels so the image fills the display area while
    // maintaining its aspect ratio (equivalent to object-fit: contain).
    const fitScale = Math.min(
      canvas.clientWidth / image.naturalWidth,
      canvas.clientHeight / image.naturalHeight,
    );

    const centreX = canvas.clientWidth / 2;
    const centreY = canvas.clientHeight / 2;

    clamp(canvas);

    const transform = getTransform();

    // Clip all drawing to the photo's display rectangle so the image never bleeds into letterbox
    // space when zoomed in. The clip rect is the fitScale-constrained area centred in the canvas.
    context.save();
    context.beginPath();
    context.rect(
      centreX - (image.naturalWidth * fitScale) / 2,
      centreY - (image.naturalHeight * fitScale) / 2,
      image.naturalWidth * fitScale,
      image.naturalHeight * fitScale,
    );
    context.clip();

    // Pan is stored in image pixels; multiply by fitScale to convert to the CSS-pixel offset.
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
   * Schedules a single draw after TRAILING_DRAW_DEBOUNCE_MS of no further calls.
   * Ensures a final render after interactions stop (e.g. slider release).
   */
  const drawDebounced = useCallback(() => {
    if (debounceTimeoutRef.current !== null) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    debounceTimeoutRef.current = setTimeout(() => {
      draw();
      debounceTimeoutRef.current = null;
    }, TRAILING_DRAW_DEBOUNCE_MS);
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

  // Trigger a redraw when the canvas element is resized (e.g. window resize). Previously
  // object-fit: contain handled display scaling automatically; now the rendering code must
  // re-run to recompute fitScale and resize the buffer.
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
