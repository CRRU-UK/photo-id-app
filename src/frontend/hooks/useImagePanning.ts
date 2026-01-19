import { useCallback, useRef } from "react";

interface UseImagePanningProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  panRef: React.RefObject<{ x: number; y: number }>;
  onPanChange: () => void;
  clampFn: () => void;
}

const useImagePanning = ({
  canvasRef,
  imageRef,
  panRef,
  onPanChange,
  clampFn,
}: UseImagePanningProps) => {
  const isPanningRef = useRef<boolean>(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const throttleRef = useRef<number | null>(null);

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

      const scaleX = image.naturalWidth / canvas.clientWidth;
      const scaleY = image.naturalHeight / canvas.clientHeight;

      const scaledDeltaX = deltaX * scaleX;
      const scaledDeltaY = deltaY * scaleY;

      panRef.current.x = panRef.current.x + scaledDeltaX;
      panRef.current.y = panRef.current.y + scaledDeltaY;

      lastPointerRef.current.x = event.clientX;
      lastPointerRef.current.y = event.clientY;

      // Use requestAnimationFrame to throttle draw calls during panning
      throttleRef.current ??= requestAnimationFrame(() => {
        onPanChange();
        throttleRef.current = null;
      });
    },
    [canvasRef, imageRef, panRef, onPanChange],
  );

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false;

    // Cancel any pending animation frame
    if (throttleRef.current !== null) {
      cancelAnimationFrame(throttleRef.current);
      throttleRef.current = null;
    }

    // Explicitly clamp before final draw to ensure image stays within bounds
    clampFn();
    onPanChange();
  }, [clampFn, onPanChange]);

  const cleanup = useCallback(() => {
    // Cancel any pending requestAnimationFrame
    if (throttleRef.current !== null) {
      cancelAnimationFrame(throttleRef.current);
      throttleRef.current = null;
    }
  }, []);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    cleanup,
  };
};

export default useImagePanning;
