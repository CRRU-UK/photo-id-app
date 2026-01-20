import { useEffect, useRef, useState } from "react";

export const useImageLoader = (file: File) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    // Ensure file is valid before creating blob URL
    if (!file || file.size === 0) {
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();

    let isCancelled = false;

    image.onload = () => {
      if (!isCancelled) {
        imageRef.current = image;
        setImageLoaded(true);
      }
    };

    image.onerror = () => {
      if (!isCancelled) {
        console.error("Failed to load image:", file.name);

        URL.revokeObjectURL(url);
        imageRef.current = null;

        setImageLoaded(false);
      }
    };

    /**
     * Defer setting the image src to the next animation frame. This helps avoid race conditions
     * where the component unmounts immediately after starting the load, which can produce
     * misleading errors and noisy reports (for example, in Sentry).
     */
    const frameId = requestAnimationFrame(() => {
      if (!isCancelled) {
        image.src = url;
      }
    });

    return () => {
      isCancelled = true;
      cancelAnimationFrame(frameId);

      URL.revokeObjectURL(url);
      imageRef.current = null;

      setImageLoaded(false);
    };
  }, [file]);

  return { imageRef, imageLoaded };
};
