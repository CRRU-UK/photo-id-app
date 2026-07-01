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

const mockHandleDuplicatePhotoFile =
  vi.fn<(directory: string, data: PhotoBody) => Promise<PhotoBody>>();

vi.mock("@/backend/projects", () => ({
  handleDuplicatePhotoFile: (...args: Parameters<typeof mockHandleDuplicatePhotoFile>) =>
    mockHandleDuplicatePhotoFile(...args),
}));

const mockGetDirectoryForSender = vi.fn<(webContents: Electron.WebContents) => string | null>();
const mockGetProjectWindowForSender =
  vi.fn<(webContents: Electron.WebContents) => BrowserWindow | null>();

vi.mock("@/backend/WindowManager", () => ({
  windowManager: {
    getDirectoryForSender: (...args: Parameters<typeof mockGetDirectoryForSender>) =>
      mockGetDirectoryForSender(...args),
    getProjectWindowForSender: (...args: Parameters<typeof mockGetProjectWindowForSender>) =>
      mockGetProjectWindowForSender(...args),
  },
}));

const { handleSavePhotoFile, handleRevertPhotoFile, handleDuplicatePhotoFileInvoke } = await import(
  "./photoHandlers"
);

const createMockWindow = (overrides?: Partial<{ isDestroyed: boolean }>): BrowserWindow =>
  ({
    isDestroyed: vi.fn<() => boolean>(() => overrides?.isDestroyed ?? false),
    webContents: { send: vi.fn<(channel: string, ...args: unknown[]) => void>() },
  }) as unknown as BrowserWindow;

const createMockEvent = (): IpcMainInvokeEvent => ({ sender: {} }) as unknown as IpcMainInvokeEvent;

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
    mockGetDirectoryForSender.mockReturnValue("/project");
  });

  describe(handleSavePhotoFile, () => {
    it("generates a thumbnail and notifies the parent project window", async () => {
      const photo = createMockPhotoBody();
      const projectWindow = createMockWindow();
      mockCreatePhotoThumbnail.mockResolvedValue("thumbnail.jpg");
      mockGetProjectWindowForSender.mockReturnValue(projectWindow);

      await handleSavePhotoFile(createMockEvent(), photo);

      expect(mockCreatePhotoThumbnail).toHaveBeenCalledWith("/project", photo);
      expect(projectWindow.webContents.send).toHaveBeenCalledWith(
        "photos:updatePhoto",
        expect.objectContaining({ thumbnail: "thumbnail.jpg" }),
      );
    });

    it("does not broadcast when no parent project window is found", async () => {
      const photo = createMockPhotoBody();
      mockCreatePhotoThumbnail.mockResolvedValue("thumbnail.jpg");
      mockGetProjectWindowForSender.mockReturnValue(null);

      await handleSavePhotoFile(createMockEvent(), photo);

      expect(mockCreatePhotoThumbnail).toHaveBeenCalledWith("/project", photo);
    });

    it("throws when no project is open for the sender", async () => {
      mockGetDirectoryForSender.mockReturnValue(null);

      await expect(handleSavePhotoFile(createMockEvent(), createMockPhotoBody())).rejects.toThrow(
        "No project open",
      );
    });
  });

  describe(handleRevertPhotoFile, () => {
    it("reverts the photo and returns the result", async () => {
      const photo = createMockPhotoBody({ isEdited: true });
      const revertedPhoto = createMockPhotoBody({ isEdited: false });
      mockRevertPhotoToOriginal.mockResolvedValue(revertedPhoto);

      const result = await handleRevertPhotoFile(createMockEvent(), photo);

      expect(mockRevertPhotoToOriginal).toHaveBeenCalledWith("/project", photo);
      expect(result).toBe(revertedPhoto);
    });

    it("throws when no project is open for the sender", async () => {
      mockGetDirectoryForSender.mockReturnValue(null);

      await expect(handleRevertPhotoFile(createMockEvent(), createMockPhotoBody())).rejects.toThrow(
        "No project open",
      );
    });
  });

  describe(handleDuplicatePhotoFileInvoke, () => {
    it("duplicates the photo using the sender's directory and returns the result", async () => {
      const photo = createMockPhotoBody();
      const duplicatedPhoto = createMockPhotoBody({ name: "photo_copy.jpg" });
      mockHandleDuplicatePhotoFile.mockResolvedValue(duplicatedPhoto);

      const result = await handleDuplicatePhotoFileInvoke(createMockEvent(), photo);

      expect(mockHandleDuplicatePhotoFile).toHaveBeenCalledWith("/project", photo);
      expect(result).toBe(duplicatedPhoto);
    });

    it("throws when no project is open for the sender", async () => {
      mockGetDirectoryForSender.mockReturnValue(null);

      await expect(
        handleDuplicatePhotoFileInvoke(createMockEvent(), createMockPhotoBody()),
      ).rejects.toThrow("No project open");
    });
  });
});
