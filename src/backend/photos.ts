import fs from "fs";

const handleSavePhoto = async (path: string, data: ArrayBuffer) => {
  const newPath = path.replace(".JPG", "_new.JPG");
  const buffer = Buffer.from(data);
  return fs.writeFileSync(newPath, buffer, "utf8");
};

export { handleSavePhoto };
