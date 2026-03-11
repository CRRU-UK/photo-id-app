import { useCallback } from "react";

import { ZOOM_FACTORS } from "@/constants";

interface ZoomInteractionOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  getImageCoords: (
    clientX: number,
    clientY: number,
    canvas: HTMLCanvasElement | null,
  ) => { x: number; y: number } | null;
  getTransform: () => { zoom: number; pan: { x: number; y: number } };
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  clamp: (canvas: HTMLCanvasElement | null) => void;
  onDraw: () => void;
}

export const useZoomInteraction = ({
  canvasRef,
  imageRef,
  getImageCoords,
  getTransform,
  setZoom,
  setPan,
  clamp,
  onDraw,
}: ZoomInteractionOptions) => {
  // Zoom the image towards the cursor
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

      const transform = getTransform();
      const zoom = transform.zoom;
      const pan = transform.pan;

      // The canvas buffer is sized to the display area and not the image, therefore use natural
      // image dimensions so the zoom-centre calculation remains in image-pixel space.
      const centreX = image.naturalWidth / 2;
      const centreY = image.naturalHeight / 2;

      // getImageCoords returns fitScale-only coordinates (zoom=1, pan=0). The lines below complete
      // the full transform inversion by applying the current pan and zoom, giving the actual image
      // pixel under the cursor. Derivation: imageCoords.x - centreX = (offsetX - clientWidth/2) /
      // fitScale, so (imageCoords.x - centreX - pan.x) / zoom + centreX equals
      // (offsetX - clientWidth/2 - pan.x * fitScale) / (fitScale * zoom) + naturalWidth / 2
      // identical to calling getImageCoordinates with zoom and pan directly.
      const imagePointX = (imageCoords.x - centreX - pan.x) / zoom + centreX;
      const imagePointY = (imageCoords.y - centreY - pan.y) / zoom + centreY;

      const isPixelDelta = event.deltaMode === WheelEvent.DOM_DELTA_PIXEL;
      const wheelFactorByDeltaMode = isPixelDelta
        ? ZOOM_FACTORS.WHEEL_DELTA_PIXEL_FACTOR
        : ZOOM_FACTORS.WHEEL_DELTA_LINE_FACTOR;
      const delta = event.deltaY > 0 ? 1 / wheelFactorByDeltaMode : wheelFactorByDeltaMode;

      const newZoom = zoom * delta;
      const updatedZoom = Math.max(newZoom, 1);

      setZoom(updatedZoom);

      setPan({
        x: imageCoords.x - centreX - (imagePointX - centreX) * updatedZoom,
        y: imageCoords.y - centreY - (imagePointY - centreY) * updatedZoom,
      });

      clamp(canvas);
      onDraw();
    },
    [canvasRef, imageRef, getImageCoords, getTransform, setZoom, setPan, clamp, onDraw],
  );

  // Apply zoom with given factor, scales pan proportionally
  const applyZoom = useCallback(
    (zoomFactor: number) => {
      const transform = getTransform();
      const currentZoom = transform.zoom;
      const currentPan = transform.pan;

      const newZoom = currentZoom * zoomFactor;
      const updatedZoom = Math.max(newZoom, 1);

      if (updatedZoom === currentZoom) {
        clamp(canvasRef.current);
        onDraw();

        return;
      }

      const zoomRatio = updatedZoom / currentZoom;

      setZoom(updatedZoom);
      setPan({
        x: currentPan.x * zoomRatio,
        y: currentPan.y * zoomRatio,
      });

      clamp(canvasRef.current);
      onDraw();
    },
    [canvasRef, getTransform, setZoom, setPan, clamp, onDraw],
  );

  // Zoom in from the centre of the canvas
  const handleZoomIn = useCallback(() => {
    applyZoom(ZOOM_FACTORS.BUTTON);
  }, [applyZoom]);

  // Zoom out from the centre of the canvas
  const handleZoomOut = useCallback(() => {
    applyZoom(1 / ZOOM_FACTORS.BUTTON);
  }, [applyZoom]);

  return {
    handleWheel,
    handleZoomIn,
    handleZoomOut,
  };
};
