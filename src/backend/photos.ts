import fs from "fs";
import path from "path";
import sharp, { type Sharp } from "sharp";

import { PROJECT_EDITS_DIRECTORY, PROJECT_THUMBNAIL_DIRECTORY, THUMBNAIL_SIZE } from "@/constants";
import type { PhotoBody } from "@/types";

const savePhotoFromBuffer = async (data: PhotoBody, photoData: ArrayBuffer) => {
  const targetPath = path.join(data.directory, PROJECT_EDITS_DIRECTORY, data.name);
  const buffer = Buffer.from(photoData);
  fs.writeFileSync(targetPath, buffer, "utf8");

  await createPhotoThumbnail(data.name, data.directory);
};

const createPhotoEditsCopy = async (
  originalPhotoName: string,
  projectDirectory: string,
): Promise<string> => {
  const originalPath = path.join(projectDirectory, originalPhotoName);
  const editsPath = path.join(projectDirectory, PROJECT_EDITS_DIRECTORY, originalPhotoName);

  await fs.promises.copyFile(originalPath, editsPath);

  return path.join(PROJECT_EDITS_DIRECTORY, originalPhotoName);
};

const createPhotoThumbnail = async (
  targetPhoto: string,
  projectDirectory: string,
): Promise<string> => {
  const image: Sharp = sharp(path.join(projectDirectory, targetPhoto));

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
  const thumbnailPath = path.join(thumbnailDirectory, targetPhoto);
  fs.writeFileSync(thumbnailPath, thumbnailData);

  return path.join(PROJECT_THUMBNAIL_DIRECTORY, targetPhoto);
};

const revertPhotoToOriginal = async (data: PhotoBody) => {
  const originalPath = path.join(data.directory, data.name);
  const targetPath = path.join(data.directory, data?.edited || data.name);

  await fs.promises.copyFile(originalPath, targetPath);
  await createPhotoThumbnail(data.name, data.directory);
};

export { createPhotoEditsCopy, createPhotoThumbnail, revertPhotoToOriginal, savePhotoFromBuffer };
