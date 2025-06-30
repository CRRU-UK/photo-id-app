import fs from "fs";
import mime from "mime";
import path from "path";
import sharp, { type Sharp } from "sharp";

import { PROJECT_EDITS_DIRECTORY, THUMBNAIL_SIZE } from "@/constants";
import type { PhotoBody, EditData } from "@/types";

const savePhotoFromBuffer = async (data: EditData, photoData: ArrayBuffer): Promise<PhotoBody> => {
  const { directory, name, edited } = data;

  const editedPath = path.join(directory, edited);
  const buffer = Buffer.from(photoData);
  fs.writeFileSync(editedPath, buffer, "utf8");

  const thumbnail = await createPhotoThumbnail(data.name, data.directory);

  return { directory, name, edited, thumbnail };
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

/**
 * Creates a photo thumbnail as a base64 string.
 */
const createPhotoThumbnail = async (
  sourcePhotoName: string,
  projectDirectory: string,
): Promise<string> => {
  const file = path.join(projectDirectory, PROJECT_EDITS_DIRECTORY, sourcePhotoName);

  console.log("sourcePhotoName", sourcePhotoName);
  console.log("projectDirectory", projectDirectory);

  const image: Sharp = sharp(file);

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

  const data = `data:${mime.getType(file)};base64,${thumbnailData.toString("base64")}`;
  return data;
};

const revertPhotoToOriginal = async (data: EditData): Promise<PhotoBody> => {
  const originalPath = path.join(data.directory, data.name);
  const editsPath = path.join(data.directory, data.edited);

  await fs.promises.copyFile(originalPath, editsPath);
  const thumbnail = await createPhotoThumbnail(data.name, data.directory);

  return {
    directory: data.directory,
    name: data.name,
    edited: data.edited,
    thumbnail: thumbnail,
  };
};

export { savePhotoFromBuffer, createPhotoEditsCopy, createPhotoThumbnail, revertPhotoToOriginal };
