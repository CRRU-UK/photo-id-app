import fs from "fs";
import path from "path";
import sharp, { type Sharp } from "sharp";

import { PROJECT_EDITS_DIRECTORY, PROJECT_THUMBNAIL_DIRECTORY, THUMBNAIL_SIZE } from "@/constants";
import type { PhotoBody } from "@/types";

const savePhotoFromBuffer = async (data: PhotoBody, photoData: ArrayBuffer) => {
  const editedPath = path.join(data.directory, data.edited);
  const buffer = Buffer.from(photoData);
  fs.writeFileSync(editedPath, buffer, "utf8");

  await createPhotoThumbnail(data.name, data.directory);
};

const createPhotoEditsCopy = async (
  originalPhotoName: string,
  projectDirectory: string,
): Promise<string> => {
  const editsDirectory = path.join(projectDirectory, PROJECT_EDITS_DIRECTORY);
  if (!fs.existsSync(editsDirectory)) {
    fs.mkdirSync(editsDirectory);
  }

  const originalPath = path.join(projectDirectory, originalPhotoName);
  const editsPath = path.join(projectDirectory, PROJECT_EDITS_DIRECTORY, originalPhotoName);

  fs.copyFileSync(originalPath, editsPath);

  return path.join(PROJECT_EDITS_DIRECTORY, originalPhotoName);
};

const createPhotoThumbnail = async (
  sourcePhotoName: string,
  projectDirectory: string,
): Promise<string> => {
  const image: Sharp = sharp(path.join(projectDirectory, PROJECT_EDITS_DIRECTORY, sourcePhotoName));

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
  if (!fs.existsSync(thumbnailDirectory)) {
    fs.mkdirSync(thumbnailDirectory);
  }

  const thumbnailPath = path.join(thumbnailDirectory, sourcePhotoName);
  fs.writeFileSync(thumbnailPath, thumbnailData);

  return path.join(PROJECT_THUMBNAIL_DIRECTORY, sourcePhotoName);
};

const revertPhotoToOriginal = async (data: PhotoBody) => {
  const originalPath = path.join(data.directory, data.name);
  const editsPath = path.join(data.directory, data.edited);

  await fs.promises.copyFile(originalPath, editsPath);
  await createPhotoThumbnail(data.name, data.directory);
};

export { savePhotoFromBuffer, createPhotoEditsCopy, createPhotoThumbnail, revertPhotoToOriginal };
