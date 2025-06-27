import type { EditWindowData } from "@/types";

import fs from "fs";
import path from "path";
import sharp, { type Sharp } from "sharp";

import { PROJECT_THUMBNAIL_DIRECTORY, THUMBNAIL_SIZE } from "@/constants";

const savePhotoFromBuffer = async (data: EditWindowData, photo: ArrayBuffer) => {
  const buffer = Buffer.from(photo);
  await fs.writeFileSync(data.path, buffer, "utf8");

  const directory = path.dirname(data.path);
  const fileName = path.basename(data.path);

  await createPhotoThumbnail(fileName, directory);
};

const createPhotoThumbnail = async (photo: string, directory: string): Promise<string> => {
  const image: Sharp = sharp(path.join(directory, photo));

  const metadata = await image.metadata();
  const isLandscape = metadata.width >= metadata.height;
  const width = isLandscape ? THUMBNAIL_SIZE : null;
  const height = isLandscape ? null : THUMBNAIL_SIZE;

  const resizedBuffer = await image
    .resize(width, height, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .toBuffer();

  const thumbnailDirectory = path.join(directory, PROJECT_THUMBNAIL_DIRECTORY);
  if (!fs.existsSync(thumbnailDirectory)) {
    await fs.mkdirSync(thumbnailDirectory);
  }

  const thumbnailPath = path.join(thumbnailDirectory, photo);
  await fs.writeFileSync(thumbnailPath, resizedBuffer);

  return path.join(PROJECT_THUMBNAIL_DIRECTORY, photo);
};

export { savePhotoFromBuffer, createPhotoThumbnail };
