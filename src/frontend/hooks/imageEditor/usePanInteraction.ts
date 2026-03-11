import { useCallback, useRef } from "react";

import { EditorPanDirection, PAN_AMOUNT } from "@/constants";

interface PanInteractionOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  onPan: (pan: { x: number; y: number }) => void;
  onDirectionalPan: (delta: { x: number; y: number }) => void;
  onDraw: () => void;
  onDrawThrottled: () => void;
  onCancelThrottle: () => void;
  getTransform: () => { pan: { x: number; y: number } };
}

export const usePanInteraction = ({
  canvasRef,
  imageRef,
  onPan,
  onDirectionalPan,
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

      // Convert screen-pixel delta to image-pixel delta (1/fitScale, uniform across axes)
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

  const handleDirectionalPan = useCallback(
    (direction: EditorPanDirection) => {
      const canvas = canvasRef.current;
      const image = imageRef.current;

      if (!canvas || !image) {
        return;
      }

      const scale = Math.max(
        image.naturalWidth / canvas.clientWidth,
        image.naturalHeight / canvas.clientHeight,
      );

      let deltaX = 0;
      let deltaY = 0;

      if (direction === EditorPanDirection.LEFT) {
        deltaX = PAN_AMOUNT * scale;
      } else if (direction === EditorPanDirection.RIGHT) {
        deltaX = -PAN_AMOUNT * scale;
      } else if (direction === EditorPanDirection.UP) {
        deltaY = PAN_AMOUNT * scale;
      } else if (direction === EditorPanDirection.DOWN) {
        deltaY = -PAN_AMOUNT * scale;
      }

      onDirectionalPan({ x: deltaX, y: deltaY });
    },
    [canvasRef, imageRef, onDirectionalPan],
  );

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleDirectionalPan,
  };
};
