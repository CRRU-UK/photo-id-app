import fs from "fs";

const handleSavePhoto = async (path: string, data: ArrayBuffer) => {
  const buffer = Buffer.from(data);
  return fs.writeFileSync(path, buffer, "utf8");
};

export { handleSavePhoto };
