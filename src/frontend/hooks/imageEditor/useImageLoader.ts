import { useEffect, useRef, useState } from "react";

export const useImageLoader = (file: File | null) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    if (!file) {
      imageRef.current = null;
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      imageRef.current = image;
      setImageLoaded(true);
    };

    image.src = url;

    return () => {
      URL.revokeObjectURL(url);
      imageRef.current = null;
      setImageLoaded(false);
    };
  }, [file]);

  return { imageRef, imageLoaded };
};
