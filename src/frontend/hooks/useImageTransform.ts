import { useCallback, useRef } from "react";

import { IMAGE_EDITS, ZOOM_FACTORS } from "@/constants";
import { getBoundaries } from "@/helpers";

interface UseImageTransformProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  onTransformChange: () => void;
}

const useImageTransform = ({ canvasRef, imageRef, onTransformChange }: UseImageTransformProps) => {
  const zoomRef = useRef<number>(IMAGE_EDITS.ZOOM);
  const panRef = useRef({ x: IMAGE_EDITS.PAN_X, y: IMAGE_EDITS.PAN_Y });

  // Convert screen coordinates to image coordinates
  const getImageCoordinates = useCallback(
    (screenX: number, screenY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      const image = imageRef.current;

      if (!canvas || !image) {
        return null;
      }

      const rect = canvas.getBoundingClientRect();
      const screenImageX = screenX - rect.left;
      const screenImageY = screenY - rect.top;

      const scaleX = image.naturalWidth / canvas.clientWidth;
      const scaleY = image.naturalHeight / canvas.clientHeight;

      return {
        x: screenImageX * scaleX,
        y: screenImageY * scaleY,
      };
    },
    [canvasRef, imageRef],
  );

  // Ensures the image is within the canvas bounds
  const clamp = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;

    if (!canvas || !image) {
      return;
    }

    const zoom = zoomRef.current;
    const scaledImageWidth = image.naturalWidth * zoom;
    const scaledImageHeight = image.naturalHeight * zoom;

    const boundaryX = getBoundaries(canvas.width, scaledImageWidth);
    const boundaryY = getBoundaries(canvas.height, scaledImageHeight);

    panRef.current.x = Math.max(boundaryX.min, Math.min(boundaryX.max, panRef.current.x));
    panRef.current.y = Math.max(boundaryY.min, Math.min(boundaryY.max, panRef.current.y));
  }, [canvasRef, imageRef]);

  // Apply zoom with given factor, scales pan proportionally
  const applyZoom = useCallback(
    (zoomFactor: number) => {
      zoomRef.current = Math.max(zoomRef.current * zoomFactor, 1);
      panRef.current.x = panRef.current.x * zoomFactor;
      panRef.current.y = panRef.current.y * zoomFactor;

      clamp();
      onTransformChange();
    },
    [clamp, onTransformChange],
  );

  // Zoom the image towards where the cursor currently is
  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();

      const canvas = canvasRef.current;
      const image = imageRef.current;

      if (!canvas || !image) {
        return;
      }

      const imageCoords = getImageCoordinates(event.clientX, event.clientY);
      if (!imageCoords) {
        return;
      }

      const zoom = zoomRef.current;
      const centreX = canvas.width / 2;
      const centreY = canvas.height / 2;

      const imagePointX = (imageCoords.x - centreX - panRef.current.x) / zoom + centreX;
      const imagePointY = (imageCoords.y - centreY - panRef.current.y) / zoom + centreY;

      const delta = event.deltaY > 0 ? 1 / ZOOM_FACTORS.WHEEL : ZOOM_FACTORS.WHEEL;
      const newZoom = zoomRef.current * delta;

      zoomRef.current = Math.max(newZoom, 1);
      panRef.current.x = imageCoords.x - centreX - (imagePointX - centreX) * zoomRef.current;
      panRef.current.y = imageCoords.y - centreY - (imagePointY - centreY) * zoomRef.current;

      clamp();
      onTransformChange();
    },
    [canvasRef, imageRef, clamp, onTransformChange, getImageCoordinates],
  );

  // Zoom in from the centre of the canvas
  const handleZoomIn = useCallback(() => {
    applyZoom(ZOOM_FACTORS.BUTTON);
  }, [applyZoom]);

  // Zoom out from the centre of the canvas
  const handleZoomOut = useCallback(() => {
    applyZoom(1 / ZOOM_FACTORS.BUTTON);
  }, [applyZoom]);

  const reset = useCallback(() => {
    zoomRef.current = IMAGE_EDITS.ZOOM;
    panRef.current = { x: IMAGE_EDITS.PAN_X, y: IMAGE_EDITS.PAN_Y };
  }, []);

  return {
    zoomRef,
    panRef,
    clamp,
    getImageCoordinates,
    handleWheel,
    handleZoomIn,
    handleZoomOut,
    reset,
  };
};

export default useImageTransform;
