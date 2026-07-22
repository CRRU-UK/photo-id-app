import type { BrowserWindow } from "electron";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { IPC_EVENTS, PROGRESS_ERROR_FLASH_MS } from "@/constants";

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    setJumpList: vi.fn<() => void>(),
  },
}));

vi.mock("@/backend/recents", () => ({
  getRecentProjects: vi.fn<() => Promise<unknown[]>>(async () => []),
}));

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

  it("is a no-op when the window is destroyed", async () => {
    const { sendLoading } = await importModule();
    const window = createMockBrowserWindow({ isDestroyed: true });

    sendLoading(window, { show: true, text: "Working" });

    expect(window.webContents.send).not.toHaveBeenCalled();
    expect(window.setProgressBar).not.toHaveBeenCalled();
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

  it("does not clear when the window is destroyed before the timer fires", async () => {
    const { showProgressError } = await importModule();
    const window = createMockBrowserWindow();

    showProgressError(window);
    expect(window.setProgressBar).toHaveBeenNthCalledWith(1, 1, { mode: "error" });

    // Window destroyed during the flash window, the deferred clear must be skipped
    (window.isDestroyed as ReturnType<typeof vi.fn>).mockReturnValue(true);
    vi.advanceTimersByTime(PROGRESS_ERROR_FLASH_MS);

    expect(window.setProgressBar).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when the window is already destroyed", async () => {
    const { showProgressError } = await importModule();
    const window = createMockBrowserWindow({ isDestroyed: true });

    showProgressError(window);
    vi.advanceTimersByTime(PROGRESS_ERROR_FLASH_MS);

    expect(window.webContents.send).not.toHaveBeenCalled();
    expect(window.setProgressBar).not.toHaveBeenCalled();
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

describe("applyWindowsJumpList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is a no-op on non-win32 platforms", async () => {
    setPlatform("darwin");
    const { applyWindowsJumpList } = await importModule();
    const { app } = await import("electron");

    await applyWindowsJumpList();

    expect(vi.mocked(app.setJumpList)).not.toHaveBeenCalled();
  });

  it("builds Tasks-only Jump List when there are no recents", async () => {
    setPlatform("win32");
    const recents = await import("@/backend/recents");
    vi.mocked(recents.getRecentProjects).mockResolvedValue([]);
    const { applyWindowsJumpList } = await importModule();
    const { app } = await import("electron");

    await applyWindowsJumpList();

    const categories = vi.mocked(app.setJumpList).mock.calls[0]?.[0];
    expect(categories).toHaveLength(1);
    expect(categories?.[0]).toMatchObject({ type: "tasks" });
  });

  it("includes a custom Recent Projects category populated with folder-name titles", async () => {
    setPlatform("win32");
    const recents = await import("@/backend/recents");
    vi.mocked(recents.getRecentProjects).mockResolvedValue([
      { name: "Survey 2026", path: "C:/projects/Survey 2026/project.photoid", lastOpened: "" },
      { name: "Survey 2025", path: "C:/projects/Survey 2025/project.photoid", lastOpened: "" },
    ]);
    const { applyWindowsJumpList } = await importModule();
    const { app } = await import("electron");

    await applyWindowsJumpList();

    const categories = vi.mocked(app.setJumpList).mock.calls[0]?.[0];
    expect(categories?.[0]).toMatchObject({
      type: "custom",
      name: "Recent Projects",
      items: [
        { type: "task", title: "Survey 2026" },
        { type: "task", title: "Survey 2025" },
      ],
    });
  });
});
