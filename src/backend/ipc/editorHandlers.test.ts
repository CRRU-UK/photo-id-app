import type { IpcMainEvent, IpcMainInvokeEvent } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EditorNavigation, PhotoBody } from "@/types";

const mockBrowserWindowConstructor = vi.fn<(options: Record<string, unknown>) => void>();
const mockLoadURL = vi.fn<(url: string) => Promise<void>>();
const mockRemoveMenu = vi.fn<() => void>();
const mockOpenDevTools = vi.fn<() => void>();
const mockShow = vi.fn<() => void>();
const mockOnce = vi.fn<(event: string, callback: () => void) => void>();
const mockWebContentsSend = vi.fn<(channel: string, ...args: unknown[]) => void>();

const mockWebContentsOn = vi.fn<(event: string, callback: (...args: unknown[]) => void) => void>();
const mockShowMessageBoxSync = vi.fn<() => number>(() => 0);

vi.mock("electron", () => ({
  BrowserWindow: class MockBrowserWindow {
    webContents = {
      openDevTools: mockOpenDevTools,
      send: mockWebContentsSend,
      on: mockWebContentsOn,
    };

    constructor(options: Record<string, unknown>) {
      mockBrowserWindowConstructor(options);
    }

    removeMenu = mockRemoveMenu;
    loadURL = mockLoadURL;
    show = mockShow;
    once = mockOnce;
  },
  dialog: {
    showMessageBoxSync: mockShowMessageBoxSync,
  },
}));

const mockAddEditWindow = vi.fn<(window: unknown) => void>();

vi.mock("@/backend/WindowManager", () => ({
  windowManager: {
    addEditWindow: (window: unknown) => mockAddEditWindow(window),
  },
}));

const mockHandleEditorNavigate =
  vi.fn<(data: PhotoBody, direction: EditorNavigation) => Promise<PhotoBody | null>>();

vi.mock("@/backend/projects", () => ({
  handleEditorNavigate: (data: PhotoBody, direction: EditorNavigation) =>
    mockHandleEditorNavigate(data, direction),
}));

vi.mock("@/helpers", () => ({
  encodeEditPayload: vi.fn<(data: PhotoBody) => string>(
    (data: PhotoBody) => `encoded:${JSON.stringify(data)}`,
  ),
}));

// Stub the Vite global
vi.stubGlobal("MAIN_WINDOW_VITE_DEV_SERVER_URL", "");
vi.stubGlobal("MAIN_WINDOW_VITE_NAME", "main_window");

const { handleOpenEditWindow, handleNavigateEditorPhoto } = await import("./editorHandlers");

const createMockPhotoBody = (overrides: Partial<PhotoBody> = {}): PhotoBody =>
  ({
    directory: "/photos",
    name: "photo.jpg",
    thumbnail: null,
    edits: null,
    isEdited: false,
    ...overrides,
  }) as PhotoBody;

describe("editor IPC handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe(handleOpenEditWindow, () => {
    const config = {
      production: true,
      defaultWebPreferences: { preload: "/preload.js" } as Electron.WebPreferences,
      basePath: "/path/to/index.html",
    };

    it("creates a new BrowserWindow with the correct options", () => {
      const handler = handleOpenEditWindow(config);
      const photo = createMockPhotoBody();

      handler({} as IpcMainEvent, photo);

      expect(mockBrowserWindowConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          show: false,
          width: 1200,
          height: 800,
          webPreferences: config.defaultWebPreferences,
          backgroundColor: "black",
          fullscreenable: false,
        }),
      );
    });

    it("removes the menu from the edit window", () => {
      const handler = handleOpenEditWindow(config);

      handler({} as IpcMainEvent, createMockPhotoBody());

      expect(mockRemoveMenu).toHaveBeenCalledWith();
    });

    it("registers the edit window with the window manager", () => {
      const handler = handleOpenEditWindow(config);

      handler({} as IpcMainEvent, createMockPhotoBody());

      expect(mockAddEditWindow).toHaveBeenCalledWith(expect.anything());
    });

    it("does not open dev tools in production", () => {
      const handler = handleOpenEditWindow({ ...config, production: true });

      handler({} as IpcMainEvent, createMockPhotoBody());

      expect(mockOpenDevTools).not.toHaveBeenCalledWith();
    });

    it("opens dev tools in development", () => {
      const handler = handleOpenEditWindow({ ...config, production: false });

      handler({} as IpcMainEvent, createMockPhotoBody());

      expect(mockOpenDevTools).toHaveBeenCalledWith();
    });

    it("loads the edit URL with encoded photo data", () => {
      const handler = handleOpenEditWindow(config);

      handler({} as IpcMainEvent, createMockPhotoBody());

      expect(mockLoadURL).toHaveBeenCalledWith(expect.stringContaining("/edit"));
    });

    it("registers a ready-to-show listener", () => {
      const handler = handleOpenEditWindow(config);

      handler({} as IpcMainEvent, createMockPhotoBody());

      expect(mockOnce).toHaveBeenCalledWith("ready-to-show", expect.any(Function));
    });

    describe("will-prevent-unload", () => {
      const getWillPreventUnloadCallback = () => {
        const handler = handleOpenEditWindow(config);
        handler({} as IpcMainEvent, createMockPhotoBody());

        const call = mockWebContentsOn.mock.calls.find(
          ([event]) => event === "will-prevent-unload",
        );

        return call![1] as (event: { preventDefault: () => void }) => void;
      };

      it("shows a confirmation dialog when renderer prevents unload", () => {
        const callback = getWillPreventUnloadCallback();

        callback({ preventDefault: vi.fn<() => void>() });

        expect(mockShowMessageBoxSync).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            type: "question",
            title: "Unsaved Changes",
          }),
        );
      });

      it("prevents default (discards changes) when user selects 'Discard Changes'", () => {
        mockShowMessageBoxSync.mockReturnValue(0);
        const callback = getWillPreventUnloadCallback();
        const preventDefault = vi.fn<() => void>();

        callback({ preventDefault });

        expect(preventDefault).toHaveBeenCalledWith();
      });

      it("does not prevent default (keeps window open) when user selects 'Cancel'", () => {
        mockShowMessageBoxSync.mockReturnValue(1);
        const callback = getWillPreventUnloadCallback();
        const preventDefault = vi.fn<() => void>();

        callback({ preventDefault });

        expect(preventDefault).not.toHaveBeenCalledWith();
      });
    });

    describe("will-navigate", () => {
      const getWillNavigateCallback = () => {
        const handler = handleOpenEditWindow(config);
        handler({} as IpcMainEvent, createMockPhotoBody());

        const call = mockWebContentsOn.mock.calls.find(([event]) => event === "will-navigate");

        return call![1] as (event: { preventDefault: () => void }, url: string) => void;
      };

      it("blocks navigation to external URLs", () => {
        const callback = getWillNavigateCallback();
        const preventDefault = vi.fn<() => void>();

        callback({ preventDefault }, "https://example.com");

        expect(preventDefault).toHaveBeenCalledWith();
      });

      it("allows navigation to file:// URLs", () => {
        const callback = getWillNavigateCallback();
        const preventDefault = vi.fn<() => void>();

        callback({ preventDefault }, "file:///path/to/index.html");

        expect(preventDefault).not.toHaveBeenCalledWith();
      });

      it("allows navigation to the dev server URL when set", () => {
        vi.stubGlobal("MAIN_WINDOW_VITE_DEV_SERVER_URL", "http://localhost:5173");

        const callback = getWillNavigateCallback();
        const preventDefault = vi.fn<() => void>();

        callback({ preventDefault }, "http://localhost:5173/edit?data=abc");

        expect(preventDefault).not.toHaveBeenCalledWith();

        vi.stubGlobal("MAIN_WINDOW_VITE_DEV_SERVER_URL", "");
      });
    });
  });

  describe(handleNavigateEditorPhoto, () => {
    it("returns the encoded payload for the next photo", async () => {
      const photo = createMockPhotoBody();
      const nextPhoto = createMockPhotoBody({ name: "next.jpg" });
      mockHandleEditorNavigate.mockResolvedValue(nextPhoto);

      const result = await handleNavigateEditorPhoto({} as IpcMainInvokeEvent, photo, "next");

      expect(result).toBe(`encoded:${JSON.stringify(nextPhoto)}`);
    });

    it("returns null when the photo is not found", async () => {
      const photo = createMockPhotoBody();
      mockHandleEditorNavigate.mockResolvedValue(null);

      const result = await handleNavigateEditorPhoto({} as IpcMainInvokeEvent, photo, "prev");

      expect(result).toBeNull();
    });
  });
});
