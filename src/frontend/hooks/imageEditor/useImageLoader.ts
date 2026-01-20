import { useEffect, useRef, useState } from "react";

export const useImageLoader = (file: File) => {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
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
