import type { RECENT_PROJECTS } from "src/helpers/types";

import fs from "fs";
import path from "path";
import { app } from "electron";

import { RECENT_PROJECTS_FILE_NAME } from "../helpers/constants";

const appDataPath = app.getPath("appData");
const recentProjectsFile = path.join(appDataPath, RECENT_PROJECTS_FILE_NAME);

const getRecentProjects = (): RECENT_PROJECTS => {
  if (!fs.existsSync(recentProjectsFile)) {
    return [];
  }

  const data = fs.readFileSync(recentProjectsFile, "utf8");
  return JSON.parse(data);
};

const updateRecentProjects = (projectFilePath: string) => {
  const recentProjects = getRecentProjects();

  const lastProject = { path: projectFilePath, lastOpened: new Date().toISOString() };

  // TODO: Probably a simpler way of doing this
  const data = [lastProject, ...recentProjects].reduce((accumulator, currentValue) => {
    if (!accumulator.some((item) => item.path === currentValue.path)) {
      accumulator.push(currentValue);
    }
    return accumulator;
  }, [] as RECENT_PROJECTS);

  fs.writeFileSync(recentProjectsFile, JSON.stringify(data, null, 2), "utf8");
};

export { getRecentProjects, updateRecentProjects };
