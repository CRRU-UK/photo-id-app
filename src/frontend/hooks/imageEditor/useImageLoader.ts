import { useEffect, useRef, useState } from "react";

export const useImageLoader = (file: File) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    // Ensure file is valid before creating blob URL
    if (!file || file.size === 0) {
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();

    let isCancelled = false;
    let urlRevoked = false;

    image.onload = () => {
      if (!isCancelled) {
        imageRef.current = image;
        setImageLoaded(true);
        setImageError(false);
      }
    };

    image.onerror = () => {
      if (!isCancelled) {
        console.error("Failed to load image:", file.name);

        if (!urlRevoked) {
          URL.revokeObjectURL(url);
          urlRevoked = true;
        }
        imageRef.current = null;

        setImageLoaded(false);
        setImageError(true);
      }
    };

    /**
     * Defer setting the image src to the next animation frame so this work is scheduled with
     * the browser's rendering cycle rather than during React's render/commit phase. This helps
     * avoid doing synchronous image-loading setup on the critical path of component mounting.
     *
     * Note: unmount race conditions are handled via the `isCancelled` flag, not by this
     * requestAnimationFrame delay.
     */
    const frameId = requestAnimationFrame(() => {
      if (!isCancelled) {
        image.src = url;
      }
    });

    return () => {
      isCancelled = true;
      cancelAnimationFrame(frameId);

      image.src = ""; // Abort image load
      if (!urlRevoked) {
        URL.revokeObjectURL(url);
        urlRevoked = true;
      }
      imageRef.current = null;

      setImageLoaded(false);
      setImageError(false);
    };
  }, [file]);

  return { imageRef, imageLoaded, imageError };
};
