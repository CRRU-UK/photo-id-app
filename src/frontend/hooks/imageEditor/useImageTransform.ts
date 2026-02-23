import type { ImageTransformations } from "@/types";

import { useCallback, useRef } from "react";

import { IMAGE_EDITS } from "@/constants";
import { clampPan, getImageCoordinates } from "@/helpers";

export const useImageTransform = (imageRef: React.RefObject<HTMLImageElement | null>) => {
  const zoomRef = useRef<number>(IMAGE_EDITS.ZOOM);
  const panRef = useRef({ x: IMAGE_EDITS.PAN_X, y: IMAGE_EDITS.PAN_Y });

  const getTransform = useCallback((): ImageTransformations => {
    return {
      zoom: zoomRef.current,
      pan: { ...panRef.current },
    };
  }, []);

  const setZoom = useCallback((zoom: number) => {
    zoomRef.current = Math.max(zoom, 1);
  }, []);

  const setPan = useCallback((pan: { x: number; y: number }) => {
    panRef.current = pan;
  }, []);

  const clamp = useCallback(
    (canvas: HTMLCanvasElement | null): void => {
      const image = imageRef.current;

      if (!canvas || !image) {
        return;
      }

      const zoom = zoomRef.current;
      const scaledImageWidth = image.naturalWidth * zoom;
      const scaledImageHeight = image.naturalHeight * zoom;

      panRef.current = clampPan({
        pan: panRef.current,
        canvas: { width: canvas.width, height: canvas.height },
        scaledImage: { width: scaledImageWidth, height: scaledImageHeight },
      });
    },
    [imageRef],
  );

  const getImageCoords = useCallback(
    (
      clientX: number,
      clientY: number,
      canvas: HTMLCanvasElement | null,
    ): { x: number; y: number } | null => {
      const image = imageRef.current;

      if (!canvas || !image) {
        return null;
      }

      return getImageCoordinates({ clientX, clientY, canvas, image });
    },
    [imageRef],
  );

  const resetTransform = useCallback(() => {
    zoomRef.current = IMAGE_EDITS.ZOOM;
    panRef.current = { x: IMAGE_EDITS.PAN_X, y: IMAGE_EDITS.PAN_Y };
  }, []);

  return {
    getTransform,
    setZoom,
    setPan,
    clamp,
    getImageCoords,
    resetTransform,
  };
};
