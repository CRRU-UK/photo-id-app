import type { BrowserWindow, IpcMainInvokeEvent } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PhotoBody } from "@/types";

vi.mock("electron", () => ({}));

const mockCreatePhotoThumbnail = vi.fn<(directory: string, data: PhotoBody) => Promise<string>>();
const mockRevertPhotoToOriginal =
  vi.fn<(directory: string, data: PhotoBody) => Promise<PhotoBody>>();

vi.mock("@/backend/photos", () => ({
  createPhotoThumbnail: (...args: Parameters<typeof mockCreatePhotoThumbnail>) =>
    mockCreatePhotoThumbnail(...args),
  revertPhotoToOriginal: (...args: Parameters<typeof mockRevertPhotoToOriginal>) =>
    mockRevertPhotoToOriginal(...args),
}));

const mockHandleDuplicatePhotoFile = vi.fn<(data: PhotoBody) => Promise<PhotoBody>>();
const mockGetCurrentProjectDirectory = vi.fn<() => string | null>();

vi.mock("@/backend/projects", () => ({
  handleDuplicatePhotoFile: (...args: Parameters<typeof mockHandleDuplicatePhotoFile>) =>
    mockHandleDuplicatePhotoFile(...args),
  getCurrentProjectDirectory: () => mockGetCurrentProjectDirectory(),
}));

const mockGetMainWindow = vi.fn<() => BrowserWindow | null>();

vi.mock("@/backend/WindowManager", () => ({
  windowManager: {
    getMainWindow: () => mockGetMainWindow(),
  },
}));

const { handleSavePhotoFile, handleRevertPhotoFile, handleDuplicatePhotoFileInvoke } = await import(
  "./photoHandlers"
);

const mockEvent = {} as IpcMainInvokeEvent;

const createMockWindow = (): BrowserWindow =>
  ({
    webContents: { send: vi.fn<(channel: string, ...args: unknown[]) => void>() },
  }) as unknown as BrowserWindow;

const createMockPhotoBody = (overrides: Partial<PhotoBody> = {}): PhotoBody =>
  ({
    name: "photo.jpg",
    thumbnail: null,
    edits: null,
    isEdited: false,
    ...overrides,
  }) as PhotoBody;

describe("photo IPC handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentProjectDirectory.mockReturnValue("/project");
  });

  describe(handleSavePhotoFile, () => {
    it("generates a thumbnail and broadcasts the updated photo to the main window", async () => {
      const photo = createMockPhotoBody();
      const mockWindow = createMockWindow();
      mockCreatePhotoThumbnail.mockResolvedValue("thumbnail.jpg");
      mockGetMainWindow.mockReturnValue(mockWindow);

      await handleSavePhotoFile(mockEvent, photo);

      expect(mockCreatePhotoThumbnail).toHaveBeenCalledWith("/project", photo);
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        "photos:updatePhoto",
        expect.objectContaining({ thumbnail: "thumbnail.jpg" }),
      );
    });

    it("does not broadcast when there is no main window", async () => {
      const photo = createMockPhotoBody();
      mockCreatePhotoThumbnail.mockResolvedValue("thumbnail.jpg");
      mockGetMainWindow.mockReturnValue(null);

      await handleSavePhotoFile(mockEvent, photo);

      expect(mockCreatePhotoThumbnail).toHaveBeenCalledWith("/project", photo);
    });

    it("throws when no project is open", async () => {
      mockGetCurrentProjectDirectory.mockReturnValue(null);

      await expect(handleSavePhotoFile(mockEvent, createMockPhotoBody())).rejects.toThrow(
        "No project open",
      );
    });
  });

  describe(handleRevertPhotoFile, () => {
    it("reverts the photo and returns the result", async () => {
      const photo = createMockPhotoBody({ isEdited: true });
      const revertedPhoto = createMockPhotoBody({ isEdited: false });
      mockRevertPhotoToOriginal.mockResolvedValue(revertedPhoto);

      const result = await handleRevertPhotoFile(mockEvent, photo);

      expect(mockRevertPhotoToOriginal).toHaveBeenCalledWith("/project", photo);
      expect(result).toBe(revertedPhoto);
    });

    it("throws when no project is open", async () => {
      mockGetCurrentProjectDirectory.mockReturnValue(null);

      await expect(handleRevertPhotoFile(mockEvent, createMockPhotoBody())).rejects.toThrow(
        "No project open",
      );
    });
  });

  describe(handleDuplicatePhotoFileInvoke, () => {
    it("duplicates the photo and returns the result", async () => {
      const photo = createMockPhotoBody();
      const duplicatedPhoto = createMockPhotoBody({ name: "photo_copy.jpg" });
      mockHandleDuplicatePhotoFile.mockResolvedValue(duplicatedPhoto);

      const result = await handleDuplicatePhotoFileInvoke(mockEvent, photo);

      expect(mockHandleDuplicatePhotoFile).toHaveBeenCalledWith(photo);
      expect(result).toBe(duplicatedPhoto);
    });
  });
});
