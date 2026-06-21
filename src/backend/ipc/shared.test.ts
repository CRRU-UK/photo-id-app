import type { BrowserWindow } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFromWebContents = vi.fn<(webContents: Electron.WebContents) => BrowserWindow | null>();
const mockGetAllWindows = vi.fn<() => BrowserWindow[]>();
const mockShowErrorBox = vi.fn<(title: string, content: string) => void>();

vi.mock("electron", () => ({
  BrowserWindow: {
    fromWebContents: (...args: Parameters<typeof mockFromWebContents>) =>
      mockFromWebContents(...args),
    getAllWindows: () => mockGetAllWindows(),
  },
  dialog: {
    showErrorBox: (...args: Parameters<typeof mockShowErrorBox>) => mockShowErrorBox(...args),
  },
}));

const mockHandleOpenProjectFile =
  vi.fn<(window: BrowserWindow, filePath: string) => Promise<void>>();

vi.mock("@/backend/projects", () => ({
  handleOpenProjectFile: (...args: Parameters<typeof mockHandleOpenProjectFile>) =>
    mockHandleOpenProjectFile(...args),
}));

const mockFindIdleProjectWindow = vi.fn<() => BrowserWindow | null>();
const mockFindWindowForProject = vi.fn<(directory: string) => BrowserWindow | null>();
const mockGetDirectoryForWindow = vi.fn<(window: BrowserWindow) => string | null>();

vi.mock("@/backend/WindowManager", () => ({
  windowManager: {
    findIdleProjectWindow: () => mockFindIdleProjectWindow(),
    findWindowForProject: (...args: Parameters<typeof mockFindWindowForProject>) =>
      mockFindWindowForProject(...args),
    getDirectoryForWindow: (...args: Parameters<typeof mockGetDirectoryForWindow>) =>
      mockGetDirectoryForWindow(...args),
  },
}));

const mockCreateProjectWindow = vi.fn<() => Promise<BrowserWindow>>();

vi.mock("@/backend/windows", () => ({
  createProjectWindow: (...args: Parameters<typeof mockCreateProjectWindow>) =>
    mockCreateProjectWindow(...args),
}));

const createMockWindow = (
  overrides?: Partial<{ isDestroyed: boolean; isMinimized: boolean }>,
): BrowserWindow =>
  ({
    setTitle: vi.fn<(title: string) => void>(),
    focus: vi.fn<() => void>(),
    restore: vi.fn<() => void>(),
    close: vi.fn<() => void>(),
    isDestroyed: vi.fn<() => boolean>(() => overrides?.isDestroyed ?? false),
    isMinimized: vi.fn<() => boolean>(() => overrides?.isMinimized ?? false),
    setRepresentedFilename: vi.fn<(filename: string) => void>(),
    setDocumentEdited: vi.fn<(edited: boolean) => void>(),
    webContents: {
      send: vi.fn<(channel: string, ...args: unknown[]) => void>(),
    },
  }) as unknown as BrowserWindow;

const {
  getWindowFromSender,
  broadcastToAllWindows,
  findProjectFileArg,
  focusExistingWindow,
  openProjectFromPath,
  resolveExternalLinkUrl,
  withErrorDialog,
} = await import("./shared");

describe("shared IPC utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe(getWindowFromSender, () => {
    it("delegates to BrowserWindow.fromWebContents", () => {
      const mockWindow = createMockWindow();
      const mockWebContents = {} as Electron.WebContents;
      mockFromWebContents.mockReturnValue(mockWindow);

      const result = getWindowFromSender(mockWebContents);

      expect(result).toBe(mockWindow);
      expect(mockFromWebContents).toHaveBeenCalledWith(mockWebContents);
    });

    it("returns null when no window is found", () => {
      mockFromWebContents.mockReturnValue(null);

      const result = getWindowFromSender({} as Electron.WebContents);

      expect(result).toBeNull();
    });
  });

  describe(broadcastToAllWindows, () => {
    it("sends the event to all open windows", () => {
      const window1 = createMockWindow();
      const window2 = createMockWindow();
      mockGetAllWindows.mockReturnValue([window1, window2]);

      broadcastToAllWindows("test:event", { key: "value" });

      expect(window1.webContents.send).toHaveBeenCalledWith("test:event", { key: "value" });
      expect(window2.webContents.send).toHaveBeenCalledWith("test:event", { key: "value" });
    });

    it("does nothing when there are no open windows", () => {
      mockGetAllWindows.mockReturnValue([]);

      expect(() => broadcastToAllWindows("test:event", null)).not.toThrow();
    });
  });

  describe(findProjectFileArg, () => {
    it("returns the .photoid argument from argv", () => {
      const argv = ["/usr/bin/app", "--flag", "/path/to/project.photoid"];

      const result = findProjectFileArg(argv);

      expect(result).toBe("/path/to/project.photoid");
    });

    it("returns undefined when no .photoid argument is present", () => {
      const argv = ["/usr/bin/app", "--flag", "other-file.txt"];

      const result = findProjectFileArg(argv);

      expect(result).toBeUndefined();
    });

    it("returns the first .photoid match when multiple exist", () => {
      const argv = ["first.photoid", "second.photoid"];

      const result = findProjectFileArg(argv);

      expect(result).toBe("first.photoid");
    });
  });

  describe(openProjectFromPath, () => {
    it("reuses an idle project window when one exists", async () => {
      const idleWindow = createMockWindow();
      mockFindWindowForProject.mockReturnValue(null);
      mockFindIdleProjectWindow.mockReturnValue(idleWindow);
      mockHandleOpenProjectFile.mockResolvedValue(undefined);

      await openProjectFromPath("/path/to/project.photoid");

      expect(mockCreateProjectWindow).not.toHaveBeenCalled();
      expect(mockHandleOpenProjectFile).toHaveBeenCalledWith(
        idleWindow,
        "/path/to/project.photoid",
      );
      expect(idleWindow.focus).toHaveBeenCalledWith();
    });

    it("spawns a project-route window when no idle window exists", async () => {
      const newWindow = createMockWindow();
      mockFindWindowForProject.mockReturnValue(null);
      mockFindIdleProjectWindow.mockReturnValue(null);
      mockCreateProjectWindow.mockResolvedValue(newWindow);
      mockHandleOpenProjectFile.mockResolvedValue(undefined);
      mockGetDirectoryForWindow.mockReturnValue("/path/to");

      await openProjectFromPath("/path/to/project.photoid");

      expect(mockCreateProjectWindow).toHaveBeenCalledWith({ initialRoute: "/project" });
      expect(mockHandleOpenProjectFile).toHaveBeenCalledWith(newWindow, "/path/to/project.photoid");
      expect(newWindow.focus).toHaveBeenCalledWith();
      expect(newWindow.close).not.toHaveBeenCalled();
    });

    it("closes the fresh window when the load fails to register a project", async () => {
      const newWindow = createMockWindow();
      mockFindWindowForProject.mockReturnValue(null);
      mockFindIdleProjectWindow.mockReturnValue(null);
      mockCreateProjectWindow.mockResolvedValue(newWindow);
      mockHandleOpenProjectFile.mockResolvedValue(undefined);
      mockGetDirectoryForWindow.mockReturnValue(null);

      await openProjectFromPath("/path/to/project.photoid");

      expect(newWindow.close).toHaveBeenCalledWith();
      expect(newWindow.focus).not.toHaveBeenCalled();
    });

    it("does not close an idle window when the load fails on it", async () => {
      const idleWindow = createMockWindow();
      mockFindWindowForProject.mockReturnValue(null);
      mockFindIdleProjectWindow.mockReturnValue(idleWindow);
      mockHandleOpenProjectFile.mockResolvedValue(undefined);
      mockGetDirectoryForWindow.mockReturnValue(null);

      await openProjectFromPath("/path/to/project.photoid");

      expect(idleWindow.close).not.toHaveBeenCalled();
    });

    it("focuses an existing window and does not load when the project is already open", async () => {
      const existingWindow = createMockWindow();
      mockFindWindowForProject.mockReturnValue(existingWindow);

      await openProjectFromPath("/path/to/project.photoid");

      expect(mockFindWindowForProject).toHaveBeenCalledWith("/path/to");
      expect(mockHandleOpenProjectFile).not.toHaveBeenCalled();
      expect(mockCreateProjectWindow).not.toHaveBeenCalled();
      expect(existingWindow.focus).toHaveBeenCalledWith();
    });
  });

  describe(focusExistingWindow, () => {
    it("focuses a visible window", () => {
      const window = createMockWindow();

      focusExistingWindow(window);

      expect(window.focus).toHaveBeenCalledWith();
    });

    it("restores a minimised window before focusing", () => {
      const window = createMockWindow({ isMinimized: true });

      focusExistingWindow(window);

      expect(window.restore).toHaveBeenCalledWith();
      expect(window.focus).toHaveBeenCalledWith();
    });

    it("does nothing when the window is destroyed", () => {
      const window = createMockWindow({ isDestroyed: true });

      focusExistingWindow(window);

      expect(window.focus).not.toHaveBeenCalled();
    });
  });

  describe(resolveExternalLinkUrl, () => {
    it("resolves 'website' to the website URL", () => {
      expect(resolveExternalLinkUrl("website")).toBe("https://crru.org.uk");
    });

    it("resolves 'user-guide' to the user guide URL", () => {
      expect(resolveExternalLinkUrl("user-guide")).toContain("user-guide/usage");
    });

    it("resolves 'user-guide-analysis' to the analysis guide URL", () => {
      expect(resolveExternalLinkUrl("user-guide-analysis")).toContain("analysis");
    });

    it("resolves 'user-guide-analysis-tokens' to the analysis tokens URL", () => {
      expect(resolveExternalLinkUrl("user-guide-analysis-tokens")).toContain("api-tokens");
    });

    it("resolves 'privacy' to the privacy URL", () => {
      expect(resolveExternalLinkUrl("privacy")).toContain("privacy");
    });

    it("resolves 'changelog' with the version number", () => {
      const result = resolveExternalLinkUrl("changelog");

      expect(result).toContain("releases/v");
      expect(result).not.toContain("$VERSION");
    });

    it("returns undefined for an unrecognised link", () => {
      const result = resolveExternalLinkUrl("unknown" as never);

      expect(result).toBeUndefined();
    });
  });

  describe(withErrorDialog, () => {
    it("calls the handler function", async () => {
      const handler = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const wrapped = withErrorDialog("test action", handler);

      await wrapped();

      expect(handler).toHaveBeenCalledWith();
    });

    it("shows an error dialog when the handler throws", async () => {
      const handler = vi.fn<() => Promise<void>>().mockRejectedValue(new Error("something broke"));
      const wrapped = withErrorDialog("test action", handler);

      await wrapped();

      expect(mockShowErrorBox).toHaveBeenCalledWith("Failed to test action", "something broke");
    });

    it("does not show an error dialog when the handler succeeds", async () => {
      const handler = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
      const wrapped = withErrorDialog("test action", handler);

      await wrapped();

      expect(mockShowErrorBox).not.toHaveBeenCalled();
    });
  });
});
