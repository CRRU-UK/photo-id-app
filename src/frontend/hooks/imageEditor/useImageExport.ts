import type { ImageFilters, ImageTransformations } from "@/types";

import { useCallback } from "react";

import { getCanvasFilters } from "@/helpers";

interface ImageExportOptions {
  imageRef: React.RefObject<HTMLImageElement | null>;
  file: File;
  getFilters: () => ImageFilters;
  getTransform: () => ImageTransformations;
}

export const useImageExport = ({
  imageRef,
  file,
  getFilters,
  getTransform,
}: ImageExportOptions) => {
  const exportFile = useCallback(async (): Promise<File | null> => {
    const image = imageRef.current;

    if (!image) {
      return null;
    }

    const mime = file.type;

    const filters = getFilters();
    const transform = getTransform();

    // Create off-screen canvas for export (excludes edge detection filter)
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = image.naturalWidth;
    exportCanvas.height = image.naturalHeight;

    const context = exportCanvas.getContext("2d");

    if (!context) {
      return null;
    }

    const centreX = exportCanvas.width / 2;
    const centreY = exportCanvas.height / 2;

    context.translate(centreX + transform.pan.x, centreY + transform.pan.y);
    context.scale(transform.zoom, transform.zoom);
    context.translate(-centreX, -centreY);

    // Apply all filters except edge detection is only for display purposes
    context.filter = getCanvasFilters({
      brightness: filters.brightness,
      contrast: filters.contrast,
      saturate: filters.saturate,
      edgeDetection: { enabled: false },
    });

    context.drawImage(image, 0, 0);

    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        exportCanvas.toBlob((result) => {
          resolve(result);
        }, mime);
      });

      if (!blob) {
        return null;
      }

      const name = file.name;
      const edited = new File([blob], name, { type: mime });

      return edited;
    } catch {
      return null;
    }
  }, [imageRef, file, getFilters, getTransform]);

  return {
    exportFile,
  };
};
