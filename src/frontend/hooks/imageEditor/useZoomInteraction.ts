import { useCallback } from "react";

import { ZOOM_FACTORS } from "@/constants";

interface ZoomInteractionOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  getImageCoords: (
    screenX: number,
    screenY: number,
    canvas: HTMLCanvasElement | null,
  ) => { x: number; y: number } | null;
  getCurrentZoom: () => number;
  getCurrentPan: () => { x: number; y: number };
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  clamp: (canvas: HTMLCanvasElement | null) => void;
  onDraw: () => void;
}

export const useZoomInteraction = ({
  canvasRef,
  imageRef,
  getImageCoords,
  getCurrentZoom,
  getCurrentPan,
  setZoom,
  setPan,
  clamp,
  onDraw,
}: ZoomInteractionOptions) => {
  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();

      const canvas = canvasRef.current;
      const image = imageRef.current;

      if (!canvas || !image) {
        return;
      }

      const imageCoords = getImageCoords(event.clientX, event.clientY, canvas);
      if (!imageCoords) {
        return;
      }

      const zoom = getCurrentZoom();
      const pan = getCurrentPan();
      const centreX = canvas.width / 2;
      const centreY = canvas.height / 2;

      const imagePointX = (imageCoords.x - centreX - pan.x) / zoom + centreX;
      const imagePointY = (imageCoords.y - centreY - pan.y) / zoom + centreY;

      const delta = event.deltaY > 0 ? 1 / ZOOM_FACTORS.WHEEL : ZOOM_FACTORS.WHEEL;
      const newZoom = zoom * delta;

      setZoom(Math.max(newZoom, 1));

      const updatedZoom = Math.max(newZoom, 1);
      setPan({
        x: imageCoords.x - centreX - (imagePointX - centreX) * updatedZoom,
        y: imageCoords.y - centreY - (imagePointY - centreY) * updatedZoom,
      });

      clamp(canvas);
      onDraw();
    },
    [
      canvasRef,
      imageRef,
      getImageCoords,
      getCurrentZoom,
      getCurrentPan,
      setZoom,
      setPan,
      clamp,
      onDraw,
    ],
  );

  const applyZoom = useCallback(
    (zoomFactor: number) => {
      const currentZoom = getCurrentZoom();
      const currentPan = getCurrentPan();

      setZoom(Math.max(currentZoom * zoomFactor, 1));
      setPan({
        x: currentPan.x * zoomFactor,
        y: currentPan.y * zoomFactor,
      });

      clamp(canvasRef.current);
      onDraw();
    },
    [canvasRef, getCurrentZoom, getCurrentPan, setZoom, setPan, clamp, onDraw],
  );

  const handleZoomIn = useCallback(() => {
    applyZoom(ZOOM_FACTORS.BUTTON);
  }, [applyZoom]);

  const handleZoomOut = useCallback(() => {
    applyZoom(1 / ZOOM_FACTORS.BUTTON);
  }, [applyZoom]);

  return {
    handleWheel,
    handleZoomIn,
    handleZoomOut,
  };
};
