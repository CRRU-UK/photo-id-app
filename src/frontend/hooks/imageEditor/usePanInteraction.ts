import { useCallback, useRef } from "react";

interface PanInteractionOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  onPan: (pan: { x: number; y: number }) => void;
  onDraw: () => void;
  onDrawThrottled: () => void;
  onCancelThrottle: () => void;
  getCurrentPan: () => { x: number; y: number };
}

export const usePanInteraction = ({
  canvasRef,
  imageRef,
  onPan,
  onDraw,
  onDrawThrottled,
  onCancelThrottle,
  getCurrentPan,
}: PanInteractionOptions) => {
  const isPanningRef = useRef<boolean>(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    isPanningRef.current = true;
    lastPointerRef.current.x = event.clientX;
    lastPointerRef.current.y = event.clientY;
  }, []);

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

      const scaleX = image.naturalWidth / canvas.clientWidth;
      const scaleY = image.naturalHeight / canvas.clientHeight;

      const scaledDeltaX = deltaX * scaleX;
      const scaledDeltaY = deltaY * scaleY;

      const currentPan = getCurrentPan();
      onPan({
        x: currentPan.x + scaledDeltaX,
        y: currentPan.y + scaledDeltaY,
      });

      lastPointerRef.current.x = event.clientX;
      lastPointerRef.current.y = event.clientY;

      onDrawThrottled();
    },
    [canvasRef, imageRef, onPan, onDrawThrottled, getCurrentPan],
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
