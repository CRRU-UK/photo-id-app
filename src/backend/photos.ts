import fs from "fs";
import path from "path";
import sharp, { type Sharp } from "sharp";

import { PROJECT_EDITS_DIRECTORY, PROJECT_THUMBNAIL_DIRECTORY, THUMBNAIL_SIZE } from "@/constants";
import type { PhotoBody } from "@/types";

/**
 * Saves a photo to the edited directory from buffer data, creates a thumbnail for it,
 * then returns the edited path to send back to the renderer.
 */
const savePhotoFromBuffer = async (photo: PhotoBody, data: ArrayBuffer) => {
  const targetPath = path.join(PROJECT_EDITS_DIRECTORY, photo.name);
  const buffer = Buffer.from(data);

  await fs.promises.writeFile(path.join(photo.directory, targetPath), buffer, "utf8");

  await createPhotoThumbnail(targetPath, photo.directory);

  return targetPath;
};

// TODO: Rename
const createPhotoEditsCopy = async (
  targetPhotoPath: string,
  projectDirectory: string,
): Promise<string> => {
  const originalPath = path.join(projectDirectory, targetPhotoPath);
  const editsPath = path.join(projectDirectory, PROJECT_EDITS_DIRECTORY, targetPhotoPath);

  await fs.promises.copyFile(originalPath, editsPath);

  return path.join(PROJECT_EDITS_DIRECTORY, targetPhotoPath);
};

const createPhotoThumbnail = async (
  targetPhotoPath: string,
  projectDirectory: string,
): Promise<string> => {
  const image: Sharp = sharp(path.join(projectDirectory, targetPhotoPath));

  const metadata = await image.metadata();
  const isLandscape = metadata.width >= metadata.height;
  const width = isLandscape ? THUMBNAIL_SIZE : null;
  const height = isLandscape ? null : THUMBNAIL_SIZE;

  const thumbnailData = await image
    .resize(width, height, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();

  const thumbnailDirectory = path.join(projectDirectory, PROJECT_THUMBNAIL_DIRECTORY);
  const thumbnailPath = path.join(thumbnailDirectory, path.basename(targetPhotoPath));
  await fs.promises.writeFile(thumbnailPath, thumbnailData);

  return path.join(PROJECT_THUMBNAIL_DIRECTORY, targetPhotoPath);
};

const revertPhotoToOriginal = async (data: PhotoBody): Promise<PhotoBody> => {
  if (!data.edited) {
    console.error("Unable to revert photo to original as edited version does not exist:", data);
    return data;
  }

  // Delete edited file when reverting
  await Promise.all([
    fs.promises.unlink(path.join(data.directory, data.edited)),
    createPhotoThumbnail(data.name, data.directory),
  ]);

  return {
    ...data,
    edited: null,
  };
};

export { createPhotoEditsCopy, createPhotoThumbnail, revertPhotoToOriginal, savePhotoFromBuffer };
