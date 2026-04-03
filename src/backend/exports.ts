import fs from "node:fs";
import path from "node:path";
import { stringify } from "csv-stringify/sync";
import { renderFullImageWithEdits } from "@/backend/imageRenderer";
import { getCurrentProjectDirectory, resolvePhotoPath } from "@/backend/projects";
import {
  IPC_EVENTS,
  PROJECT_EXPORT_CSV_FILE_NAME,
  PROJECT_EXPORT_DATA_DIRECTORY,
  PROJECT_EXPORT_DIRECTORY,
} from "@/constants";
import { getAlphabetLetter } from "@/helpers";
import { projectBodySchema } from "@/schemas";
import type { CollectionBody, ExportTypes, ProjectBody } from "@/types";

/**
 * Returns the label used for a match in exports (CSV and photo filenames): letter from match id,
 * or padded collection name when set.
 */
const getMatchExportLabel = (matchId: number, sideName: string): string => {
  if (sideName && sideName !== "") {
    return sideName.padStart(3, "0");
  }

  return getAlphabetLetter(matchId);
};

const exportMatchesAsCSV = async (
  mainWindow: Electron.BrowserWindow,
  project: ProjectBody,
  directory: string,
): Promise<string> => {
  mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, {
    show: true,
    text: "Exporting CSV",
    progressValue: 0,
  });

  const records: string[][] = [["match_id", "original_file_name"]];

  for (const match of project.matched) {
    const addSide = (side: CollectionBody) => {
      const photoName = getMatchExportLabel(match.id, side.name ?? "");

      for (const photo of side.photos) {
        records.push([photoName, photo.name]);
      }
    };

    addSide(match.left);
    addSide(match.right);
  }

  const dataDirectory = path.join(directory, PROJECT_EXPORT_DATA_DIRECTORY);

  if (!fs.existsSync(dataDirectory)) {
    await fs.promises.mkdir(dataDirectory);
  }

  const csvPath = path.join(dataDirectory, PROJECT_EXPORT_CSV_FILE_NAME);
  const csvContent = stringify(records);
  await fs.promises.writeFile(csvPath, csvContent, "utf8");

  mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, { show: false });

  return directory;
};

const exportMatchesAsPhotos = async (
  mainWindow: Electron.BrowserWindow,
  project: ProjectBody,
  directory: string,
  useEdits: boolean,
): Promise<string> => {
  mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, {
    show: true,
    text: "Exporting matches",
    progressValue: 0,
  });

  const exportsDirectory = path.join(directory, PROJECT_EXPORT_DIRECTORY);

  if (fs.existsSync(exportsDirectory)) {
    await fs.promises.rm(exportsDirectory, { recursive: true });
  }

  await fs.promises.mkdir(exportsDirectory);

  let progress = 0;
  const totalPhotos = project.matched.reduce(
    (acc, match) => acc + match.left.photos.length + match.right.photos.length,
    0,
  );

  const handleSide = async (matchId: number, side: CollectionBody, label: "L" | "R") => {
    const photoName = getMatchExportLabel(matchId, side.name ?? "");

    for (const photo of side.photos) {
      progress = progress + 1;

      mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, {
        show: true,
        text: "Exporting matches",
        progressValue: (progress / totalPhotos) * 100,
        progressText: `Exporting match ${progress} of ${totalPhotos}`,
      });

      const originalExtension = path.extname(photo.name);
      const baseExportName = `${photoName}${label}_${path.basename(photo.name, originalExtension)}`;

      const sourcePath = resolvePhotoPath(directory, photo.name);

      const exportedName = `${baseExportName}${originalExtension}`;
      const exportedPath = path.join(exportsDirectory, exportedName);

      if (!useEdits || !photo.isEdited) {
        await fs.promises.copyFile(sourcePath, exportedPath);
        continue;
      }

      const renderedBuffer = await renderFullImageWithEdits({
        sourcePath,
        edits: photo.edits,
      });

      const useJPEG =
        originalExtension.toLowerCase() === ".jpg" || originalExtension.toLowerCase() === ".jpeg";
      const exportExtension = useJPEG ? originalExtension : ".png";

      const finalExportedName = `${baseExportName}${exportExtension}`;
      const finalExportedPath = path.join(exportsDirectory, finalExportedName);

      await fs.promises.writeFile(finalExportedPath, renderedBuffer);
    }
  };

  for (const match of project.matched) {
    await Promise.all([
      handleSide(match.id, match.left, "L"),
      handleSide(match.id, match.right, "R"),
    ]);
  }

  mainWindow.webContents.send(IPC_EVENTS.SET_LOADING, { show: false });

  return directory;
};

/**
 * Handles exporting matches.
 */
export const handleExportMatches = async (
  mainWindow: Electron.BrowserWindow,
  data: string,
  type: ExportTypes,
): Promise<string> => {
  const json: unknown = JSON.parse(data);
  const project = projectBodySchema.parse(json);

  const directory = getCurrentProjectDirectory();

  if (directory === null) {
    throw new Error("No project open");
  }

  if (type === "csv") {
    return exportMatchesAsCSV(mainWindow, project, directory);
  }

  return exportMatchesAsPhotos(mainWindow, project, directory, type === "edited");
};
