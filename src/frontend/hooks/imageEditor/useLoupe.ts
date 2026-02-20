import type { ImageFilters, ImageTransformations } from "@/types";

import { useCallback, useEffect, useRef } from "react";

import { LOUPE } from "@/constants";
import { getCanvasFilters, getImageCoordinates } from "@/helpers";

interface UseLoupeOptions {
  enabled: boolean;
  imageRef: React.RefObject<HTMLImageElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  getFilters: () => ImageFilters;
  getTransform: () => ImageTransformations;
}

/**
 * Converts canvas-space coordinates to original image-space coordinates by reversing the zoom/pan
 * transform applied during rendering.
 */
const canvasToImageCoords = ({
  canvasX,
  canvasY,
  centreX,
  centreY,
  zoom,
  panX,
  panY,
}: {
  canvasX: number;
  canvasY: number;
  centreX: number;
  centreY: number;
  zoom: number;
  panX: number;
  panY: number;
}): { x: number; y: number } => {
  const imageX = (canvasX - centreX - panX) / zoom + centreX;
  const imageY = (canvasY - centreY - panY) / zoom + centreY;

  return { x: imageX, y: imageY };
};

export const useLoupe = ({
  enabled,
  imageRef,
  canvasRef,
  getFilters,
  getTransform,
}: UseLoupeOptions) => {
  const rafRef = useRef<number | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const loupeContainerRef = useRef<HTMLDivElement | null>(null);
  const loupeContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastCursorRef = useRef<{ clientX: number; clientY: number } | null>(null);

  const drawLoupe = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const image = imageRef.current;
      const loupeCanvas = loupeCanvasRef.current;
      const loupeContainer = loupeContainerRef.current;

      if (!canvas || !image || !loupeCanvas || !loupeContainer) {
        return;
      }

      const canvasCoords = getImageCoordinates({
        clientX,
        clientY,
        canvas,
        image,
      });

      if (!canvasCoords) {
        return;
      }

      const transform = getTransform();
      const centreX = image.naturalWidth / 2;
      const centreY = image.naturalHeight / 2;

      const imageCoords = canvasToImageCoords({
        canvasX: canvasCoords.x,
        canvasY: canvasCoords.y,
        centreX,
        centreY,
        zoom: transform.zoom,
        panX: transform.pan.x,
        panY: transform.pan.y,
      });

      const regionSize = LOUPE.SIZE / (LOUPE.ZOOM * transform.zoom);
      const halfRegion = regionSize / 2;

      const sx = Math.max(0, Math.min(imageCoords.x - halfRegion, image.naturalWidth - regionSize));
      const sy = Math.max(
        0,
        Math.min(imageCoords.y - halfRegion, image.naturalHeight - regionSize),
      );

      /**
       * Scale the canvas backing buffer by the device pixel ratio so the loupe renders crisp on
       * high DPI displays.
       */
      const dpr = window.devicePixelRatio || 1;
      const bufferSize = Math.round(LOUPE.SIZE * dpr);

      if (loupeCanvas.width !== bufferSize || loupeCanvas.height !== bufferSize) {
        loupeCanvas.width = bufferSize;
        loupeCanvas.height = bufferSize;
        loupeCanvas.style.width = `${LOUPE.SIZE}px`;
        loupeCanvas.style.height = `${LOUPE.SIZE}px`;

        // Resizing the canvas clears the context state, so re-acquire it
        loupeContextRef.current = loupeCanvas.getContext("2d");
      }

      loupeContextRef.current ??= loupeCanvas.getContext("2d");

      const loupeContext = loupeContextRef.current;

      if (!loupeContext) {
        return;
      }

      loupeContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      loupeContext.clearRect(0, 0, LOUPE.SIZE, LOUPE.SIZE);

      const filters = getFilters();
      loupeContext.filter = getCanvasFilters({
        brightness: filters.brightness,
        contrast: filters.contrast,
        saturate: filters.saturate,
        edgeDetection: filters.edgeDetection,
      });

      loupeContext.drawImage(image, sx, sy, regionSize, regionSize, 0, 0, LOUPE.SIZE, LOUPE.SIZE);

      const rect = canvas.getBoundingClientRect();
      const cursorX = clientX - rect.left;
      const cursorY = clientY - rect.top;

      const loupeX = cursorX - LOUPE.SIZE + LOUPE.CURSOR_PADDING;
      const loupeY = cursorY - LOUPE.SIZE + LOUPE.CURSOR_PADDING;

      loupeContainer.style.display = "block";
      loupeContainer.style.transform = `translate(${loupeX}px, ${loupeY}px)`;
    },
    [canvasRef, imageRef, getTransform, getFilters],
  );

  const handleLoupeMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      lastCursorRef.current = { clientX: event.clientX, clientY: event.clientY };

      if (!enabled) {
        const loupeContainer = loupeContainerRef.current;
        if (loupeContainer) {
          loupeContainer.style.display = "none";
        }

        return;
      }

      if (rafRef.current !== null) {
        return;
      }

      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;

        const cursor = lastCursorRef.current;
        if (cursor) {
          drawLoupe(cursor.clientX, cursor.clientY);
        }
      });
    },
    [enabled, drawLoupe],
  );

  /**
   * Redraws the loupe at the last known cursor position. Used to update the loupe when filters
   * or transforms change without a pointer event (e.g. keyboard shortcuts, slider adjustments).
   */
  const redrawLoupe = useCallback(() => {
    if (!enabled) {
      return;
    }

    const cursor = lastCursorRef.current;
    const loupeContainer = loupeContainerRef.current;

    if (!cursor || !loupeContainer || loupeContainer.style.display === "none") {
      return;
    }

    drawLoupe(cursor.clientX, cursor.clientY);
  }, [enabled, drawLoupe]);

  // When toggled on, show the loupe at the last cursor position if it's over the canvas. When
  // toggled off, hide the loupe and cancel any in-flight RAF so a stale callback from before the
  // re-render can't flash the loupe back on.
  useEffect(() => {
    if (!enabled) {
      const loupeContainer = loupeContainerRef.current;
      if (loupeContainer) {
        loupeContainer.style.display = "none";
      }

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      return;
    }

    if (!lastCursorRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const { clientX, clientY } = lastCursorRef.current;

    const cursorIsOnCanvas =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;

    if (cursorIsOnCanvas) {
      drawLoupe(clientX, clientY);
    }
  }, [enabled, canvasRef, drawLoupe]);

  const handleLoupeLeave = useCallback(() => {
    const loupeContainer = loupeContainerRef.current;

    if (loupeContainer) {
      loupeContainer.style.display = "none";
    }

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return {
    loupeCanvasRef,
    loupeContainerRef,
    handleLoupeMove,
    handleLoupeLeave,
    redrawLoupe,
  };
};
