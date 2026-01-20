import type { ImageFilters, ImageTransformations } from "@/types";

import { useCallback, useEffect, useRef } from "react";

import { getCanvasFilters } from "@/helpers";

interface RenderOptions {
  imageRef: React.RefObject<HTMLImageElement | null>;
  getFilters: () => ImageFilters;
  getTransform: () => ImageTransformations;
  clamp: (canvas: HTMLCanvasElement | null) => void;
}

export const useCanvasRenderer = ({ imageRef, getFilters, getTransform, clamp }: RenderOptions) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const throttleRef = useRef<number | null>(null);
  const canvasSizeRef = useRef<{ width: number; height: number } | null>(null);

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

    const imageWidth = image.naturalWidth;
    const imageHeight = image.naturalHeight;

    if (
      canvasSizeRef.current?.width !== imageWidth ||
      canvasSizeRef.current?.height !== imageHeight
    ) {
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      canvasSizeRef.current = { width: imageWidth, height: imageHeight };
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);

    const filters = getFilters();

    const centreX = canvas.width / 2;
    const centreY = canvas.height / 2;

    clamp(canvas);

    const transform = getTransform();

    context.translate(centreX + transform.pan.x, centreY + transform.pan.y);
    context.scale(transform.zoom, transform.zoom);
    context.translate(-centreX, -centreY);

    context.filter = getCanvasFilters({
      brightness: filters.brightness,
      contrast: filters.contrast,
      saturate: filters.saturate,
      edgeDetection: filters.edgeDetection,
    });

    context.drawImage(image, 0, 0);
  }, [imageRef, getFilters, getTransform, clamp]);

  const drawThrottled = useCallback(() => {
    if (throttleRef.current !== null) {
      return;
    }

    throttleRef.current = requestAnimationFrame(() => {
      draw();
      throttleRef.current = null;
    });
  }, [draw]);

  const cancelThrottle = useCallback(() => {
    if (throttleRef.current !== null) {
      cancelAnimationFrame(throttleRef.current);
      throttleRef.current = null;
    }
  }, []);

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
