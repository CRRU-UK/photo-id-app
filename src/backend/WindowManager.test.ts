/* eslint-disable @typescript-eslint/unbound-method */
import type { BrowserWindow } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * WindowManager is a singleton, so we re-import it fresh for each test via dynamic import
 * to avoid shared state between tests.
 */

type EventHandler = () => void;

const createMockBrowserWindow = (
  overrides?: Partial<{ isDestroyed: boolean; closable: boolean }>,
): BrowserWindow & { triggerClosed: () => void } => {
  const eventHandlers: Record<string, EventHandler[]> = {};

  return {
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
      for (const handler of eventHandlers["closed"] ?? []) {
        handler();
      }
    },
  } as unknown as BrowserWindow & { triggerClosed: () => void };
};

describe("windowManager", () => {
  let windowManager: typeof import("./WindowManager").windowManager;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("./WindowManager");
    windowManager = mod.windowManager;
  });

  describe("main window", () => {
    it("returns null when no main window is set", () => {
      expect(windowManager.getMainWindow()).toBeNull();
    });

    it("returns the main window after setting it", () => {
      const mainWindow = createMockBrowserWindow();
      windowManager.setMainWindow(mainWindow);

      expect(windowManager.getMainWindow()).toBe(mainWindow);
    });

    it("returns null after the main window is closed", () => {
      const mainWindow = createMockBrowserWindow();
      windowManager.setMainWindow(mainWindow);

      mainWindow.triggerClosed();

      expect(windowManager.getMainWindow()).toBeNull();
    });

    it("returns null when the main window is destroyed", () => {
      const mainWindow = createMockBrowserWindow({ isDestroyed: true });
      windowManager.setMainWindow(mainWindow);

      expect(windowManager.getMainWindow()).toBeNull();
    });

    it("registers a closed event listener on the main window", () => {
      const mainWindow = createMockBrowserWindow();
      windowManager.setMainWindow(mainWindow);

      expect(mainWindow.on).toHaveBeenCalledWith("closed", expect.any(Function));
    });
  });

  describe("edit windows", () => {
    it("closes all edit windows", () => {
      const editWindow1 = createMockBrowserWindow();
      const editWindow2 = createMockBrowserWindow();

      windowManager.addEditWindow(editWindow1);
      windowManager.addEditWindow(editWindow2);

      windowManager.closeAllEditWindows();

      expect(editWindow1.close).toHaveBeenCalledWith();
      expect(editWindow2.close).toHaveBeenCalledWith();
    });

    it("skips destroyed windows when closing all", () => {
      const activeWindow = createMockBrowserWindow();
      const destroyedWindow = createMockBrowserWindow({ isDestroyed: true });

      windowManager.addEditWindow(activeWindow);
      windowManager.addEditWindow(destroyedWindow);

      windowManager.closeAllEditWindows();

      expect(activeWindow.close).toHaveBeenCalledWith();
      expect(destroyedWindow.close).not.toHaveBeenCalled();
    });

    it("skips non-closable windows when closing all", () => {
      const closableWindow = createMockBrowserWindow({ closable: true });
      const nonClosableWindow = createMockBrowserWindow({ closable: false });

      windowManager.addEditWindow(closableWindow);
      windowManager.addEditWindow(nonClosableWindow);

      windowManager.closeAllEditWindows();

      expect(closableWindow.close).toHaveBeenCalledWith();
      expect(nonClosableWindow.close).not.toHaveBeenCalled();
    });

    it("registers a closed event listener on edit windows", () => {
      const editWindow = createMockBrowserWindow();
      windowManager.addEditWindow(editWindow);

      expect(editWindow.on).toHaveBeenCalledWith("closed", expect.any(Function));
    });

    it("removes edit window from set when closed event fires", () => {
      const editWindow = createMockBrowserWindow();
      windowManager.addEditWindow(editWindow);

      editWindow.triggerClosed();

      // Closing all should not call close on the already-closed window
      windowManager.closeAllEditWindows();

      expect(editWindow.close).not.toHaveBeenCalledWith(undefined);
    });

    it("handles closeAllEditWindows when no edit windows exist", () => {
      expect(() => windowManager.closeAllEditWindows()).not.toThrowError();
    });
  });
});
