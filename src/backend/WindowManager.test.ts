import type { BrowserWindow } from "electron";

import { beforeEach, describe, expect, it, vi } from "vitest";

type EventHandler = () => void;

interface MockWindow extends BrowserWindow {
  triggerClosed: () => void;
}

let nextWindowId = 1;

const createMockBrowserWindow = (
  overrides?: Partial<{ id: number; isDestroyed: boolean; closable: boolean }>,
): MockWindow => {
  const eventHandlers: Record<string, EventHandler[]> = {};
  const id = overrides?.id ?? nextWindowId++;

  const webContents = {
    id,
    send: vi.fn<(channel: string, ...args: unknown[]) => void>(),
  };

  return {
    id,
    webContents,
    on: vi.fn<(event: string, handler: EventHandler) => void>((event, handler) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    }),
    isDestroyed: vi.fn<() => boolean>(() => overrides?.isDestroyed ?? false),
    closable: overrides?.closable ?? true,
    close: vi.fn<() => void>(),
    triggerClosed() {
      for (const handler of eventHandlers.closed ?? []) {
        handler();
      }
    },
  } as unknown as MockWindow;
};

const mockFromWebContents = vi.fn<(webContents: Electron.WebContents) => BrowserWindow | null>();

vi.mock("electron", () => ({
  BrowserWindow: {
    fromWebContents: (...args: Parameters<typeof mockFromWebContents>) =>
      mockFromWebContents(...args),
  },
}));

describe("windowManager", () => {
  let windowManager: typeof import("./WindowManager").windowManager;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    nextWindowId = 1;
    const mod = await import("./WindowManager");
    windowManager = mod.windowManager;
  });

  describe("project windows", () => {
    it("registers a project window with no project initially", () => {
      const window = createMockBrowserWindow();
      windowManager.registerProjectWindow(window);

      expect(windowManager.getDirectoryForWindow(window)).toBeNull();
    });

    it("sets and gets the project directory for a registered window", () => {
      const window = createMockBrowserWindow();
      windowManager.registerProjectWindow(window);
      windowManager.setProject(window, "/my/project");

      expect(windowManager.getDirectoryForWindow(window)).toBe("/my/project");
    });

    it("does not store a directory for an unregistered window", () => {
      const window = createMockBrowserWindow();
      windowManager.setProject(window, "/my/project");

      expect(windowManager.getDirectoryForWindow(window)).toBeNull();
    });

    it("clears the project directory but keeps the window registered", () => {
      const window = createMockBrowserWindow();
      windowManager.registerProjectWindow(window);
      windowManager.setProject(window, "/my/project");

      windowManager.clearProject(window);

      expect(windowManager.getDirectoryForWindow(window)).toBeNull();
    });

    it("removes the window from the registry when it closes", () => {
      const window = createMockBrowserWindow();
      windowManager.registerProjectWindow(window);
      windowManager.setProject(window, "/my/project");

      window.triggerClosed();

      expect(windowManager.getDirectoryForWindow(window)).toBeNull();
    });

    it("returns all open project directories", () => {
      const windowA = createMockBrowserWindow();
      const windowB = createMockBrowserWindow();
      const windowC = createMockBrowserWindow();

      windowManager.registerProjectWindow(windowA);
      windowManager.registerProjectWindow(windowB);
      windowManager.registerProjectWindow(windowC);

      windowManager.setProject(windowA, "/project/a");
      windowManager.setProject(windowB, "/project/b");
      // windowC stays idle

      expect(windowManager.getAllProjectDirectories()).toStrictEqual(
        new Set(["/project/a", "/project/b"]),
      );
    });

    it("finds an idle project window when one exists", () => {
      const windowA = createMockBrowserWindow();
      const windowB = createMockBrowserWindow();

      windowManager.registerProjectWindow(windowA);
      windowManager.registerProjectWindow(windowB);
      windowManager.setProject(windowA, "/project/a");

      expect(windowManager.findIdleProjectWindow()).toBe(windowB);
    });

    it("returns null when no idle project window exists", () => {
      const window = createMockBrowserWindow();
      windowManager.registerProjectWindow(window);
      windowManager.setProject(window, "/project/a");

      expect(windowManager.findIdleProjectWindow()).toBeNull();
    });

    it("hasOpenProjectWindows is true when any registered window exists", () => {
      const window = createMockBrowserWindow();
      windowManager.registerProjectWindow(window);

      expect(windowManager.hasOpenProjectWindows()).toBe(true);
    });

    it("hasOpenProjectWindows is false when none are registered", () => {
      expect(windowManager.hasOpenProjectWindows()).toBe(false);
    });
  });

  describe("findWindowForProject", () => {
    it("returns the window that has the given project loaded", () => {
      const windowA = createMockBrowserWindow();
      const windowB = createMockBrowserWindow();
      windowManager.registerProjectWindow(windowA);
      windowManager.registerProjectWindow(windowB);
      windowManager.setProject(windowA, "/project/a");
      windowManager.setProject(windowB, "/project/b");

      expect(windowManager.findWindowForProject("/project/b")).toBe(windowB);
    });

    it("returns null when no window has the given project loaded", () => {
      const window = createMockBrowserWindow();
      windowManager.registerProjectWindow(window);
      windowManager.setProject(window, "/project/a");

      expect(windowManager.findWindowForProject("/project/b")).toBeNull();
    });

    it("ignores idle windows (no project loaded)", () => {
      const window = createMockBrowserWindow();
      windowManager.registerProjectWindow(window);

      expect(windowManager.findWindowForProject("/project/a")).toBeNull();
    });

    it("normalises trailing separators", () => {
      const window = createMockBrowserWindow();
      windowManager.registerProjectWindow(window);
      windowManager.setProject(window, "/project/a");

      expect(windowManager.findWindowForProject("/project/a/")).toBe(window);
    });

    it("normalises `..` segments", () => {
      const window = createMockBrowserWindow();
      windowManager.registerProjectWindow(window);
      windowManager.setProject(window, "/project/a");

      expect(windowManager.findWindowForProject("/project/b/../a")).toBe(window);
    });
  });

  describe("sender resolution", () => {
    it("resolves the project window for a project-window sender", () => {
      const window = createMockBrowserWindow();
      windowManager.registerProjectWindow(window);
      mockFromWebContents.mockReturnValue(window);

      expect(
        windowManager.getProjectWindowForSender(window.webContents as Electron.WebContents),
      ).toBe(window);
    });

    it("resolves the parent project window for an edit-window sender", () => {
      const projectWindow = createMockBrowserWindow();
      const editWindow = createMockBrowserWindow();
      windowManager.registerProjectWindow(projectWindow);
      windowManager.addEditWindow(editWindow, projectWindow);
      mockFromWebContents.mockReturnValue(editWindow);

      expect(
        windowManager.getProjectWindowForSender(editWindow.webContents as Electron.WebContents),
      ).toBe(projectWindow);
    });

    it("returns null when the sender window is unknown", () => {
      mockFromWebContents.mockReturnValue(null);

      expect(windowManager.getProjectWindowForSender({} as Electron.WebContents)).toBeNull();
    });

    it("getDirectoryForSender returns the directory for a project-window sender", () => {
      const window = createMockBrowserWindow();
      windowManager.registerProjectWindow(window);
      windowManager.setProject(window, "/my/project");
      mockFromWebContents.mockReturnValue(window);

      expect(windowManager.getDirectoryForSender(window.webContents as Electron.WebContents)).toBe(
        "/my/project",
      );
    });

    it("getDirectoryForSender returns the parent's directory for an edit-window sender", () => {
      const projectWindow = createMockBrowserWindow();
      const editWindow = createMockBrowserWindow();
      windowManager.registerProjectWindow(projectWindow);
      windowManager.setProject(projectWindow, "/my/project");
      windowManager.addEditWindow(editWindow, projectWindow);
      mockFromWebContents.mockReturnValue(editWindow);

      expect(
        windowManager.getDirectoryForSender(editWindow.webContents as Electron.WebContents),
      ).toBe("/my/project");
    });
  });

  describe("edit windows", () => {
    it("tracks the parent of an edit window", () => {
      const projectWindow = createMockBrowserWindow();
      const editWindow = createMockBrowserWindow();
      windowManager.registerProjectWindow(projectWindow);
      windowManager.addEditWindow(editWindow, projectWindow);

      expect(windowManager.getParentProjectWindow(editWindow)).toBe(projectWindow);
    });

    it("returns null parent for an unknown edit window", () => {
      const editWindow = createMockBrowserWindow();

      expect(windowManager.getParentProjectWindow(editWindow)).toBeNull();
    });

    it("getEditWindowsForProject returns only that project's edit windows", () => {
      const projectA = createMockBrowserWindow();
      const projectB = createMockBrowserWindow();
      const editA1 = createMockBrowserWindow();
      const editA2 = createMockBrowserWindow();
      const editB1 = createMockBrowserWindow();

      windowManager.registerProjectWindow(projectA);
      windowManager.registerProjectWindow(projectB);
      windowManager.addEditWindow(editA1, projectA);
      windowManager.addEditWindow(editA2, projectA);
      windowManager.addEditWindow(editB1, projectB);

      expect(windowManager.getEditWindowsForProject(projectA)).toStrictEqual([editA1, editA2]);
      expect(windowManager.getEditWindowsForProject(projectB)).toStrictEqual([editB1]);
    });

    it("closes only the edit windows belonging to the given project", () => {
      const projectA = createMockBrowserWindow();
      const projectB = createMockBrowserWindow();
      const editA = createMockBrowserWindow();
      const editB = createMockBrowserWindow();

      windowManager.registerProjectWindow(projectA);
      windowManager.registerProjectWindow(projectB);
      windowManager.addEditWindow(editA, projectA);
      windowManager.addEditWindow(editB, projectB);

      windowManager.closeEditWindowsForProject(projectA);

      expect(editA.close).toHaveBeenCalledWith();
      expect(editB.close).not.toHaveBeenCalled();
    });

    it("skips destroyed edit windows when closing", () => {
      const projectWindow = createMockBrowserWindow();
      const activeEdit = createMockBrowserWindow();
      const destroyedEdit = createMockBrowserWindow({ isDestroyed: true });

      windowManager.registerProjectWindow(projectWindow);
      windowManager.addEditWindow(activeEdit, projectWindow);
      windowManager.addEditWindow(destroyedEdit, projectWindow);

      windowManager.closeEditWindowsForProject(projectWindow);

      expect(activeEdit.close).toHaveBeenCalledWith();
      expect(destroyedEdit.close).not.toHaveBeenCalled();
    });

    it("skips non-closable edit windows when closing", () => {
      const projectWindow = createMockBrowserWindow();
      const closableEdit = createMockBrowserWindow({ closable: true });
      const nonClosableEdit = createMockBrowserWindow({ closable: false });

      windowManager.registerProjectWindow(projectWindow);
      windowManager.addEditWindow(closableEdit, projectWindow);
      windowManager.addEditWindow(nonClosableEdit, projectWindow);

      windowManager.closeEditWindowsForProject(projectWindow);

      expect(closableEdit.close).toHaveBeenCalledWith();
      expect(nonClosableEdit.close).not.toHaveBeenCalled();
    });

    it("removes edit window from registry when its closed event fires", () => {
      const projectWindow = createMockBrowserWindow();
      const editWindow = createMockBrowserWindow();
      windowManager.registerProjectWindow(projectWindow);
      windowManager.addEditWindow(editWindow, projectWindow);

      editWindow.triggerClosed();

      expect(windowManager.getEditWindowsForProject(projectWindow)).toStrictEqual([]);
    });

    it("closing a project window cascades to its edit windows", () => {
      const projectWindow = createMockBrowserWindow();
      const editWindow = createMockBrowserWindow();
      windowManager.registerProjectWindow(projectWindow);
      windowManager.addEditWindow(editWindow, projectWindow);

      projectWindow.triggerClosed();

      expect(editWindow.close).toHaveBeenCalledWith();
    });

    it("closing one project window leaves other projects' edit windows alone", () => {
      const projectA = createMockBrowserWindow();
      const projectB = createMockBrowserWindow();
      const editA = createMockBrowserWindow();
      const editB = createMockBrowserWindow();

      windowManager.registerProjectWindow(projectA);
      windowManager.registerProjectWindow(projectB);
      windowManager.addEditWindow(editA, projectA);
      windowManager.addEditWindow(editB, projectB);

      projectA.triggerClosed();

      expect(editA.close).toHaveBeenCalledWith();
      expect(editB.close).not.toHaveBeenCalled();
    });
  });
});
