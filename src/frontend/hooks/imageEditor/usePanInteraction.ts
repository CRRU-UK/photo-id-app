import { useCallback, useRef } from "react";

interface PanInteractionOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  onPan: (pan: { x: number; y: number }) => void;
  onDraw: () => void;
  onDrawThrottled: () => void;
  onCancelThrottle: () => void;
  getTransform: () => { zoom: number; pan: { x: number; y: number } };
}

export const usePanInteraction = ({
  canvasRef,
  imageRef,
  onPan,
  onDraw,
  onDrawThrottled,
  onCancelThrottle,
  getTransform,
}: PanInteractionOptions) => {
  const isPanningRef = useRef<boolean>(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    isPanningRef.current = true;
    lastPointerRef.current.x = event.clientX;
    lastPointerRef.current.y = event.clientY;
  }, []);

  // Pan the image from the last cursor position (i.e. 1:1 movement)
  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isPanningRef.current) {
        return;
      }

      const canvas = canvasRef.current;
      const image = imageRef.current;

      if (!canvas || !image) {
        return;
      }

      const deltaX = event.clientX - lastPointerRef.current.x;
      const deltaY = event.clientY - lastPointerRef.current.y;

      const transform = getTransform();

      /**
       * Convert screen pixel deltas to image pixel deltas. The rendered scale of the image is
       * fitScale * zoom, so dividing by both gives 1:1 movement - the image follows the cursor
       * at any zoom level. Using Math.max (= 1/fitScale) ensures a uniform scale for both axes
       * regardless of whether the image is letterboxed horizontally or vertically.
       */
      const scale =
        Math.max(
          image.naturalWidth / canvas.clientWidth,
          image.naturalHeight / canvas.clientHeight,
        ) / transform.zoom;

      onPan({
        x: transform.pan.x + deltaX * scale,
        y: transform.pan.y + deltaY * scale,
      });

      lastPointerRef.current.x = event.clientX;
      lastPointerRef.current.y = event.clientY;

      onDrawThrottled();
    },
    [canvasRef, imageRef, onPan, onDrawThrottled, getTransform],
  );

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false;

    onCancelThrottle();
    onDraw();
  }, [onCancelThrottle, onDraw]);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
};
