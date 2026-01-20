import { useEffect, useRef, useState } from "react";

export const useImageLoader = (file: File) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
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

    image.src = url;

    return () => {
      isCancelled = true;

      URL.revokeObjectURL(url);
      imageRef.current = null;

      setImageLoaded(false);
    };
  }, [file]);

  return { imageRef, imageLoaded };
};
