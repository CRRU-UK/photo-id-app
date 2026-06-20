import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { z } from "zod";

import { MAX_RECENT_PROJECTS, RECENT_PROJECTS_FILE_NAME } from "@/constants";
import { recentProjectSchema } from "@/schemas";
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

const getRecentProjectsFilePath = (): string =>
  path.join(app.getPath("userData"), RECENT_PROJECTS_FILE_NAME);

const recentProjectsFileSchema = z.array(recentProjectSchema);

/**
 * Gets a list of recent projects from the internal file.
 */
const getRecentProjects = async (): Promise<RecentProject[]> => {
  const filePath = getRecentProjectsFilePath();

  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = await fs.promises.readFile(filePath, "utf8");
    return recentProjectsFileSchema.parse(JSON.parse(raw));
  } catch (error) {
    console.error("Error reading recent projects file:", error);
    return [];
  }
};

/**
 * Writes the recent projects to the internal file.
 */
const updateRecentProjects = async (data: RecentProject[]) =>
  fs.promises.writeFile(getRecentProjectsFilePath(), JSON.stringify(data, null, 2), "utf8");

interface AddRecentProjectOptions {
  name: string;
  path: string;
}

/**
 * Syncs the current recents to the macOS dock "Recent" submenu via `app.addRecentDocument`.
 *
 * Windows is handled separately via a custom Jump List category (see `shellIntegration.ts`) so
 * each entry can show the project's folder name. The OS-managed `addRecentDocument` path uses the
 * file's display name, which is always `project.photoid` here and would collapse every entry to
 * "project".
 */
const syncMacOsRecents = (recents: RecentProject[]): void => {
  if (process.platform !== "darwin") {
    return;
  }

  app.clearRecentDocuments();
  for (const project of recents) {
    app.addRecentDocument(project.path);
  }
};

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

  syncMacOsRecents(data);

  return data;
};

/**
 * Removes a recent project from the current list and returns the updated list.
 */
const removeRecentProject = async (path: string): Promise<RecentProject[]> => {
  const recentProjects = await getRecentProjects();

  const updatedRecentProjects = recentProjects.filter((item) => item.path !== path);

  await updateRecentProjects(updatedRecentProjects);

  syncMacOsRecents(updatedRecentProjects);

  return updatedRecentProjects;
};

/**
 * Clears all recent projects from the internal file and the macOS dock recents.
 */
const clearRecentProjects = async (): Promise<RecentProject[]> => {
  await updateRecentProjects([]);

  syncMacOsRecents([]);

  return [];
};

export { addRecentProject, clearRecentProjects, getRecentProjects, removeRecentProject };
