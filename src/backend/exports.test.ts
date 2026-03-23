/* eslint-disable @typescript-eslint/unbound-method */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_PHOTO_EDITS,
  IPC_EVENTS,
  PROJECT_EXPORT_CSV_FILE_NAME,
  PROJECT_EXPORT_DATA_DIRECTORY,
  PROJECT_EXPORT_DIRECTORY,
} from "@/constants";
import type { CollectionBody, PhotoBody, PhotoEdits, ProjectBody } from "@/types";

const mockExistsSync = vi.fn<(path: string) => boolean>();
const mockWriteFile =
  vi.fn<(path: string, data: string | Buffer, encoding?: string) => Promise<void>>();
const mockCopyFile = vi.fn<(src: string, dest: string) => Promise<void>>();
const mockReaddir = vi.fn<(path: string) => Promise<string[]>>();
const mockUnlink = vi.fn<(path: string) => Promise<void>>();
const mockMkdir = vi.fn<(path: string) => Promise<void>>();

vi.mock("node:fs", () => ({
  default: {
    existsSync: (...args: Parameters<typeof mockExistsSync>) => mockExistsSync(...args),
    promises: {
      writeFile: (...args: Parameters<typeof mockWriteFile>) => mockWriteFile(...args),
      copyFile: (...args: Parameters<typeof mockCopyFile>) => mockCopyFile(...args),
      readdir: (...args: Parameters<typeof mockReaddir>) => mockReaddir(...args),
      unlink: (...args: Parameters<typeof mockUnlink>) => mockUnlink(...args),
      mkdir: (...args: Parameters<typeof mockMkdir>) => mockMkdir(...args),
    },
  },
}));

const mockRenderFullImageWithEdits =
  vi.fn<(options: { sourcePath: string; edits: PhotoEdits }) => Promise<Buffer>>();

vi.mock("@/backend/imageRenderer", () => ({
  renderFullImageWithEdits: (...args: Parameters<typeof mockRenderFullImageWithEdits>) =>
    mockRenderFullImageWithEdits(...args),
}));

const mockGetCurrentProjectDirectory = vi.fn<() => string | null>();

vi.mock("@/backend/projects", () => ({
  getCurrentProjectDirectory: () => mockGetCurrentProjectDirectory(),
}));

const { handleExportMatches } = await import("./exports");

const createPhoto = (name: string, overrides?: Partial<PhotoBody>): PhotoBody => ({
  directory: "/project",
  name,
  thumbnail: `thumbnails/${name}`,
  edits: DEFAULT_PHOTO_EDITS,
  isEdited: false,
  ...overrides,
});

const createEmptyCollection = (): CollectionBody => ({
  photos: [],
  index: 0,
});

const createProject = (overrides?: Partial<ProjectBody>): ProjectBody => ({
  version: "v1",
  id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  directory: "/project",
  unassigned: createEmptyCollection(),
  discarded: createEmptyCollection(),
  matched: [],
  created: "2025-01-01T00:00:00.000Z",
  lastModified: "2025-01-01T00:00:00.000Z",
  ...overrides,
});

const createMockMainWindow = () =>
  ({
    webContents: {
      send: vi.fn<(channel: string, ...args: unknown[]) => void>(),
    },
  }) as unknown as Electron.BrowserWindow;

describe(handleExportMatches, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentProjectDirectory.mockReturnValue("/project");
    mockWriteFile.mockResolvedValue(undefined);
    mockCopyFile.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue([]);
    mockRenderFullImageWithEdits.mockResolvedValue(Buffer.from("rendered-image"));
  });

  it("creates the exports directory if it does not exist", async () => {
    const mainWindow = createMockMainWindow();
    const project = createProject({ matched: [] });
    mockExistsSync.mockReturnValue(false);

    await handleExportMatches(mainWindow, JSON.stringify(project), "edited");

    expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining("matched"));
  });

  it("cleans existing export files before exporting", async () => {
    const mainWindow = createMockMainWindow();
    const project = createProject({ matched: [] });
    mockExistsSync.mockReturnValue(true);
    mockReaddir.mockResolvedValue(["old-export.jpg"]);

    await handleExportMatches(mainWindow, JSON.stringify(project), "edited");

    expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining("old-export.jpg"));
  });

  it("copies unedited photos directly", async () => {
    const mainWindow = createMockMainWindow();
    const photo = createPhoto("photo.jpg", { isEdited: false });
    const project = createProject({
      matched: [
        {
          id: 1,
          left: { photos: [photo], index: 0, name: "" },
          right: createEmptyCollection(),
        },
      ],
    });
    mockExistsSync.mockReturnValue(false);

    await handleExportMatches(mainWindow, JSON.stringify(project), "edited");

    expect(mockCopyFile).toHaveBeenCalledWith(expect.any(String), expect.any(String));
    expect(mockRenderFullImageWithEdits).not.toHaveBeenCalled();
  });

  it("renders edited photos with edits before exporting", async () => {
    const mainWindow = createMockMainWindow();
    const photo = createPhoto("photo.jpg", { isEdited: true });
    const project = createProject({
      matched: [
        {
          id: 1,
          left: { photos: [photo], index: 0, name: "" },
          right: createEmptyCollection(),
        },
      ],
    });
    mockExistsSync.mockReturnValue(false);

    await handleExportMatches(mainWindow, JSON.stringify(project), "edited");

    expect(mockRenderFullImageWithEdits).toHaveBeenCalledWith(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expect.objectContaining({ sourcePath: expect.any(String) }),
    );
    expect(mockWriteFile).toHaveBeenCalledWith(expect.any(String), expect.any(Buffer));
  });

  it("sends progress updates during export", async () => {
    const mainWindow = createMockMainWindow();
    const photo = createPhoto("photo.jpg", { isEdited: false });
    const project = createProject({
      matched: [
        {
          id: 1,
          left: { photos: [photo], index: 0, name: "" },
          right: createEmptyCollection(),
        },
      ],
    });
    mockExistsSync.mockReturnValue(false);

    await handleExportMatches(mainWindow, JSON.stringify(project), "edited");

    const loadingCalls = vi.mocked(mainWindow.webContents.send).mock.calls;
    const progressCalls = loadingCalls.filter(
      (call: unknown[]) => call[0] === IPC_EVENTS.SET_LOADING,
    );

    expect(progressCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("sends hide-loading event after export completes", async () => {
    const mainWindow = createMockMainWindow();
    const project = createProject({ matched: [] });
    mockExistsSync.mockReturnValue(false);

    await handleExportMatches(mainWindow, JSON.stringify(project), "edited");

    const lastCall = vi.mocked(mainWindow.webContents.send).mock.calls.at(-1);

    expect(lastCall).toStrictEqual([IPC_EVENTS.SET_LOADING, { show: false }]);
  });

  it("handles export with no matched photos", async () => {
    const mainWindow = createMockMainWindow();
    const project = createProject({ matched: [] });
    mockExistsSync.mockReturnValue(false);

    await handleExportMatches(mainWindow, JSON.stringify(project), "edited");

    expect(mockCopyFile).not.toHaveBeenCalled();
    expect(mockRenderFullImageWithEdits).not.toHaveBeenCalled();
  });

  it("uses collection name as export prefix when name is set", async () => {
    const mainWindow = createMockMainWindow();
    const photo = createPhoto("photo.jpg", { isEdited: false });
    const project = createProject({
      matched: [
        {
          id: 1,
          left: { photos: [photo], index: 0, name: "42" },
          right: createEmptyCollection(),
        },
      ],
    });
    mockExistsSync.mockReturnValue(false);

    await handleExportMatches(mainWindow, JSON.stringify(project), "edited");

    // Name "42" is padded to "042" and used as prefix
    expect(mockCopyFile).toHaveBeenCalledWith(expect.any(String), expect.stringContaining("042L_"));
  });

  it("exports right-side photos", async () => {
    const mainWindow = createMockMainWindow();
    const photo = createPhoto("right.jpg", { isEdited: false });
    const project = createProject({
      matched: [
        {
          id: 1,
          left: createEmptyCollection(),
          right: { photos: [photo], index: 0, name: "" },
        },
      ],
    });
    mockExistsSync.mockReturnValue(false);

    await handleExportMatches(mainWindow, JSON.stringify(project), "edited");

    expect(mockCopyFile).toHaveBeenCalledWith(expect.any(String), expect.stringContaining("R_"));
  });

  it("exports edited JPEG photo with original extension", async () => {
    const mainWindow = createMockMainWindow();
    const photo = createPhoto("photo.jpg", { isEdited: true });
    const project = createProject({
      matched: [
        {
          id: 1,
          left: { photos: [photo], index: 0, name: "" },
          right: createEmptyCollection(),
        },
      ],
    });
    mockExistsSync.mockReturnValue(false);

    await handleExportMatches(mainWindow, JSON.stringify(project), "edited");

    // Edited JPEG should keep .jpg extension
    expect(mockWriteFile).toHaveBeenCalledWith(expect.stringMatching(/\.jpg$/), expect.any(Buffer));
  });

  it("exports edited PNG photo with .png extension", async () => {
    const mainWindow = createMockMainWindow();
    const photo = createPhoto("photo.png", { isEdited: true });
    const project = createProject({
      matched: [
        {
          id: 1,
          left: { photos: [photo], index: 0, name: "" },
          right: createEmptyCollection(),
        },
      ],
    });
    mockExistsSync.mockReturnValue(false);

    await handleExportMatches(mainWindow, JSON.stringify(project), "edited");

    // Non-JPEG edited photo should be exported as .png
    expect(mockWriteFile).toHaveBeenCalledWith(expect.stringMatching(/\.png$/), expect.any(Buffer));
  });

  it("writes exported files to the project export directory", async () => {
    const mainWindow = createMockMainWindow();
    const photo = createPhoto("photo.jpg", { isEdited: false, directory: "/my/project" });
    const project = createProject({
      directory: "/my/project",
      matched: [
        {
          id: 1,
          left: { photos: [photo], index: 0, name: "" },
          right: createEmptyCollection(),
        },
      ],
    });
    mockGetCurrentProjectDirectory.mockReturnValue(project.directory);
    mockExistsSync.mockReturnValue(false);

    await handleExportMatches(mainWindow, JSON.stringify(project), "edited");

    expect(mockCopyFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining(`/my/project/${PROJECT_EXPORT_DIRECTORY}/`),
    );
  });

  it("returns the project directory", async () => {
    const mainWindow = createMockMainWindow();
    const project = createProject({ directory: "/my/project", matched: [] });
    mockGetCurrentProjectDirectory.mockReturnValue(project.directory);
    mockExistsSync.mockReturnValue(false);

    const directory = await handleExportMatches(mainWindow, JSON.stringify(project), "edited");

    expect(directory).toBe("/my/project");
  });

  it("throws when no project is open", async () => {
    const mainWindow = createMockMainWindow();
    const project = createProject({ matched: [] });
    mockGetCurrentProjectDirectory.mockReturnValue(null);
    mockExistsSync.mockReturnValue(false);

    await expect(
      handleExportMatches(mainWindow, JSON.stringify(project), "edited"),
    ).rejects.toThrow("No project open");
  });

  it("throws when data is invalid JSON", async () => {
    const mainWindow = createMockMainWindow();

    await expect(handleExportMatches(mainWindow, "not json", "edited")).rejects.toThrow(
      /Unexpected token|JSON/,
    );
  });

  it("throws when data does not match project schema", async () => {
    const mainWindow = createMockMainWindow();
    const invalidPayload = JSON.stringify({ directory: "/path", version: "v1" });

    await expect(handleExportMatches(mainWindow, invalidPayload, "edited")).rejects.toThrow(
      /invalid_type|required/,
    );
  });

  it("unedited export copies all photos and never renders with edits", async () => {
    const mainWindow = createMockMainWindow();
    const editedPhoto = createPhoto("edited.jpg", { isEdited: true });
    const uneditedPhoto = createPhoto("unedited.jpg", { isEdited: false });
    const project = createProject({
      matched: [
        {
          id: 1,
          left: { photos: [editedPhoto, uneditedPhoto], index: 0, name: "" },
          right: createEmptyCollection(),
        },
      ],
    });
    mockExistsSync.mockReturnValue(false);

    await handleExportMatches(mainWindow, JSON.stringify(project), "unedited");

    expect(mockCopyFile).toHaveBeenCalledTimes(2);
    expect(mockRenderFullImageWithEdits).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  it("csv export writes to project root and does not clear matched folder", async () => {
    const mainWindow = createMockMainWindow();
    const photo1 = createPhoto("left.jpg", { isEdited: false });
    const photo2 = createPhoto("right.png", { isEdited: false });
    const project = createProject({
      directory: "/my/project",
      matched: [
        {
          id: 1,
          left: { photos: [photo1], index: 0, name: "" },
          right: { photos: [photo2], index: 0, name: "" },
        },
      ],
    });
    mockGetCurrentProjectDirectory.mockReturnValue(project.directory);

    await handleExportMatches(mainWindow, JSON.stringify(project), "csv");

    expect(mockUnlink).not.toHaveBeenCalled();
    expect(mockCopyFile).not.toHaveBeenCalled();
    expect(mockRenderFullImageWithEdits).not.toHaveBeenCalled();
    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    expect(mockWriteFile).toHaveBeenCalledWith(
      `/my/project/${PROJECT_EXPORT_DATA_DIRECTORY}/${PROJECT_EXPORT_CSV_FILE_NAME}`,
      expect.stringContaining("match_id,original_file_name"),
      "utf8",
    );
  });

  it("csv export content includes header and match rows", async () => {
    const mainWindow = createMockMainWindow();
    const photo1 = createPhoto("left.jpg", { isEdited: false });
    const photo2 = createPhoto("right.png", { isEdited: false });
    const project = createProject({
      directory: "/my/project",
      matched: [
        {
          id: 1,
          left: { photos: [photo1], index: 0, name: "" },
          right: { photos: [photo2], index: 0, name: "" },
        },
      ],
    });
    mockGetCurrentProjectDirectory.mockReturnValue(project.directory);

    await handleExportMatches(mainWindow, JSON.stringify(project), "csv");

    const [, csvContent] = vi.mocked(mockWriteFile).mock.calls[0];

    expect(csvContent).toContain("A,left.jpg");
    expect(csvContent).toContain("A,right.png");
  });

  it("csv export uses collection name when set", async () => {
    const mainWindow = createMockMainWindow();
    const photo = createPhoto("photo.jpg", { isEdited: false });
    const project = createProject({
      directory: "/project",
      matched: [
        {
          id: 1,
          left: { photos: [photo], index: 0, name: "42" },
          right: createEmptyCollection(),
        },
      ],
    });

    await handleExportMatches(mainWindow, JSON.stringify(project), "csv");

    const [, csvContent] = vi.mocked(mockWriteFile).mock.calls[0];

    expect(csvContent).toContain("042,photo.jpg");
  });

  it("csv export with no matches writes header only", async () => {
    const mainWindow = createMockMainWindow();
    const project = createProject({ directory: "/project", matched: [] });

    await handleExportMatches(mainWindow, JSON.stringify(project), "csv");

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining(`${PROJECT_EXPORT_DATA_DIRECTORY}/${PROJECT_EXPORT_CSV_FILE_NAME}`),
      "match_id,original_file_name\n",
      "utf8",
    );
  });
});
