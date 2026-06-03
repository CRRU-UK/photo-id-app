import type { BrowserWindow } from "electron";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IPC_EVENTS, PROGRESS_ERROR_FLASH_MS } from "@/constants";

vi.mock("electron", () => ({}));

type EventHandler = (...args: unknown[]) => void;

interface MockBrowserWindowOverrides {
  isDestroyed?: boolean;
  isFocused?: boolean;
  platform?: NodeJS.Platform;
}

const createMockBrowserWindow = (overrides: MockBrowserWindowOverrides = {}) => {
  const eventHandlers: Record<string, EventHandler[]> = {};

  const window = {
    webContents: {
      send: vi.fn<(channel: string, payload: unknown) => void>(),
    },
    setProgressBar:
      vi.fn<
        (
          progress: number,
          options?: { mode: "none" | "normal" | "indeterminate" | "error" | "paused" },
        ) => void
      >(),
    flashFrame: vi.fn<(flag: boolean) => void>(),
    setRepresentedFilename: vi.fn<(filename: string) => void>(),
    setDocumentEdited: vi.fn<(edited: boolean) => void>(),
    isFocused: vi.fn<() => boolean>(() => overrides.isFocused ?? false),
    isDestroyed: vi.fn<() => boolean>(() => overrides.isDestroyed ?? false),
    on: vi.fn<(event: string, handler: EventHandler) => void>((event, handler) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = [];
      }
      eventHandlers[event].push(handler);
    }),
    trigger(event: string, ...args: unknown[]) {
      for (const handler of eventHandlers[event] ?? []) {
        handler(...args);
      }
    },
  };

  return window as unknown as BrowserWindow & typeof window;
};

const originalPlatform = process.platform;
const setPlatform = (platform: NodeJS.Platform) => {
  Object.defineProperty(process, "platform", { value: platform, configurable: true });
};

afterEach(() => {
  setPlatform(originalPlatform);
});

const importModule = async () => await import("./shellIntegration");

describe("sendLoading", () => {
  it("forwards the payload to the renderer via IPC", async () => {
    const { sendLoading } = await importModule();
    const window = createMockBrowserWindow();
    const data = { show: true, text: "Working", progressValue: 25 };

    sendLoading(window, data);

    expect(window.webContents.send).toHaveBeenCalledWith(IPC_EVENTS.SET_LOADING, data);
  });

  it("clears the progress bar when show is false", async () => {
    const { sendLoading } = await importModule();
    const window = createMockBrowserWindow();

    sendLoading(window, { show: false });

    expect(window.setProgressBar).toHaveBeenCalledWith(-1);
  });

  it("uses the indeterminate value when show is true with no progressValue", async () => {
    const { sendLoading } = await importModule();
    const window = createMockBrowserWindow();

    sendLoading(window, { show: true, text: "Working" });

    expect(window.setProgressBar).toHaveBeenCalledWith(2);
  });

  it("uses the indeterminate value when progressValue is null", async () => {
    const { sendLoading } = await importModule();
    const window = createMockBrowserWindow();

    sendLoading(window, { show: true, progressValue: null });

    expect(window.setProgressBar).toHaveBeenCalledWith(2);
  });

  it("translates progressValue 0-100 to a 0-1 fraction", async () => {
    const { sendLoading } = await importModule();
    const window = createMockBrowserWindow();

    sendLoading(window, { show: true, progressValue: 42 });

    expect(window.setProgressBar).toHaveBeenCalledWith(0.42);
  });

  it("clamps progress fractions to [0, 1]", async () => {
    const { sendLoading } = await importModule();
    const window = createMockBrowserWindow();

    sendLoading(window, { show: true, progressValue: 150 });
    expect(window.setProgressBar).toHaveBeenLastCalledWith(1);

    sendLoading(window, { show: true, progressValue: -20 });
    expect(window.setProgressBar).toHaveBeenLastCalledWith(0);
  });
});

describe("showProgressError", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("puts the progress bar into the error mode then clears it", async () => {
    const { showProgressError } = await importModule();
    const window = createMockBrowserWindow();

    showProgressError(window);

    expect(window.setProgressBar).toHaveBeenNthCalledWith(1, 1, { mode: "error" });

    vi.advanceTimersByTime(PROGRESS_ERROR_FLASH_MS);

    expect(window.setProgressBar).toHaveBeenNthCalledWith(2, -1);
  });

  it("does not clear when the window has been destroyed", async () => {
    const { showProgressError } = await importModule();
    const window = createMockBrowserWindow({ isDestroyed: true });

    showProgressError(window);
    vi.advanceTimersByTime(PROGRESS_ERROR_FLASH_MS);

    expect(window.setProgressBar).toHaveBeenCalledTimes(1);
  });
});

describe("flashWindow", () => {
  it("flashes the frame when the window is unfocused", async () => {
    const { flashWindow } = await importModule();
    const window = createMockBrowserWindow({ isFocused: false });

    flashWindow(window);

    expect(window.flashFrame).toHaveBeenCalledWith(true);
  });

  it("is a no-op when the window is focused", async () => {
    const { flashWindow } = await importModule();
    const window = createMockBrowserWindow({ isFocused: true });

    flashWindow(window);

    expect(window.flashFrame).not.toHaveBeenCalled();
  });
});

describe("setupShellIntegration", () => {
  it("clears any active flash when the window regains focus", async () => {
    const { setupShellIntegration } = await importModule();
    const window = createMockBrowserWindow();

    setupShellIntegration(window);
    window.trigger("focus");

    expect(window.flashFrame).toHaveBeenCalledWith(false);
  });
});

describe("setRepresentedProject", () => {
  it("sets the represented filename on macOS", async () => {
    setPlatform("darwin");
    const { setRepresentedProject } = await importModule();
    const window = createMockBrowserWindow();

    setRepresentedProject(window, "/path/to/project.photoid");

    expect(window.setRepresentedFilename).toHaveBeenCalledWith("/path/to/project.photoid");
    expect(window.setDocumentEdited).toHaveBeenCalledWith(false);
  });

  it("clears the represented filename with an empty string on macOS", async () => {
    setPlatform("darwin");
    const { setRepresentedProject } = await importModule();
    const window = createMockBrowserWindow();

    setRepresentedProject(window, null);

    expect(window.setRepresentedFilename).toHaveBeenCalledWith("");
  });

  it("is a no-op on non-darwin platforms", async () => {
    setPlatform("win32");
    const { setRepresentedProject } = await importModule();
    const window = createMockBrowserWindow();

    setRepresentedProject(window, "/path/to/project.photoid");

    expect(window.setRepresentedFilename).not.toHaveBeenCalled();
    expect(window.setDocumentEdited).not.toHaveBeenCalled();
  });
});
