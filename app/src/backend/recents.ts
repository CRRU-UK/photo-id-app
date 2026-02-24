import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

import { MAX_RECENT_PROJECTS, RECENT_PROJECTS_FILE_NAME } from "@/constants";
import type { RecentProject } from "@/types";

/**
 * Deduplicates recent projects by path (first occurrence wins) and returns at most max items.
 */
export const dedupeRecentProjects = (items: RecentProject[], max: number): RecentProject[] =>
  items
    .reduce((accumulator, current) => {
      if (!accumulator.some((item) => item.path === current.path)) {
        accumulator.push(current);
      }
      return accumulator;
    }, [] as RecentProject[])
    .slice(0, max);

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
  return JSON.parse(data) as RecentProject[];
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

  const data = dedupeRecentProjects([lastProject, ...recentProjects], MAX_RECENT_PROJECTS);

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

export { addRecentProject, getRecentProjects, removeRecentProject };
