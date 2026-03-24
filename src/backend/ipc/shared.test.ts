/* eslint-disable @typescript-eslint/unbound-method */

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

const mockSetCurrentProject = vi.fn<(directory: string | null) => void>();
const mockGetCurrentProjectDirectory = vi.fn<() => string | null>();
const mockHandleOpenProjectFile =
  vi.fn<(window: BrowserWindow, filePath: string) => Promise<void>>();

vi.mock("@/backend/projects", () => ({
  setCurrentProject: (...args: Parameters<typeof mockSetCurrentProject>) =>
    mockSetCurrentProject(...args),
  getCurrentProjectDirectory: () => mockGetCurrentProjectDirectory(),
  handleOpenProjectFile: (...args: Parameters<typeof mockHandleOpenProjectFile>) =>
    mockHandleOpenProjectFile(...args),
}));

const mockCloseAllEditWindows = vi.fn<() => void>();
const mockGetMainWindow = vi.fn<() => BrowserWindow | null>();

vi.mock("@/backend/WindowManager", () => ({
  windowManager: {
    closeAllEditWindows: () => mockCloseAllEditWindows(),
    getMainWindow: () => mockGetMainWindow(),
  },
}));

const createMockWindow = (): BrowserWindow =>
  ({
    setTitle: vi.fn<(title: string) => void>(),
    focus: vi.fn<() => void>(),
    webContents: {
      send: vi.fn<(channel: string, ...args: unknown[]) => void>(),
    },
  }) as unknown as BrowserWindow;

const {
  getWindowFromSender,
  closeCurrentProject,
  broadcastToAllWindows,
  findPhotoidArg,
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

  describe(closeCurrentProject, () => {
    it("resets the current project to null", () => {
      mockGetMainWindow.mockReturnValue(null);

      closeCurrentProject();

      expect(mockSetCurrentProject).toHaveBeenCalledWith(null);
    });

    it("closes all edit windows", () => {
      mockGetMainWindow.mockReturnValue(null);

      closeCurrentProject();

      expect(mockCloseAllEditWindows).toHaveBeenCalledWith();
    });

    it("resets the main window title when a main window exists", () => {
      const mockWindow = createMockWindow();
      mockGetMainWindow.mockReturnValue(mockWindow);

      closeCurrentProject();

      expect(mockWindow.setTitle).toHaveBeenCalledWith("Photo ID");
    });

    it("does not throw when there is no main window", () => {
      mockGetMainWindow.mockReturnValue(null);

      expect(() => closeCurrentProject()).not.toThrow();
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

  describe(findPhotoidArg, () => {
    it("returns the .photoid argument from argv", () => {
      const argv = ["/usr/bin/app", "--flag", "/path/to/project.photoid"];

      const result = findPhotoidArg(argv);

      expect(result).toBe("/path/to/project.photoid");
    });

    it("returns undefined when no .photoid argument is present", () => {
      const argv = ["/usr/bin/app", "--flag", "other-file.txt"];

      const result = findPhotoidArg(argv);

      expect(result).toBeUndefined();
    });

    it("returns the first .photoid match when multiple exist", () => {
      const argv = ["first.photoid", "second.photoid"];

      const result = findPhotoidArg(argv);

      expect(result).toBe("first.photoid");
    });
  });

  describe(openProjectFromPath, () => {
    it("does nothing when there is no main window", async () => {
      mockGetMainWindow.mockReturnValue(null);

      await openProjectFromPath("/path/to/project.photoid");

      expect(mockHandleOpenProjectFile).not.toHaveBeenCalled();
    });

    it("opens the project file in the main window", async () => {
      const mockWindow = createMockWindow();
      mockGetMainWindow.mockReturnValue(mockWindow);
      mockGetCurrentProjectDirectory.mockReturnValue(null);
      mockHandleOpenProjectFile.mockResolvedValue(undefined);

      await openProjectFromPath("/path/to/project.photoid");

      expect(mockHandleOpenProjectFile).toHaveBeenCalledWith(
        mockWindow,
        "/path/to/project.photoid",
      );
    });

    it("closes the current project before opening a new one", async () => {
      const mockWindow = createMockWindow();
      mockGetMainWindow.mockReturnValue(mockWindow);
      mockGetCurrentProjectDirectory.mockReturnValue("/existing/project");
      mockHandleOpenProjectFile.mockResolvedValue(undefined);

      await openProjectFromPath("/new/project.photoid");

      expect(mockSetCurrentProject).toHaveBeenCalledWith(null);
      expect(mockCloseAllEditWindows).toHaveBeenCalledWith();
    });

    it("focuses the main window after opening the project", async () => {
      const mockWindow = createMockWindow();
      mockGetMainWindow.mockReturnValue(mockWindow);
      mockGetCurrentProjectDirectory.mockReturnValue(null);
      mockHandleOpenProjectFile.mockResolvedValue(undefined);

      await openProjectFromPath("/path/to/project.photoid");

      expect(mockWindow.focus).toHaveBeenCalledWith();
    });
  });

  describe(resolveExternalLinkUrl, () => {
    it("resolves 'website' to the website URL", () => {
      expect(resolveExternalLinkUrl("website")).toBe("https://crru.org.uk");
    });

    it("resolves 'user-guide' to the user guide URL", () => {
      expect(resolveExternalLinkUrl("user-guide")).toContain("user-guide/usage");
    });

    it("resolves 'user-guide-ml' to the ML guide URL", () => {
      expect(resolveExternalLinkUrl("user-guide-ml")).toContain("machine-learning");
    });

    it("resolves 'user-guide-ml-tokens' to the ML tokens URL", () => {
      expect(resolveExternalLinkUrl("user-guide-ml-tokens")).toContain("api-tokens");
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
