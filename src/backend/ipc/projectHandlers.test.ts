import type { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectBody, RecentProject } from "@/types";

const mockShowErrorBox = vi.fn<(title: string, content: string) => void>();
const mockOpenPath = vi.fn<(path: string) => Promise<string>>();

vi.mock("electron", () => ({
  dialog: {
    showErrorBox: (...args: Parameters<typeof mockShowErrorBox>) => mockShowErrorBox(...args),
  },
  shell: {
    openPath: (...args: Parameters<typeof mockOpenPath>) => mockOpenPath(...args),
  },
}));

const mockHandleOpenDirectoryPrompt = vi.fn<(window: BrowserWindow) => Promise<void>>();
const mockHandleOpenFilePrompt = vi.fn<(window: BrowserWindow) => Promise<void>>();
const mockHandleOpenProjectFile =
  vi.fn<(window: BrowserWindow, filePath: string) => Promise<void>>();
const mockHandleSaveProject = vi.fn<(data: string) => Promise<void>>();
const mockHandleExportMatches =
  vi.fn<(window: BrowserWindow, data: string, type: string) => Promise<string>>();
const mockGetCurrentProjectDirectory = vi.fn<() => string | null>();
const mockParseProjectFile = vi.fn<(filePath: string) => Promise<ProjectBody>>();

vi.mock("@/backend/projects", () => ({
  handleOpenDirectoryPrompt: (...args: Parameters<typeof mockHandleOpenDirectoryPrompt>) =>
    mockHandleOpenDirectoryPrompt(...args),
  handleOpenFilePrompt: (...args: Parameters<typeof mockHandleOpenFilePrompt>) =>
    mockHandleOpenFilePrompt(...args),
  handleOpenProjectFile: (...args: Parameters<typeof mockHandleOpenProjectFile>) =>
    mockHandleOpenProjectFile(...args),
  handleSaveProject: (...args: Parameters<typeof mockHandleSaveProject>) =>
    mockHandleSaveProject(...args),
  handleExportMatches: (...args: Parameters<typeof mockHandleExportMatches>) =>
    mockHandleExportMatches(...args),
  getCurrentProjectDirectory: () => mockGetCurrentProjectDirectory(),
  parseProjectFile: (...args: Parameters<typeof mockParseProjectFile>) =>
    mockParseProjectFile(...args),
  handleDuplicatePhotoFile: vi.fn<() => void>(),
  setCurrentProject: vi.fn<() => void>(),
}));

const mockGetRecentProjects = vi.fn<() => Promise<RecentProject[]>>();
const mockRemoveRecentProject = vi.fn<(path: string) => Promise<RecentProject[]>>();

vi.mock("@/backend/recents", () => ({
  getRecentProjects: () => mockGetRecentProjects(),
  removeRecentProject: (...args: Parameters<typeof mockRemoveRecentProject>) =>
    mockRemoveRecentProject(...args),
}));

const mockGetMainWindow = vi.fn<() => BrowserWindow | null>();

vi.mock("@/backend/WindowManager", () => ({
  windowManager: {
    getMainWindow: () => mockGetMainWindow(),
    closeAllEditWindows: vi.fn<() => void>(),
  },
}));

const mockGetWindowFromSender =
  vi.fn<(webContents: Electron.WebContents) => BrowserWindow | null>();
const mockCloseCurrentProject = vi.fn<() => void>();

vi.mock("./shared", () => ({
  getWindowFromSender: (...args: Parameters<typeof mockGetWindowFromSender>) =>
    mockGetWindowFromSender(...args),
  closeCurrentProject: () => mockCloseCurrentProject(),
}));

const {
  handleOpenFolder,
  handleOpenFile,
  handleOpenProjectFileInvoke,
  handleGetRecentProjects,
  handleRemoveRecentProject,
  handleGetCurrentProject,
  handleSaveProjectInvoke,
  handleExportMatchesInvoke,
} = await import("./projectHandlers");

const createMockWindow = (): BrowserWindow =>
  ({
    setTitle: vi.fn<(title: string) => void>(),
    focus: vi.fn<() => void>(),
    webContents: { send: vi.fn<(channel: string, ...args: unknown[]) => void>() },
  }) as unknown as BrowserWindow;

const createMockEvent = (window: BrowserWindow | null): IpcMainEvent =>
  ({
    sender: window ? (window as unknown as { webContents: Electron.WebContents }).webContents : {},
  }) as unknown as IpcMainEvent;

const createMockInvokeEvent = (window: BrowserWindow | null): IpcMainInvokeEvent =>
  ({
    sender: window ? (window as unknown as { webContents: Electron.WebContents }).webContents : {},
  }) as unknown as IpcMainInvokeEvent;

describe("project IPC handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe(handleOpenFolder, () => {
    it("does nothing when the sender window is not found", async () => {
      mockGetWindowFromSender.mockReturnValue(null);

      await handleOpenFolder(createMockEvent(null));

      expect(mockHandleOpenDirectoryPrompt).not.toHaveBeenCalled();
    });

    it("calls handleOpenDirectoryPrompt with the sender window", async () => {
      const mockWindow = createMockWindow();
      mockGetWindowFromSender.mockReturnValue(mockWindow);
      mockHandleOpenDirectoryPrompt.mockResolvedValue(undefined);

      await handleOpenFolder(createMockEvent(mockWindow));

      expect(mockHandleOpenDirectoryPrompt).toHaveBeenCalledWith(mockWindow);
    });

    it("shows an error dialog when handleOpenDirectoryPrompt throws", async () => {
      const mockWindow = createMockWindow();
      mockGetWindowFromSender.mockReturnValue(mockWindow);
      mockHandleOpenDirectoryPrompt.mockRejectedValue(new Error("disk error"));

      await handleOpenFolder(createMockEvent(mockWindow));

      expect(mockShowErrorBox).toHaveBeenCalledWith("Failed to open folder", "Error: disk error");
    });
  });

  describe(handleOpenFile, () => {
    it("does nothing when the sender window is not found", async () => {
      mockGetWindowFromSender.mockReturnValue(null);

      await handleOpenFile(createMockEvent(null));

      expect(mockHandleOpenFilePrompt).not.toHaveBeenCalled();
    });

    it("calls handleOpenFilePrompt with the sender window", async () => {
      const mockWindow = createMockWindow();
      mockGetWindowFromSender.mockReturnValue(mockWindow);
      mockHandleOpenFilePrompt.mockResolvedValue(undefined);

      await handleOpenFile(createMockEvent(mockWindow));

      expect(mockHandleOpenFilePrompt).toHaveBeenCalledWith(mockWindow);
    });

    it("shows an error dialog when handleOpenFilePrompt throws", async () => {
      const mockWindow = createMockWindow();
      mockGetWindowFromSender.mockReturnValue(mockWindow);
      mockHandleOpenFilePrompt.mockRejectedValue(new Error("file error"));

      await handleOpenFile(createMockEvent(mockWindow));

      expect(mockShowErrorBox).toHaveBeenCalledWith("Failed to open file", "Error: file error");
    });
  });

  describe(handleOpenProjectFileInvoke, () => {
    it("throws when the main window is not available", async () => {
      mockGetMainWindow.mockReturnValue(null);

      await expect(
        handleOpenProjectFileInvoke(createMockInvokeEvent(null), "/path/to/project.photoid"),
      ).rejects.toThrowError("Main window not available");
    });

    it("opens the project file in the main window", async () => {
      const mockWindow = createMockWindow();
      mockGetMainWindow.mockReturnValue(mockWindow);
      mockHandleOpenProjectFile.mockResolvedValue(undefined);

      await handleOpenProjectFileInvoke(
        createMockInvokeEvent(mockWindow),
        "/path/to/project.photoid",
      );

      expect(mockHandleOpenProjectFile).toHaveBeenCalledWith(
        mockWindow,
        "/path/to/project.photoid",
      );
    });

    it("re-throws when handleOpenProjectFile fails", async () => {
      const mockWindow = createMockWindow();
      mockGetMainWindow.mockReturnValue(mockWindow);
      mockHandleOpenProjectFile.mockRejectedValue(new Error("parse error"));

      await expect(
        handleOpenProjectFileInvoke(createMockInvokeEvent(mockWindow), "/path/to/project.photoid"),
      ).rejects.toThrowError("parse error");
    });
  });

  describe(handleGetRecentProjects, () => {
    it("returns recent projects from the backend", async () => {
      const mockRecents: RecentProject[] = [
        { name: "Project A", path: "/a", lastOpened: "2026-01-01" },
      ];
      mockGetRecentProjects.mockResolvedValue(mockRecents);

      const result = await handleGetRecentProjects();

      expect(result).toStrictEqual(mockRecents);
    });
  });

  describe(handleRemoveRecentProject, () => {
    it("removes the project and returns the updated list", async () => {
      const remaining: RecentProject[] = [];
      mockRemoveRecentProject.mockResolvedValue(remaining);

      const result = await handleRemoveRecentProject(
        createMockInvokeEvent(null),
        "/path/to/remove",
      );

      expect(mockRemoveRecentProject).toHaveBeenCalledWith("/path/to/remove");
      expect(result).toStrictEqual(remaining);
    });
  });

  describe(handleGetCurrentProject, () => {
    it("returns null when no project is open", async () => {
      mockGetCurrentProjectDirectory.mockReturnValue(null);

      const result = await handleGetCurrentProject();

      expect(result).toBeNull();
    });

    it("parses and returns the current project file", async () => {
      mockGetCurrentProjectDirectory.mockReturnValue("/project/dir");
      const mockProject = { version: "v1", id: "test" } as unknown as ProjectBody;
      mockParseProjectFile.mockResolvedValue(mockProject);

      const result = await handleGetCurrentProject();

      expect(mockParseProjectFile).toHaveBeenCalledWith("/project/dir/project.photoid");
      expect(result).toBe(mockProject);
    });

    it("returns null when parsing fails", async () => {
      mockGetCurrentProjectDirectory.mockReturnValue("/project/dir");
      mockParseProjectFile.mockRejectedValue(new Error("invalid JSON"));

      const result = await handleGetCurrentProject();

      expect(result).toBeNull();
    });
  });

  describe(handleSaveProjectInvoke, () => {
    it("saves the project data", async () => {
      mockHandleSaveProject.mockResolvedValue(undefined);
      const data = JSON.stringify({ version: "v1" });

      await handleSaveProjectInvoke(createMockInvokeEvent(null), data);

      expect(mockHandleSaveProject).toHaveBeenCalledWith(data);
    });

    it("re-throws when save fails", async () => {
      mockHandleSaveProject.mockRejectedValue(new Error("write error"));

      await expect(handleSaveProjectInvoke(createMockInvokeEvent(null), "{}")).rejects.toThrowError(
        "write error",
      );
    });
  });

  describe(handleExportMatchesInvoke, () => {
    it("does nothing when the sender window is not found", async () => {
      mockGetWindowFromSender.mockReturnValue(null);

      await handleExportMatchesInvoke(createMockInvokeEvent(null), "{}", "edited");

      expect(mockHandleExportMatches).not.toHaveBeenCalled();
    });

    it("exports matches and opens the matched folder for edited export", async () => {
      const mockWindow = createMockWindow();
      mockGetWindowFromSender.mockReturnValue(mockWindow);
      mockHandleExportMatches.mockResolvedValue("/project/dir");

      await handleExportMatchesInvoke(createMockInvokeEvent(mockWindow), "{}", "edited");

      expect(mockHandleExportMatches).toHaveBeenCalledWith(mockWindow, "{}", "edited");
      expect(mockOpenPath).toHaveBeenCalledWith("/project/dir/matched");
    });

    it("exports matches and opens the project root for csv export", async () => {
      const mockWindow = createMockWindow();
      mockGetWindowFromSender.mockReturnValue(mockWindow);
      mockHandleExportMatches.mockResolvedValue("/project/dir");

      await handleExportMatchesInvoke(createMockInvokeEvent(mockWindow), "{}", "csv");

      expect(mockHandleExportMatches).toHaveBeenCalledWith(mockWindow, "{}", "csv");
      expect(mockOpenPath).toHaveBeenCalledWith("/project/dir");
    });
  });
});
