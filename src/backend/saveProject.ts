import type { ProjectJSONBody } from "../helpers/types";

import fs from "fs";
import path from "path";

/**
 * Handles saving a project file.
 */
const handleSaveProject = async (data: string) => {
  const { directory } = JSON.parse(data) as ProjectJSONBody;
  fs.writeFileSync(path.join(directory, "data.json"), data, "utf8");
};

export { handleSaveProject };
