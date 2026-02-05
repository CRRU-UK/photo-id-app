import fs from "node:fs";
import path from "node:path";

import { renderThumbnailWithEdits } from "@/backend/imageRenderer";
import { DEFAULT_PHOTO_EDITS, PROJECT_THUMBNAIL_DIRECTORY } from "@/constants";
import type { PhotoBody } from "@/types";

const createPhotoThumbnail = async (photo: PhotoBody): Promise<string> => {
  const sourcePath = path.join(photo.directory, photo.name);
  const thumbnailData = await renderThumbnailWithEdits({
    sourcePath,
    edits: photo.edits,
  });

  const thumbnailDirectory = path.join(photo.directory, PROJECT_THUMBNAIL_DIRECTORY);
  const thumbnailPath = path.join(thumbnailDirectory, path.basename(photo.name));
  await fs.promises.writeFile(thumbnailPath, thumbnailData);

  return path.join(PROJECT_THUMBNAIL_DIRECTORY, photo.name);
};

const revertPhotoToOriginal = async (data: PhotoBody): Promise<PhotoBody> => {
  const photo: PhotoBody = {
    ...data,
    edited: null,
    edits: DEFAULT_PHOTO_EDITS,
  };

  const thumbnail = await createPhotoThumbnail(photo);

  return {
    ...photo,
    thumbnail,
  };
};

export { createPhotoThumbnail, revertPhotoToOriginal };
