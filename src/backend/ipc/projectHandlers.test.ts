import type { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PROJECT_EXPORT_CSV_FILE_NAME, PROJECT_EXPORT_DATA_DIRECTORY } from "@/constants";
import type { ProjectBody, RecentProject } from "@/types";

const mockShowErrorBox = vi.fn<(title: string, content: string) => void>();
const mockOpenPath = vi.fn<(path: string) => Promise<string>>();
const mockShowItemInFolder = vi.fn<(path: string) => void>();

vi.mock("electron", () => ({
  dialog: {
    showErrorBox: (...args: Parameters<typeof mockShowErrorBox>) => mockShowErrorBox(...args),
  },
  shell: {
    openPath: (...args: Parameters<typeof mockOpenPath>) => mockOpenPath(...args),
    showItemInFolder: (...args: Parameters<typeof mockShowItemInFolder>) =>
      mockShowItemInFolder(...args),
  },
}));

const mockProcessProjectFolder =
  vi.fn<(window: BrowserWindow, directory: string) => Promise<void>>();
const mockCheckExistingProjectChoice =
  vi.fn<(directory: string) => Promise<"new" | "existing" | "cancel">>();
const mockLoadExistingProject =
  vi.fn<(window: BrowserWindow, directory: string) => Promise<void>>();
const mockPromptForProjectFolder = vi.fn<() => Promise<string | null>>();
const mockPromptForProjectFile = vi.fn<() => Promise<string | null>>();
const mockHandleOpenProjectFile =
  vi.fn<(window: BrowserWindow, filePath: string) => Promise<void>>();
const mockHandleSaveProject = vi.fn<(directory: string, data: string) => Promise<void>>();
const mockHandleFlushSaveProject = vi.fn<(directory: string, data: string) => void>();
const mockHandleExportMatches =
  vi.fn<
    (window: BrowserWindow, directory: string, data: string, type: string) => Promise<string>
  >();
const mockParseProjectFile = vi.fn<(filePath: string) => Promise<ProjectBody>>();

vi.mock("@/backend/exports", () => ({
  handleExportMatches: (...args: Parameters<typeof mockHandleExportMatches>) =>
    mockHandleExportMatches(...args),
}));

vi.mock("@/backend/projects", () => ({
  processProjectFolder: (...args: Parameters<typeof mockProcessProjectFolder>) =>
    mockProcessProjectFolder(...args),
  checkExistingProjectChoice: (...args: Parameters<typeof mockCheckExistingProjectChoice>) =>
    mockCheckExistingProjectChoice(...args),
  loadExistingProject: (...args: Parameters<typeof mockLoadExistingProject>) =>
    mockLoadExistingProject(...args),
  promptForProjectFolder: () => mockPromptForProjectFolder(),
  promptForProjectFile: () => mockPromptForProjectFile(),
  handleOpenProjectFile: (...args: Parameters<typeof mockHandleOpenProjectFile>) =>
    mockHandleOpenProjectFile(...args),
  handleSaveProject: (...args: Parameters<typeof mockHandleSaveProject>) =>
    mockHandleSaveProject(...args),
  handleFlushSaveProject: (...args: Parameters<typeof mockHandleFlushSaveProject>) =>
    mockHandleFlushSaveProject(...args),
  parseProjectFile: (...args: Parameters<typeof mockParseProjectFile>) =>
    mockParseProjectFile(...args),
  handleDuplicatePhotoFile: vi.fn<() => void>(),
}));

const mockGetRecentProjects = vi.fn<() => Promise<RecentProject[]>>();
const mockRemoveRecentProject = vi.fn<(path: string) => Promise<RecentProject[]>>();

vi.mock("@/backend/recents", () => ({
  getRecentProjects: () => mockGetRecentProjects(),
  removeRecentProject: (...args: Parameters<typeof mockRemoveRecentProject>) =>
    mockRemoveRecentProject(...args),
}));

const mockGetProjectWindowForSender =
  vi.fn<(webContents: Electron.WebContents) => BrowserWindow | null>();
const mockGetDirectoryForSender = vi.fn<(webContents: Electron.WebContents) => string | null>();
const mockGetDirectoryForWindow = vi.fn<(window: BrowserWindow) => string | null>();
const mockFindWindowForProject = vi.fn<(directory: string) => BrowserWindow | null>();

vi.mock("@/backend/WindowManager", () => ({
  windowManager: {
    getProjectWindowForSender: (...args: Parameters<typeof mockGetProjectWindowForSender>) =>
      mockGetProjectWindowForSender(...args),
    getDirectoryForSender: (...args: Parameters<typeof mockGetDirectoryForSender>) =>
      mockGetDirectoryForSender(...args),
    getDirectoryForWindow: (...args: Parameters<typeof mockGetDirectoryForWindow>) =>
      mockGetDirectoryForWindow(...args),
    findWindowForProject: (...args: Parameters<typeof mockFindWindowForProject>) =>
      mockFindWindowForProject(...args),
  },
}));

const mockCreateProjectWindow = vi.fn<() => Promise<BrowserWindow>>();

vi.mock("@/backend/windows", () => ({
  createProjectWindow: (...args: Parameters<typeof mockCreateProjectWindow>) =>
    mockCreateProjectWindow(...args),
}));

const mockGetWindowFromSender =
  vi.fn<(webContents: Electron.WebContents) => BrowserWindow | null>();
const mockFocusExistingWindow = vi.fn<(window: BrowserWindow) => void>();

vi.mock("./shared", () => ({
  getWindowFromSender: (...args: Parameters<typeof mockGetWindowFromSender>) =>
    mockGetWindowFromSender(...args),
  focusExistingWindow: (...args: Parameters<typeof mockFocusExistingWindow>) =>
    mockFocusExistingWindow(...args),
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
  handleFlushSaveProjectSync,
  handleCloseProject,
} = await import("./projectHandlers");

const createMockWindow = (overrides?: Partial<{ isDestroyed: boolean }>): BrowserWindow =>
  ({
    setTitle: vi.fn<(title: string) => void>(),
    focus: vi.fn<() => void>(),
    close: vi.fn<() => void>(),
    isDestroyed: vi.fn<() => boolean>(() => overrides?.isDestroyed ?? false),
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
    // No project is "already open" by default; tests that exercise the focus-existing path
    // override this explicitly.
    mockFindWindowForProject.mockReturnValue(null);
    // Default behaviour: the chosen folder has no pre-existing project file.
    mockCheckExistingProjectChoice.mockResolvedValue("new");
  });

  describe(handleOpenFolder, () => {
    it("does nothing when the sender is not a project window", async () => {
      mockGetProjectWindowForSender.mockReturnValue(null);

      await handleOpenFolder(createMockEvent(null));

      expect(mockProcessProjectFolder).not.toHaveBeenCalled();
    });

    it("loads the folder into the sender window when it has no project", async () => {
      const senderWindow = createMockWindow();
      mockGetProjectWindowForSender.mockReturnValue(senderWindow);
      mockGetDirectoryForWindow.mockReturnValue(null);
      mockPromptForProjectFolder.mockResolvedValue("/my/project");

      await handleOpenFolder(createMockEvent(senderWindow));

      expect(mockCreateProjectWindow).not.toHaveBeenCalled();
      expect(mockProcessProjectFolder).toHaveBeenCalledWith(senderWindow, "/my/project");
    });

    it("spawns a new window and loads into it when the sender already has a project", async () => {
      const senderWindow = createMockWindow();
      const newWindow = createMockWindow();
      mockGetProjectWindowForSender.mockReturnValue(senderWindow);
      mockGetDirectoryForWindow.mockReturnValue("/existing/project");
      mockCreateProjectWindow.mockResolvedValue(newWindow);
      mockPromptForProjectFolder.mockResolvedValue("/new/project");

      await handleOpenFolder(createMockEvent(senderWindow));

      expect(mockCreateProjectWindow).toHaveBeenCalledWith();
      expect(mockProcessProjectFolder).toHaveBeenCalledWith(newWindow, "/new/project");
    });

    it("does nothing further when the user cancels the dialog", async () => {
      const senderWindow = createMockWindow();
      mockGetProjectWindowForSender.mockReturnValue(senderWindow);
      mockGetDirectoryForWindow.mockReturnValue(null);
      mockPromptForProjectFolder.mockResolvedValue(null);

      await handleOpenFolder(createMockEvent(senderWindow));

      expect(mockProcessProjectFolder).not.toHaveBeenCalled();
      expect(mockCreateProjectWindow).not.toHaveBeenCalled();
    });

    it("shows an error dialog when processProjectFolder throws", async () => {
      const senderWindow = createMockWindow();
      mockGetProjectWindowForSender.mockReturnValue(senderWindow);
      mockGetDirectoryForWindow.mockReturnValue(null);
      mockPromptForProjectFolder.mockResolvedValue("/my/project");
      mockProcessProjectFolder.mockRejectedValue(new Error("disk error"));

      await handleOpenFolder(createMockEvent(senderWindow));

      expect(mockShowErrorBox).toHaveBeenCalledWith("Failed to open folder", "Error: disk error");
    });

    it("focuses the existing window when the project is already open", async () => {
      const senderWindow = createMockWindow();
      const existingWindow = createMockWindow();
      mockGetProjectWindowForSender.mockReturnValue(senderWindow);
      mockPromptForProjectFolder.mockResolvedValue("/my/project");
      mockFindWindowForProject.mockReturnValue(existingWindow);

      await handleOpenFolder(createMockEvent(senderWindow));

      expect(mockFindWindowForProject).toHaveBeenCalledWith("/my/project");
      expect(mockFocusExistingWindow).toHaveBeenCalledWith(existingWindow);
      expect(mockProcessProjectFolder).not.toHaveBeenCalled();
      expect(mockCreateProjectWindow).not.toHaveBeenCalled();
    });

    it("loads the existing project when the folder already has a project file", async () => {
      const senderWindow = createMockWindow();
      const newWindow = createMockWindow();
      mockGetProjectWindowForSender.mockReturnValue(senderWindow);
      mockGetDirectoryForWindow.mockReturnValue("/existing/project");
      mockCreateProjectWindow.mockResolvedValue(newWindow);
      mockPromptForProjectFolder.mockResolvedValue("/my/project");
      mockCheckExistingProjectChoice.mockResolvedValue("existing");

      await handleOpenFolder(createMockEvent(senderWindow));

      expect(mockLoadExistingProject).toHaveBeenCalledWith(newWindow, "/my/project");
      expect(mockProcessProjectFolder).not.toHaveBeenCalled();
    });

    it("does not create a window when the user cancels the existing-data dialog", async () => {
      const senderWindow = createMockWindow();
      mockGetProjectWindowForSender.mockReturnValue(senderWindow);
      mockGetDirectoryForWindow.mockReturnValue("/existing/project");
      mockPromptForProjectFolder.mockResolvedValue("/my/project");
      mockCheckExistingProjectChoice.mockResolvedValue("cancel");

      await handleOpenFolder(createMockEvent(senderWindow));

      expect(mockCreateProjectWindow).not.toHaveBeenCalled();
      expect(mockProcessProjectFolder).not.toHaveBeenCalled();
      expect(mockLoadExistingProject).not.toHaveBeenCalled();
    });
  });

  describe(handleOpenFile, () => {
    it("does nothing when the sender is not a project window", async () => {
      mockGetProjectWindowForSender.mockReturnValue(null);

      await handleOpenFile(createMockEvent(null));

      expect(mockHandleOpenProjectFile).not.toHaveBeenCalled();
    });

    it("loads the file into the sender window when it has no project", async () => {
      const senderWindow = createMockWindow();
      mockGetProjectWindowForSender.mockReturnValue(senderWindow);
      mockGetDirectoryForWindow.mockReturnValue(null);
      mockPromptForProjectFile.mockResolvedValue("/my/project/project.photoid");

      await handleOpenFile(createMockEvent(senderWindow));

      expect(mockHandleOpenProjectFile).toHaveBeenCalledWith(
        senderWindow,
        "/my/project/project.photoid",
      );
    });

    it("spawns a new window when the sender already has a project", async () => {
      const senderWindow = createMockWindow();
      const newWindow = createMockWindow();
      mockGetProjectWindowForSender.mockReturnValue(senderWindow);
      mockGetDirectoryForWindow.mockReturnValue("/existing/project");
      mockCreateProjectWindow.mockResolvedValue(newWindow);
      mockPromptForProjectFile.mockResolvedValue("/new/project/project.photoid");

      await handleOpenFile(createMockEvent(senderWindow));

      expect(mockHandleOpenProjectFile).toHaveBeenCalledWith(
        newWindow,
        "/new/project/project.photoid",
      );
    });

    it("focuses the existing window when the project is already open", async () => {
      const senderWindow = createMockWindow();
      const existingWindow = createMockWindow();
      mockGetProjectWindowForSender.mockReturnValue(senderWindow);
      mockPromptForProjectFile.mockResolvedValue("/my/project/project.photoid");
      mockFindWindowForProject.mockReturnValue(existingWindow);

      await handleOpenFile(createMockEvent(senderWindow));

      expect(mockFindWindowForProject).toHaveBeenCalledWith("/my/project");
      expect(mockFocusExistingWindow).toHaveBeenCalledWith(existingWindow);
      expect(mockHandleOpenProjectFile).not.toHaveBeenCalled();
      expect(mockCreateProjectWindow).not.toHaveBeenCalled();
    });
  });

  describe(handleOpenProjectFileInvoke, () => {
    it("throws when the sender is not a project window", async () => {
      mockGetProjectWindowForSender.mockReturnValue(null);

      await expect(
        handleOpenProjectFileInvoke(createMockInvokeEvent(null), "/path/to/project.photoid"),
      ).rejects.toThrow("Sender window not found");
    });

    it("loads the file into the sender window when it has no project", async () => {
      const senderWindow = createMockWindow();
      mockGetProjectWindowForSender.mockReturnValue(senderWindow);
      mockGetDirectoryForWindow.mockReturnValue(null);
      mockHandleOpenProjectFile.mockResolvedValue(undefined);

      await handleOpenProjectFileInvoke(
        createMockInvokeEvent(senderWindow),
        "/path/to/project.photoid",
      );

      expect(mockHandleOpenProjectFile).toHaveBeenCalledWith(
        senderWindow,
        "/path/to/project.photoid",
      );
    });

    it("spawns a new window when the sender already has a project", async () => {
      const senderWindow = createMockWindow();
      const newWindow = createMockWindow();
      mockGetProjectWindowForSender.mockReturnValue(senderWindow);
      mockGetDirectoryForWindow.mockReturnValue("/existing/project");
      mockCreateProjectWindow.mockResolvedValue(newWindow);
      mockHandleOpenProjectFile.mockResolvedValue(undefined);

      await handleOpenProjectFileInvoke(
        createMockInvokeEvent(senderWindow),
        "/new/project.photoid",
      );

      expect(mockHandleOpenProjectFile).toHaveBeenCalledWith(newWindow, "/new/project.photoid");
    });

    it("focuses the existing window when the project is already open", async () => {
      const senderWindow = createMockWindow();
      const existingWindow = createMockWindow();
      mockGetProjectWindowForSender.mockReturnValue(senderWindow);
      mockFindWindowForProject.mockReturnValue(existingWindow);

      await handleOpenProjectFileInvoke(
        createMockInvokeEvent(senderWindow),
        "/my/project/project.photoid",
      );

      expect(mockFindWindowForProject).toHaveBeenCalledWith("/my/project");
      expect(mockFocusExistingWindow).toHaveBeenCalledWith(existingWindow);
      expect(mockHandleOpenProjectFile).not.toHaveBeenCalled();
      expect(mockCreateProjectWindow).not.toHaveBeenCalled();
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
    it("returns null when the sender has no project", async () => {
      mockGetDirectoryForSender.mockReturnValue(null);

      const result = await handleGetCurrentProject(createMockInvokeEvent(null));

      expect(result).toBeNull();
    });

    it("parses and returns the current project for the sender", async () => {
      mockGetDirectoryForSender.mockReturnValue("/project/dir");
      const mockProject = { version: "v1", id: "test" } as unknown as ProjectBody;
      mockParseProjectFile.mockResolvedValue(mockProject);

      const result = await handleGetCurrentProject(createMockInvokeEvent(null));

      expect(mockParseProjectFile).toHaveBeenCalledWith("/project/dir/project.photoid");
      expect(result).toStrictEqual({ body: mockProject, directory: "/project/dir" });
    });

    it("returns null when parsing fails", async () => {
      mockGetDirectoryForSender.mockReturnValue("/project/dir");
      mockParseProjectFile.mockRejectedValue(new Error("invalid JSON"));

      const result = await handleGetCurrentProject(createMockInvokeEvent(null));

      expect(result).toBeNull();
    });
  });

  describe(handleSaveProjectInvoke, () => {
    it("throws when no project is open for the sender", async () => {
      mockGetDirectoryForSender.mockReturnValue(null);

      await expect(handleSaveProjectInvoke(createMockInvokeEvent(null), "{}")).rejects.toThrow(
        "No project open",
      );
    });

    it("saves the project data using the sender's directory", async () => {
      mockGetDirectoryForSender.mockReturnValue("/project");
      mockHandleSaveProject.mockResolvedValue(undefined);
      const data = JSON.stringify({ version: "v1" });

      await handleSaveProjectInvoke(createMockInvokeEvent(null), data);

      expect(mockHandleSaveProject).toHaveBeenCalledWith("/project", data);
    });

    it("re-throws when save fails", async () => {
      mockGetDirectoryForSender.mockReturnValue("/project");
      mockHandleSaveProject.mockRejectedValue(new Error("write error"));

      await expect(handleSaveProjectInvoke(createMockInvokeEvent(null), "{}")).rejects.toThrow(
        "write error",
      );
    });
  });

  describe(handleFlushSaveProjectSync, () => {
    it("calls handleFlushSaveProject and sets returnValue to true on success", () => {
      mockGetDirectoryForSender.mockReturnValue("/project");
      const event = createMockEvent(null);
      const data = JSON.stringify({ version: "v1" });

      handleFlushSaveProjectSync(event, data);

      expect(mockHandleFlushSaveProject).toHaveBeenCalledWith("/project", data);
      expect(event.returnValue).toBe(true);
    });

    it("sets returnValue to false when no project is open for the sender", () => {
      mockGetDirectoryForSender.mockReturnValue(null);
      const event = createMockEvent(null);

      handleFlushSaveProjectSync(event, "{}");

      expect(event.returnValue).toBe(false);
      expect(mockHandleFlushSaveProject).not.toHaveBeenCalled();
    });

    it("sets returnValue to false when handleFlushSaveProject throws", () => {
      mockGetDirectoryForSender.mockReturnValue("/project");
      const event = createMockEvent(null);
      mockHandleFlushSaveProject.mockImplementation(() => {
        throw new Error("write error");
      });

      handleFlushSaveProjectSync(event, "{}");

      expect(event.returnValue).toBe(false);
    });
  });

  describe(handleExportMatchesInvoke, () => {
    it("does nothing when the sender window is not found", async () => {
      mockGetWindowFromSender.mockReturnValue(null);

      await handleExportMatchesInvoke(createMockInvokeEvent(null), "{}", "edited");

      expect(mockHandleExportMatches).not.toHaveBeenCalled();
    });

    it("throws when no project is open for the sender", async () => {
      const mockWindow = createMockWindow();
      mockGetWindowFromSender.mockReturnValue(mockWindow);
      mockGetDirectoryForSender.mockReturnValue(null);

      await expect(
        handleExportMatchesInvoke(createMockInvokeEvent(mockWindow), "{}", "edited"),
      ).rejects.toThrow("No project open");
    });

    it("exports matches and opens the matched folder for edited export", async () => {
      const mockWindow = createMockWindow();
      mockGetWindowFromSender.mockReturnValue(mockWindow);
      mockGetDirectoryForSender.mockReturnValue("/project/dir");
      mockHandleExportMatches.mockResolvedValue("/project/dir");

      await handleExportMatchesInvoke(createMockInvokeEvent(mockWindow), "{}", "edited");

      expect(mockHandleExportMatches).toHaveBeenCalledWith(
        mockWindow,
        "/project/dir",
        "{}",
        "edited",
      );
      expect(mockOpenPath).toHaveBeenCalledWith("/project/dir/matched");
    });

    it("exports matches and shows CSV file selected in folder for csv export", async () => {
      const mockWindow = createMockWindow();
      mockGetWindowFromSender.mockReturnValue(mockWindow);
      mockGetDirectoryForSender.mockReturnValue("/project/dir");
      mockHandleExportMatches.mockResolvedValue("/project/dir");

      await handleExportMatchesInvoke(createMockInvokeEvent(mockWindow), "{}", "csv");

      expect(mockHandleExportMatches).toHaveBeenCalledWith(mockWindow, "/project/dir", "{}", "csv");
      expect(mockShowItemInFolder).toHaveBeenCalledWith(
        `/project/dir/${PROJECT_EXPORT_DATA_DIRECTORY}/${PROJECT_EXPORT_CSV_FILE_NAME}`,
      );
      expect(mockOpenPath).not.toHaveBeenCalled();
    });
  });

  describe(handleCloseProject, () => {
    it("closes the sender's project window", () => {
      const mockWindow = createMockWindow();
      mockGetProjectWindowForSender.mockReturnValue(mockWindow);

      handleCloseProject(createMockEvent(mockWindow));

      expect(mockWindow.close).toHaveBeenCalledWith();
    });

    it("does nothing when the sender window is not found", () => {
      mockGetProjectWindowForSender.mockReturnValue(null);

      expect(() => handleCloseProject(createMockEvent(null))).not.toThrow();
    });

    it("does not call close when the window is already destroyed", () => {
      const mockWindow = createMockWindow({ isDestroyed: true });
      mockGetProjectWindowForSender.mockReturnValue(mockWindow);

      handleCloseProject(createMockEvent(mockWindow));

      expect(mockWindow.close).not.toHaveBeenCalled();
    });
  });
});
