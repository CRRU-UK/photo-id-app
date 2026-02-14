/* eslint-disable @typescript-eslint/unbound-method */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_PHOTO_EDITS,
  IPC_EVENTS,
  PROJECT_EXPORT_DIRECTORY,
  PROJECT_FILE_NAME,
} from "@/constants";
import type { CollectionBody, PhotoBody, ProjectBody } from "@/types";

const mockExistsSync = vi.fn<(path: string) => boolean>();
const mockLstatSync = vi.fn<(path: string) => { isFile: () => boolean }>();
const mockReadFile = vi.fn<(path: string, encoding: string) => Promise<string>>();
const mockWriteFile = vi.fn<(path: string, data: string, encoding: string) => Promise<void>>();
const mockCopyFile = vi.fn<(src: string, dest: string) => Promise<void>>();
const mockReaddir = vi.fn<(path: string) => Promise<string[]>>();
const mockUnlink = vi.fn<(path: string) => Promise<void>>();
const mockMkdir = vi.fn<(path: string) => Promise<void>>();

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn<() => string>(() => "/mock/userData"),
  },
  dialog: {
    showOpenDialog: vi.fn<() => void>(),
    showMessageBox: vi.fn<() => void>(),
    showErrorBox: vi.fn<() => void>(),
  },
}));

vi.mock("node:fs", () => ({
  default: {
    existsSync: (...args: Parameters<typeof mockExistsSync>) => mockExistsSync(...args),
    lstatSync: (...args: Parameters<typeof mockLstatSync>) => mockLstatSync(...args),
    promises: {
      readFile: (...args: Parameters<typeof mockReadFile>) => mockReadFile(...args),
      writeFile: (...args: Parameters<typeof mockWriteFile>) => mockWriteFile(...args),
      copyFile: (...args: Parameters<typeof mockCopyFile>) => mockCopyFile(...args),
      readdir: (...args: Parameters<typeof mockReaddir>) => mockReaddir(...args),
      unlink: (...args: Parameters<typeof mockUnlink>) => mockUnlink(...args),
      mkdir: (...args: Parameters<typeof mockMkdir>) => mockMkdir(...args),
    },
  },
}));

const mockRenderFullImageWithEdits = vi.fn<() => Promise<Buffer>>();

vi.mock("@/backend/imageRenderer", () => ({
  renderFullImageWithEdits: (...args: unknown[]) => mockRenderFullImageWithEdits(...(args as [])),
  renderThumbnailWithEdits: vi.fn<() => void>(),
}));

vi.mock("@/backend/photos", () => ({
  createPhotoThumbnail: vi.fn<() => void>(),
}));

vi.mock("@/backend/recents", () => ({
  dedupeRecentProjects: vi.fn<() => void>(),
  addRecentProject: vi.fn<() => void>(),
  getRecentProjects: vi.fn<() => void>(),
  removeRecentProject: vi.fn<() => void>(),
}));

const {
  findPhotoInProject,
  handleDuplicatePhotoFile,
  handleEditorNavigate,
  handleExportMatches,
  handleOpenDirectoryPrompt,
  handleOpenFilePrompt,
  handleOpenProjectFile,
  handleSaveProject,
  getCurrentProjectDirectory,
  setCurrentProject,
} = await import("./projects");

const createPhoto = (name: string, overrides?: Partial<PhotoBody>): PhotoBody => ({
  directory: "/project",
  name,
  thumbnail: `.thumbnails/${name}`,
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
  id: "test-id",
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
    setTitle: vi.fn<(title: string) => void>(),
    focus: vi.fn<() => void>(),
    webContents: {
      send: vi.fn<(channel: string, ...args: unknown[]) => void>(),
    },
  }) as unknown as Electron.BrowserWindow;

describe(findPhotoInProject, () => {
  it("returns null when project is empty", () => {
    const project = createProject();
    const photo = createPhoto("photo.jpg");

    expect(findPhotoInProject(project, photo)).toBeNull();
  });

  it("finds photo in unassigned collection", () => {
    const photo = createPhoto("photo1.jpg");
    const unassigned: CollectionBody = {
      photos: [createPhoto("photo1.jpg"), createPhoto("photo2.jpg")],
      index: 0,
    };

    const project = createProject({ unassigned });

    expect(findPhotoInProject(project, photo)).toBe(unassigned);
  });

  it("finds photo in discarded collection", () => {
    const photo = createPhoto("discarded.jpg");
    const discarded: CollectionBody = {
      photos: [createPhoto("discarded.jpg")],
      index: 0,
    };

    const project = createProject({ discarded });

    expect(findPhotoInProject(project, photo)).toBe(discarded);
  });

  it("finds photo in matched left collection", () => {
    const photo = createPhoto("left.jpg");
    const leftCollection: CollectionBody = {
      photos: [createPhoto("left.jpg")],
      index: 0,
    };

    const project = createProject({
      matched: [{ id: 1, left: leftCollection, right: createEmptyCollection() }],
    });

    expect(findPhotoInProject(project, photo)).toBe(leftCollection);
  });

  it("finds photo in matched right collection", () => {
    const photo = createPhoto("right.jpg");
    const rightCollection: CollectionBody = {
      photos: [createPhoto("right.jpg")],
      index: 0,
    };

    const project = createProject({
      matched: [{ id: 1, left: createEmptyCollection(), right: rightCollection }],
    });

    expect(findPhotoInProject(project, photo)).toBe(rightCollection);
  });

  it("returns null when photo is not found anywhere", () => {
    const project = createProject({
      unassigned: { photos: [createPhoto("a.jpg")], index: 0 },
      discarded: { photos: [createPhoto("b.jpg")], index: 0 },
      matched: [
        {
          id: 1,
          left: { photos: [createPhoto("c.jpg")], index: 0 },
          right: { photos: [createPhoto("d.jpg")], index: 0 },
        },
      ],
    });

    expect(findPhotoInProject(project, createPhoto("missing.jpg"))).toBeNull();
  });

  it("prioritises unassigned over other collections", () => {
    const photo = createPhoto("shared.jpg");
    const unassigned: CollectionBody = {
      photos: [createPhoto("shared.jpg")],
      index: 0,
    };

    const project = createProject({
      unassigned,
      discarded: { photos: [createPhoto("shared.jpg")], index: 0 },
    });

    expect(findPhotoInProject(project, photo)).toBe(unassigned);
  });

  it("matches by photo name only", () => {
    const project = createProject({
      unassigned: {
        photos: [createPhoto("target.jpg", { directory: "/different" })],
        index: 0,
      },
    });

    const result = findPhotoInProject(project, createPhoto("target.jpg", { directory: "/other" }));

    expect(result).not.toBeNull();
  });
});

// ─── getCurrentProjectDirectory / setCurrentProject ──────────────────

describe("getCurrentProjectDirectory / setCurrentProject", () => {
  it("returns null initially", () => {
    setCurrentProject(null);

    expect(getCurrentProjectDirectory()).toBeNull();
  });

  it("returns the directory after setting it", () => {
    setCurrentProject("/my/project");

    expect(getCurrentProjectDirectory()).toBe("/my/project");
  });

  it("returns null after clearing", () => {
    setCurrentProject("/my/project");
    setCurrentProject(null);

    expect(getCurrentProjectDirectory()).toBeNull();
  });
});

// ─── handleSaveProject ───────────────────────────────────────────────

describe(handleSaveProject, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
  });

  it("writes the project data to the correct file path", async () => {
    const project = createProject({ directory: "/my/project" });
    const data = JSON.stringify(project);

    await handleSaveProject(data);

    expect(mockWriteFile).toHaveBeenCalledWith(`/my/project/${PROJECT_FILE_NAME}`, data, "utf8");
  });

  it("writes the raw JSON string, not re-serialised data", async () => {
    const data = JSON.stringify(createProject());

    await handleSaveProject(data);

    const writtenData = mockWriteFile.mock.calls[0][1];

    expect(writtenData).toBe(data);
  });
});

// ─── handleDuplicatePhotoFile ────────────────────────────────────────

describe(handleDuplicatePhotoFile, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCopyFile.mockResolvedValue(undefined);
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);
  });

  it("copies the original file with a duplicate suffix", async () => {
    const photo = createPhoto("photo.jpg");

    await handleDuplicatePhotoFile(photo);

    expect(mockCopyFile).toHaveBeenCalledWith(
      "/project/photo.jpg",
      expect.stringContaining("_duplicate_1700000000000"),
    );
  });

  it("copies the thumbnail file with a duplicate suffix", async () => {
    const photo = createPhoto("photo.jpg");

    await handleDuplicatePhotoFile(photo);

    // Two copyFile calls: one for original, one for thumbnail
    expect(mockCopyFile).toHaveBeenCalledTimes(2);
  });

  it("returns a new PhotoBody with updated file names", async () => {
    const photo = createPhoto("photo.jpg", {
      thumbnail: ".thumbnails/photo.jpg",
      isEdited: true,
      edits: { ...DEFAULT_PHOTO_EDITS, brightness: 200 },
    });

    const result = await handleDuplicatePhotoFile(photo);

    expect(result.name).toContain("_duplicate_1700000000000");
    expect(result.name).toContain(".jpg");
    expect(result.thumbnail).toContain("_duplicate_1700000000000");
  });

  it("preserves the photo directory", async () => {
    const photo = createPhoto("photo.jpg", { directory: "/my/dir" });

    const result = await handleDuplicatePhotoFile(photo);

    expect(result.directory).toBe("/my/dir");
  });

  it("preserves edits and isEdited state", async () => {
    const edits = { ...DEFAULT_PHOTO_EDITS, brightness: 200 };
    const photo = createPhoto("photo.jpg", { edits, isEdited: true });

    const result = await handleDuplicatePhotoFile(photo);

    expect(result.edits).toStrictEqual(edits);
    expect(result.isEdited).toBe(true);
  });
});

// ─── handleEditorNavigate ────────────────────────────────────────────

describe(handleEditorNavigate, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the collection has only one photo", async () => {
    const photo = createPhoto("solo.jpg");
    const project = createProject({
      unassigned: { photos: [photo], index: 0 },
    });
    mockReadFile.mockResolvedValue(JSON.stringify(project));

    const result = await handleEditorNavigate(photo, "next");

    expect(result).toBeNull();
  });

  it("returns the next photo when navigating forward", async () => {
    const photos = [createPhoto("a.jpg"), createPhoto("b.jpg"), createPhoto("c.jpg")];
    const project = createProject({
      unassigned: { photos, index: 0 },
    });
    mockReadFile.mockResolvedValue(JSON.stringify(project));

    const result = await handleEditorNavigate(photos[0], "next");

    expect(result!.name).toBe("b.jpg");
  });

  it("wraps to first photo when navigating forward from the last", async () => {
    const photos = [createPhoto("a.jpg"), createPhoto("b.jpg"), createPhoto("c.jpg")];
    const project = createProject({
      unassigned: { photos, index: 0 },
    });
    mockReadFile.mockResolvedValue(JSON.stringify(project));

    const result = await handleEditorNavigate(photos[2], "next");

    expect(result!.name).toBe("a.jpg");
  });

  it("returns the previous photo when navigating backward", async () => {
    const photos = [createPhoto("a.jpg"), createPhoto("b.jpg"), createPhoto("c.jpg")];
    const project = createProject({
      unassigned: { photos, index: 0 },
    });
    mockReadFile.mockResolvedValue(JSON.stringify(project));

    const result = await handleEditorNavigate(photos[1], "prev");

    expect(result!.name).toBe("a.jpg");
  });

  it("wraps to last photo when navigating backward from the first", async () => {
    const photos = [createPhoto("a.jpg"), createPhoto("b.jpg"), createPhoto("c.jpg")];
    const project = createProject({
      unassigned: { photos, index: 0 },
    });
    mockReadFile.mockResolvedValue(JSON.stringify(project));

    const result = await handleEditorNavigate(photos[0], "prev");

    expect(result!.name).toBe("c.jpg");
  });

  it("throws when the photo is not found in the project", async () => {
    const project = createProject({
      unassigned: { photos: [createPhoto("other.jpg")], index: 0 },
    });
    mockReadFile.mockResolvedValue(JSON.stringify(project));

    await expect(handleEditorNavigate(createPhoto("missing.jpg"), "next")).rejects.toThrowError(
      "Photo not found in project",
    );
  });

  it("returns null when the collection is empty", async () => {
    const photo = createPhoto("solo.jpg");
    const project = createProject({
      unassigned: { photos: [photo], index: 0 },
    });
    mockReadFile.mockResolvedValue(JSON.stringify(project));

    const result = await handleEditorNavigate(photo, "prev");

    expect(result).toBeNull();
  });

  it("navigates within matched collections", async () => {
    const photos = [createPhoto("m1.jpg"), createPhoto("m2.jpg")];
    const project = createProject({
      matched: [
        {
          id: 1,
          left: { photos, index: 0 },
          right: createEmptyCollection(),
        },
      ],
    });
    mockReadFile.mockResolvedValue(JSON.stringify(project));

    const result = await handleEditorNavigate(photos[0], "next");

    expect(result!.name).toBe("m2.jpg");
  });
});

// ─── handleOpenProjectFile ───────────────────────────────────────────

describe(handleOpenProjectFile, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends loading event to the main window", async () => {
    const mainWindow = createMockMainWindow();
    const project = createProject();
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(project));

    await handleOpenProjectFile(mainWindow, "/project/data.json");

    expect(mainWindow.webContents.send).toHaveBeenCalledWith(IPC_EVENTS.SET_LOADING, {
      show: true,
      text: "Opening project",
    });
  });

  it("shows an error when the file does not exist", async () => {
    const { dialog } = await import("electron");
    const mainWindow = createMockMainWindow();
    mockExistsSync.mockReturnValue(false);

    await handleOpenProjectFile(mainWindow, "/missing/data.json");

    expect(dialog.showErrorBox).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("/missing/data.json"),
    );
  });

  it("sends hide-loading event when the file does not exist", async () => {
    const mainWindow = createMockMainWindow();
    mockExistsSync.mockReturnValue(false);

    await handleOpenProjectFile(mainWindow, "/missing/data.json");

    expect(mainWindow.webContents.send).toHaveBeenCalledWith(
      IPC_EVENTS.SET_LOADING,
      expect.objectContaining({ show: false }),
    );
  });

  it("loads and sends the project data when the file exists", async () => {
    const mainWindow = createMockMainWindow();
    const project = createProject({ directory: "/my/project" });
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(project));

    await handleOpenProjectFile(mainWindow, "/my/project/data.json");

    expect(mainWindow.webContents.send).toHaveBeenCalledWith(
      IPC_EVENTS.LOAD_PROJECT,
      expect.objectContaining({ directory: "/my/project" }),
    );
  });

  it("sets the window title with the project directory", async () => {
    const mainWindow = createMockMainWindow();
    const project = createProject({ directory: "/my/project" });
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(project));

    await handleOpenProjectFile(mainWindow, "/my/project/data.json");

    expect(mainWindow.setTitle).toHaveBeenCalledWith(expect.stringContaining("/my/project"));
  });

  it("focuses the main window after loading", async () => {
    const mainWindow = createMockMainWindow();
    const project = createProject();
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(project));

    await handleOpenProjectFile(mainWindow, "/project/data.json");

    expect(mainWindow.focus).toHaveBeenCalledWith();
  });
});

// ─── handleExportMatches ─────────────────────────────────────────────

describe(handleExportMatches, () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    await handleExportMatches(mainWindow, JSON.stringify(project));

    expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining("matched"));
  });

  it("cleans existing export files before exporting", async () => {
    const mainWindow = createMockMainWindow();
    const project = createProject({ matched: [] });
    mockExistsSync.mockReturnValue(true);
    mockReaddir.mockResolvedValue(["old-export.jpg"]);

    await handleExportMatches(mainWindow, JSON.stringify(project));

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

    await handleExportMatches(mainWindow, JSON.stringify(project));

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

    await handleExportMatches(mainWindow, JSON.stringify(project));

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

    await handleExportMatches(mainWindow, JSON.stringify(project));

    const loadingCalls = (mainWindow.webContents.send as ReturnType<typeof vi.fn>).mock.calls;
    const progressCalls = loadingCalls.filter(
      (call: unknown[]) => call[0] === IPC_EVENTS.SET_LOADING,
    );

    expect(progressCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("sends hide-loading event after export completes", async () => {
    const mainWindow = createMockMainWindow();
    const project = createProject({ matched: [] });
    mockExistsSync.mockReturnValue(false);

    await handleExportMatches(mainWindow, JSON.stringify(project));

    const lastCall = (mainWindow.webContents.send as ReturnType<typeof vi.fn>).mock.calls.at(-1);

    expect(lastCall).toStrictEqual([IPC_EVENTS.SET_LOADING, { show: false }]);
  });

  it("handles export with no matched photos", async () => {
    const mainWindow = createMockMainWindow();
    const project = createProject({ matched: [] });
    mockExistsSync.mockReturnValue(false);

    await handleExportMatches(mainWindow, JSON.stringify(project));

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

    await handleExportMatches(mainWindow, JSON.stringify(project));

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

    await handleExportMatches(mainWindow, JSON.stringify(project));

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

    await handleExportMatches(mainWindow, JSON.stringify(project));

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

    await handleExportMatches(mainWindow, JSON.stringify(project));

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
    mockExistsSync.mockReturnValue(false);

    await handleExportMatches(mainWindow, JSON.stringify(project));

    expect(mockCopyFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining(`/my/project/${PROJECT_EXPORT_DIRECTORY}/`),
    );
  });
});

// ─── handleOpenDirectoryPrompt ───────────────────────────────────────

describe(handleOpenDirectoryPrompt, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
    mockLstatSync.mockReturnValue({ isFile: () => true });
  });

  it("does nothing when the dialog is cancelled", async () => {
    const { dialog } = await import("electron");
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: true,
      filePaths: [],
    });
    const mainWindow = createMockMainWindow();

    await handleOpenDirectoryPrompt(mainWindow);

    expect(mainWindow.webContents.send).not.toHaveBeenCalled();
  });

  it("loads existing project when user chooses to open existing data", async () => {
    const { dialog } = await import("electron");
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: ["/my/project"],
    });
    mockReaddir.mockResolvedValue([PROJECT_FILE_NAME, "photo.jpg"]);
    vi.mocked(dialog.showMessageBox).mockResolvedValue({ response: 1, checkboxChecked: false });

    const project = createProject({ directory: "/my/project" });
    mockReadFile.mockResolvedValue(JSON.stringify(project));

    const mainWindow = createMockMainWindow();

    await handleOpenDirectoryPrompt(mainWindow);

    expect(mainWindow.webContents.send).toHaveBeenCalledWith(
      IPC_EVENTS.LOAD_PROJECT,
      expect.objectContaining({ directory: "/my/project" }),
    );
  });

  it("cancels when user dismisses the existing data dialog", async () => {
    const { dialog } = await import("electron");
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: ["/my/project"],
    });
    mockReaddir.mockResolvedValue([PROJECT_FILE_NAME, "photo.jpg"]);
    vi.mocked(dialog.showMessageBox).mockResolvedValue({ response: 0, checkboxChecked: false });

    const mainWindow = createMockMainWindow();

    await handleOpenDirectoryPrompt(mainWindow);

    // Should not load any project or show loading
    expect(mainWindow.webContents.send).not.toHaveBeenCalledWith(
      IPC_EVENTS.LOAD_PROJECT,
      expect.anything(),
    );
  });

  it("creates a new project when the directory has no existing data file", async () => {
    const { dialog } = await import("electron");
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: ["/my/project"],
    });
    mockReaddir.mockResolvedValue(["photo1.jpg", "photo2.png"]);
    mockExistsSync.mockReturnValue(false);

    const mainWindow = createMockMainWindow();

    await handleOpenDirectoryPrompt(mainWindow);

    // Should show loading
    expect(mainWindow.webContents.send).toHaveBeenCalledWith(
      IPC_EVENTS.SET_LOADING,
      expect.objectContaining({ show: true, text: "Preparing project" }),
    );

    // Should write the new project file
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining(PROJECT_FILE_NAME),
      expect.any(String),
      "utf8",
    );

    // Should load the new project
    expect(mainWindow.webContents.send).toHaveBeenCalledWith(
      IPC_EVENTS.LOAD_PROJECT,
      expect.objectContaining({ directory: "/my/project" }),
    );
  });

  it("creates a new project when user chooses to overwrite existing data", async () => {
    const { dialog } = await import("electron");
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: ["/my/project"],
    });
    mockReaddir.mockResolvedValue([PROJECT_FILE_NAME, "photo.jpg"]);
    // Response 2 = "Create new" (neither cancel nor open existing)
    vi.mocked(dialog.showMessageBox).mockResolvedValue({ response: 2, checkboxChecked: false });
    mockExistsSync.mockReturnValue(false);

    const mainWindow = createMockMainWindow();

    await handleOpenDirectoryPrompt(mainWindow);

    // Should create a new project, not load the existing one via readFile
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining(PROJECT_FILE_NAME),
      expect.any(String),
      "utf8",
    );
    expect(mainWindow.webContents.send).toHaveBeenCalledWith(
      IPC_EVENTS.LOAD_PROJECT,
      expect.objectContaining({ directory: "/my/project" }),
    );
  });

  it("filters out directory entries when creating a new project", async () => {
    const { dialog } = await import("electron");
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: ["/my/project"],
    });
    mockReaddir.mockResolvedValue(["photo.jpg", "subfolder", "image.png"]);
    mockExistsSync.mockReturnValue(false);

    // "subfolder" is not a file
    mockLstatSync.mockImplementation((filePath: string) => ({
      isFile: () => !filePath.includes("subfolder"),
    }));

    const mainWindow = createMockMainWindow();

    await handleOpenDirectoryPrompt(mainWindow);

    // Only photo.jpg and image.png should be included (not subfolder)
    const writeCall = mockWriteFile.mock.calls.find((call) => call[0].includes(PROJECT_FILE_NAME));
    const savedProject = JSON.parse(writeCall![1]) as ProjectBody;

    expect(savedProject.unassigned.photos).toHaveLength(2);
  });

  it("skips creating thumbnail directory when it already exists", async () => {
    const { dialog } = await import("electron");
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: ["/my/project"],
    });
    mockReaddir.mockResolvedValue(["photo.jpg"]);
    mockExistsSync.mockReturnValue(true);

    const mainWindow = createMockMainWindow();

    await handleOpenDirectoryPrompt(mainWindow);

    expect(mockMkdir).not.toHaveBeenCalled();
  });

  it("filters out non-image files when creating a new project", async () => {
    const { dialog } = await import("electron");
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: ["/my/project"],
    });
    mockReaddir.mockResolvedValue(["photo.jpg", "readme.txt", "data.csv", "image.png"]);
    mockExistsSync.mockReturnValue(false);

    const mainWindow = createMockMainWindow();

    await handleOpenDirectoryPrompt(mainWindow);

    // The written project should only include .jpg and .png files (2 photos)
    const writeCall = mockWriteFile.mock.calls.find((call) => call[0].includes(PROJECT_FILE_NAME));
    const savedProject = JSON.parse(writeCall![1]) as ProjectBody;

    expect(savedProject.unassigned.photos).toHaveLength(2);
  });
});

// ─── handleOpenFilePrompt ────────────────────────────────────────────

describe(handleOpenFilePrompt, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when the dialog is cancelled", async () => {
    const { dialog } = await import("electron");
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: true,
      filePaths: [],
    });
    const mainWindow = createMockMainWindow();

    await handleOpenFilePrompt(mainWindow);

    expect(mainWindow.webContents.send).not.toHaveBeenCalled();
  });

  it("loads and sends the project from the selected file", async () => {
    const { dialog } = await import("electron");
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: ["/my/project/data.json"],
    });
    const project = createProject({ directory: "/my/project" });
    mockReadFile.mockResolvedValue(JSON.stringify(project));

    const mainWindow = createMockMainWindow();

    await handleOpenFilePrompt(mainWindow);

    expect(mainWindow.webContents.send).toHaveBeenCalledWith(IPC_EVENTS.SET_LOADING, {
      show: true,
      text: "Opening project",
    });

    expect(mainWindow.webContents.send).toHaveBeenCalledWith(
      IPC_EVENTS.LOAD_PROJECT,
      expect.objectContaining({ directory: "/my/project" }),
    );
  });
});
