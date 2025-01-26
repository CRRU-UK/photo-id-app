import type { PROJECT_JSON_BODY } from "../helpers/types";

import fs from "fs";
import path from "path";

/**
 * Handles saving a project file.
 */
const handleSaveProject = async (data: string) => {
  const { directory } = JSON.parse(data) as PROJECT_JSON_BODY;
  fs.writeFileSync(path.join(directory, "data.json"), data, "utf8");
};

export { handleSaveProject };
