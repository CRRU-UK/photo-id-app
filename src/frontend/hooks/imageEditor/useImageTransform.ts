import type { ImageTransformations } from "@/types";

import { useCallback, useRef } from "react";

import { IMAGE_EDITS } from "@/constants";
import { getImageCoordinates } from "@/helpers";

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

      // The pan boundary is the edge of the photo's display rectangle (the fitScale-constrained
      // area), not the canvas edge. At zoom = z, the image is z* larger than the photo area in
      // each dimension, so the user can pan by (z - 1)/2 of the image's natural extent before
      // the image edge reaches the photo area edge. This is independent of canvas/window size -
      // resizing the window changes the photo area's CSS size but not the image-pixel boundary.
      const maxPanX = (image.naturalWidth * (zoom - 1)) / 2;
      const maxPanY = (image.naturalHeight * (zoom - 1)) / 2;

      panRef.current = {
        x: Math.max(-maxPanX, Math.min(maxPanX, panRef.current.x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, panRef.current.y)),
      };
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
