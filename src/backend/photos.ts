import type { EditWindowData } from "@/types";

import fs from "fs";
import path from "path";

import { createThumbnail } from "@/backend/thumbnails";

const handleSavePhoto = async (data: EditWindowData, photo: ArrayBuffer) => {
  const buffer = Buffer.from(photo);
  await fs.writeFileSync(data.path, buffer, "utf8");

  const directory = path.dirname(data.path);
  const fileName = path.basename(data.path);

  await createThumbnail(fileName, directory);
};

export { handleSavePhoto };
