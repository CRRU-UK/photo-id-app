import { useCallback, useRef } from "react";

interface PanInteractionOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  onPan: (pan: { x: number; y: number }) => void;
  onDraw: () => void;
  onDrawThrottled: () => void;
  onCancelThrottle: () => void;
  getTransform: () => { pan: { x: number; y: number } };
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

      /**
       * Convert screen pixel deltas to image pixel deltas. In the rendering transform, pan is
       * multiplied by fitScale only (not fitScale * zoom), so a change of pan image pixels moves
       * the image by pan * fitScale CSS pixels - independent of zoom. For 1:1 cursor tracking:
       * pan = delta / fitScale = delta * Math.max(nw/cw, nh/ch). Using Math.max gives a uniform
       * scale for both axes regardless of letterboxing.
       */
      const scale = Math.max(
        image.naturalWidth / canvas.clientWidth,
        image.naturalHeight / canvas.clientHeight,
      );

      const currentPan = getTransform().pan;

      onPan({
        x: currentPan.x + deltaX * scale,
        y: currentPan.y + deltaY * scale,
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
