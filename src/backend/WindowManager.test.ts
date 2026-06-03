import type { BrowserWindow } from "electron";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type EventHandler = (...args: unknown[]) => void;

interface MockWindow extends BrowserWindow {
  triggerClose: () => { defaultPrevented: boolean };
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

  const onceHandlers: Record<string, EventHandler[]> = {};

  return {
    id,
    webContents,
    on: vi.fn<(event: string, handler: EventHandler) => void>((event, handler) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    }),
    once: vi.fn<(event: string, handler: EventHandler) => void>((event, handler) => {
      if (!onceHandlers[event]) {
        onceHandlers[event] = [];
      }
      onceHandlers[event].push(handler);
    }),
    off: vi.fn<(event: string, handler: EventHandler) => void>((event, handler) => {
      const list = onceHandlers[event] ?? [];
      const index = list.indexOf(handler);
      if (index >= 0) {
        list.splice(index, 1);
      }
    }),
    isDestroyed: vi.fn<() => boolean>(() => overrides?.isDestroyed ?? false),
    closable: overrides?.closable ?? true,
    close: vi.fn<() => void>(),
    triggerClosed() {
      for (const handler of eventHandlers.closed ?? []) {
        handler();
      }
      for (const handler of onceHandlers.closed ?? []) {
        handler();
      }
      onceHandlers.closed = [];
    },
    triggerClose(): { defaultPrevented: boolean } {
      let defaultPrevented = false;
      const event = {
        preventDefault: () => {
          defaultPrevented = true;
        },
      };
      for (const handler of eventHandlers.close ?? []) {
        handler(event);
      }
      return { defaultPrevented };
    },
  } as unknown as MockWindow;
};

const mockFromWebContents = vi.fn<(webContents: Electron.WebContents) => BrowserWindow | null>();

const appEventHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};

const triggerAppEvent = (event: string): void => {
  for (const handler of appEventHandlers[event] ?? []) {
    handler();
  }
};

vi.mock("electron", () => ({
  app: {
    on: (event: string, handler: (...args: unknown[]) => void) => {
      if (!appEventHandlers[event]) {
        appEventHandlers[event] = [];
      }
      appEventHandlers[event].push(handler);
    },
  },
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
    for (const key of Object.keys(appEventHandlers)) {
      delete appEventHandlers[key];
    }
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

    it("normalises case on Windows so the same project isn't opened twice", () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "win32" });

      try {
        const window = createMockBrowserWindow();
        windowManager.registerProjectWindow(window);
        windowManager.setProject(window, "C:\\Users\\foo\\Whales");

        expect(windowManager.findWindowForProject("c:\\users\\foo\\whales")).toBe(window);
      } finally {
        Object.defineProperty(process, "platform", { value: originalPlatform });
      }
    });

    it("preserves case sensitivity on POSIX (Whales and whales are different projects)", () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "linux" });

      try {
        const window = createMockBrowserWindow();
        windowManager.registerProjectWindow(window);
        windowManager.setProject(window, "/users/foo/Whales");

        expect(windowManager.findWindowForProject("/users/foo/whales")).toBeNull();
      } finally {
        Object.defineProperty(process, "platform", { value: originalPlatform });
      }
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

  describe("parent close defers to edit-window unsaved-edits prompts", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("does not prevent default when the project window has no edit windows", () => {
      const projectWindow = createMockBrowserWindow();
      windowManager.registerProjectWindow(projectWindow);

      const result = projectWindow.triggerClose();

      expect(result.defaultPrevented).toBe(false);
      expect(projectWindow.close).not.toHaveBeenCalled();
    });

    it("prevents default and closes edit windows first, then closes the parent", async () => {
      const projectWindow = createMockBrowserWindow();
      const editWindow = createMockBrowserWindow();
      windowManager.registerProjectWindow(projectWindow);
      windowManager.addEditWindow(editWindow, projectWindow);

      const result = projectWindow.triggerClose();
      expect(result.defaultPrevented).toBe(true);
      expect(editWindow.close).toHaveBeenCalledWith();

      // Simulate edit window completing close
      editWindow.triggerClosed();
      // flush microtasks so the await resolves
      await vi.advanceTimersByTimeAsync(0);

      // Parent close should now be re-attempted by the orchestrator
      expect(projectWindow.close).toHaveBeenCalledWith();
    });

    it("leaves the parent open when an edit window's close is cancelled (no closed event within timeout)", async () => {
      const projectWindow = createMockBrowserWindow();
      const editWindow = createMockBrowserWindow();
      windowManager.registerProjectWindow(projectWindow);
      windowManager.addEditWindow(editWindow, projectWindow);

      const result = projectWindow.triggerClose();
      expect(result.defaultPrevented).toBe(true);
      expect(editWindow.close).toHaveBeenCalledWith();

      // Edit window does NOT fire closed — user cancelled the unsaved-edits prompt.
      // Advance past the cancellation-detection timeout.
      await vi.advanceTimersByTimeAsync(300);

      // Parent close should NOT have been re-attempted
      expect(projectWindow.close).not.toHaveBeenCalled();
    });

    it("does not preventDefault during app quit so the natural close cascade can run", () => {
      const projectWindow = createMockBrowserWindow();
      const editWindow = createMockBrowserWindow();
      windowManager.registerProjectWindow(projectWindow);
      windowManager.addEditWindow(editWindow, projectWindow);

      triggerAppEvent("before-quit");

      const result = projectWindow.triggerClose();

      expect(result.defaultPrevented).toBe(false);
      // Edit windows are closed naturally by Electron's quit cascade, not by our deferred logic
      expect(editWindow.close).not.toHaveBeenCalled();
    });
  });
});
