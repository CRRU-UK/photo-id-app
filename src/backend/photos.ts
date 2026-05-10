import fs from "node:fs";
import path from "node:path";

import { renderThumbnailWithEdits } from "@/backend/imageRenderer";
import { resolvePhotoPath } from "@/backend/projects";
import { DEFAULT_PHOTO_EDITS, PROJECT_THUMBNAIL_DIRECTORY } from "@/constants";
import type { PhotoBody } from "@/types";

const createPhotoThumbnail = async (directory: string, photo: PhotoBody): Promise<string> => {
  const sourcePath = resolvePhotoPath(directory, photo.name);
  const thumbnailData = await renderThumbnailWithEdits({
    sourcePath,
    edits: photo.edits,
  });

  const thumbnailDirectory = path.join(directory, PROJECT_THUMBNAIL_DIRECTORY);
  if (!fs.existsSync(thumbnailDirectory)) {
    await fs.promises.mkdir(thumbnailDirectory, { recursive: true });
  }

  const thumbnailPath = path.join(thumbnailDirectory, path.basename(photo.name));
  await fs.promises.writeFile(thumbnailPath, thumbnailData);

  return `${PROJECT_THUMBNAIL_DIRECTORY}/${path.basename(photo.name)}`;
};

const revertPhotoToOriginal = async (directory: string, data: PhotoBody): Promise<PhotoBody> => {
  const photo: PhotoBody = {
    ...data,
    edits: DEFAULT_PHOTO_EDITS,
    isEdited: false,
  };

  const thumbnail = await createPhotoThumbnail(directory, photo);

  return {
    ...photo,
    thumbnail,
  };
};

export { createPhotoThumbnail, revertPhotoToOriginal };
