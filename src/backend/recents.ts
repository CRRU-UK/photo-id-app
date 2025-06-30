import { app } from "electron";
import fs from "fs";
import path from "path";

import { RECENT_PROJECTS_FILE_NAME, MAX_RECENT_PROJECTS } from "@/constants";
import type { RecentProject } from "@/types";

const userDataPath = app.getPath("userData");
const recentProjectsFile = path.join(userDataPath, RECENT_PROJECTS_FILE_NAME);

/**
 * Gets a list of recent projects from the internal file.
 */
const getRecentProjects = async (): Promise<RecentProject[]> => {
  if (!fs.existsSync(recentProjectsFile)) {
    return [];
  }

  const data = await fs.promises.readFile(recentProjectsFile, "utf8");
  return JSON.parse(data);
};

/**
 * Writes the recent projects to the internal file.
 */
const updateRecentProjects = async (data: RecentProject[]) =>
  fs.promises.writeFile(recentProjectsFile, JSON.stringify(data, null, 2), "utf8");

interface AddRecentProjectOptions {
  name: string;
  path: string;
}

/**
 * Adds a recent project to the current list and returns the updated list.
 */
const addRecentProject = async ({
  name,
  path,
}: AddRecentProjectOptions): Promise<RecentProject[]> => {
  const recentProjects = await getRecentProjects();

  const lastProject = { name, path, lastOpened: new Date().toISOString() };

  // TODO: Probably a simpler way of doing this
  const data = [lastProject, ...recentProjects]
    .reduce((accumulator, currentValue) => {
      if (!accumulator.some((item) => item.path === currentValue.path)) {
        accumulator.push(currentValue);
      }
      return accumulator;
    }, [] as RecentProject[])
    .slice(0, MAX_RECENT_PROJECTS);

  await updateRecentProjects(data);

  return data;
};

/**
 * Removes a recent project from the current list and returns the updated list.
 */
const removeRecentProject = async (path: string): Promise<RecentProject[]> => {
  const recentProjects = await getRecentProjects();

  const updatedRecentProjects = recentProjects.filter((item) => item.path !== path);

  await updateRecentProjects(updatedRecentProjects);

  return updatedRecentProjects;
};

export { getRecentProjects, addRecentProject, removeRecentProject };
