import { useCallback, useEffect, useRef } from "react";
import { LOUPE } from "@/constants";
import { getCanvasFilters, getImageCoordinates } from "@/helpers";
import type { ImageFilters, ImageTransformations } from "@/types";

interface UseLoupeOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  enabled: boolean;
  getFilters: () => ImageFilters;
  getTransform: () => ImageTransformations;
  imageRef: React.RefObject<HTMLImageElement | null>;
}

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

      const transform = getTransform();

      const imageCoords = getImageCoordinates({
        clientX,
        clientY,
        canvas,
        image,
        zoom: transform.zoom,
        pan: transform.pan,
      });

      if (!imageCoords) {
        return;
      }

      const canvasRect = canvas.getBoundingClientRect();

      /**
       * Scale the loupe size relative to the canvas rendered dimensions so the loupe feels
       * proportionate on small windows while capping at the original maximum on large ones.
       */
      const loupeSize = Math.max(
        LOUPE.MIN_SIZE,
        Math.min(Math.round(Math.min(canvasRect.width, canvasRect.height) * 0.4), LOUPE.SIZE),
      );

      const regionSize = loupeSize / (LOUPE.ZOOM * transform.zoom);
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
      const bufferSize = Math.round(loupeSize * dpr);

      if (loupeCanvas.width !== bufferSize || loupeCanvas.height !== bufferSize) {
        loupeCanvas.width = bufferSize;
        loupeCanvas.height = bufferSize;
        loupeCanvas.style.width = `${loupeSize}px`;
        loupeCanvas.style.height = `${loupeSize}px`;

        // Resizing the canvas clears the context state, so re-acquire it
        loupeContextRef.current = loupeCanvas.getContext("2d");
      }

      loupeContextRef.current ??= loupeCanvas.getContext("2d");

      const loupeContext = loupeContextRef.current;

      if (!loupeContext) {
        return;
      }

      loupeContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      loupeContext.clearRect(0, 0, loupeSize, loupeSize);

      const filters = getFilters();
      loupeContext.filter = getCanvasFilters({
        brightness: filters.brightness,
        contrast: filters.contrast,
        saturate: filters.saturate,
        edgeDetection: filters.edgeDetection,
      });

      loupeContext.drawImage(image, sx, sy, regionSize, regionSize, 0, 0, loupeSize, loupeSize);

      /**
       * Use the loupe container's parent as the position reference so the transform is always
       * relative to the element the loupe is absolutely positioned within, regardless of where the
       * canvas element sits within that container.
       */
      const editRect = (loupeContainer.parentElement ?? canvas).getBoundingClientRect();

      const cursorX = clientX - editRect.left;
      const cursorY = clientY - editRect.top;

      // Cursor sits at the bottom-right corner of the loupe box
      const loupeX = cursorX - loupeSize;
      const loupeY = cursorY - loupeSize;

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
