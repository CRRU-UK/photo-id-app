import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PhotoBody, PhotoEdits } from "@/types";

import { DEFAULT_PHOTO_EDITS, PROJECT_THUMBNAIL_DIRECTORY } from "@/constants";

const mockWriteFile = vi.fn<(path: string, data: Buffer) => Promise<void>>();

vi.mock("node:fs", () => ({
  default: {
    promises: {
      writeFile: (...args: Parameters<typeof mockWriteFile>) => mockWriteFile(...args),
    },
  },
}));

const mockRenderThumbnailWithEdits =
  vi.fn<(options: { sourcePath: string; edits: PhotoEdits }) => Promise<Buffer>>();

vi.mock("@/backend/imageRenderer", () => ({
  renderThumbnailWithEdits: (...args: Parameters<typeof mockRenderThumbnailWithEdits>) =>
    mockRenderThumbnailWithEdits(...args),
}));

const { createPhotoThumbnail, revertPhotoToOriginal } = await import("./photos");

const createPhoto = (overrides?: Partial<PhotoBody>): PhotoBody => ({
  directory: "/project",
  name: "photo.jpg",
  thumbnail: `${PROJECT_THUMBNAIL_DIRECTORY}/photo.jpg`,
  edits: { ...DEFAULT_PHOTO_EDITS, brightness: 150 },
  isEdited: true,
  ...overrides,
});

describe(createPhotoThumbnail, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderThumbnailWithEdits.mockResolvedValue(Buffer.from("thumbnail-data"));
    mockWriteFile.mockResolvedValue(undefined);
  });

  it("calls renderThumbnailWithEdits with the correct source path and edits", async () => {
    const photo = createPhoto({ directory: "/my/project", name: "image.jpg" });

    await createPhotoThumbnail(photo);

    expect(mockRenderThumbnailWithEdits).toHaveBeenCalledWith({
      sourcePath: "/my/project/image.jpg",
      edits: photo.edits,
    });
  });

  it("writes the thumbnail data to the correct path", async () => {
    const photo = createPhoto({ directory: "/project", name: "photo.jpg" });

    await createPhotoThumbnail(photo);

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining(`${PROJECT_THUMBNAIL_DIRECTORY}/photo.jpg`),
      Buffer.from("thumbnail-data"),
    );
  });

  it("returns the relative thumbnail path", async () => {
    const photo = createPhoto({ name: "test-image.png" });

    const result = await createPhotoThumbnail(photo);

    expect(result).toBe(`${PROJECT_THUMBNAIL_DIRECTORY}/test-image.png`);
  });

  it("uses the photo name as the thumbnail filename", async () => {
    const photo = createPhoto({ name: "DSC_0001.JPG" });

    const result = await createPhotoThumbnail(photo);

    expect(result).toBe(`${PROJECT_THUMBNAIL_DIRECTORY}/DSC_0001.JPG`);
  });
});

describe(revertPhotoToOriginal, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderThumbnailWithEdits.mockResolvedValue(Buffer.from("reverted-thumbnail"));
    mockWriteFile.mockResolvedValue(undefined);
  });

  it("returns photo with default edits", async () => {
    const photo = createPhoto({
      edits: { ...DEFAULT_PHOTO_EDITS, brightness: 200, contrast: 50 },
      isEdited: true,
    });

    const result = await revertPhotoToOriginal(photo);

    expect(result.edits).toStrictEqual(DEFAULT_PHOTO_EDITS);
  });

  it("returns photo with isEdited set to false", async () => {
    const photo = createPhoto({ isEdited: true });

    const result = await revertPhotoToOriginal(photo);

    expect(result.isEdited).toBe(false);
  });

  it("preserves the photo directory and name", async () => {
    const photo = createPhoto({ directory: "/my/dir", name: "my-photo.jpg" });

    const result = await revertPhotoToOriginal(photo);

    expect(result.directory).toBe("/my/dir");
    expect(result.name).toBe("my-photo.jpg");
  });

  it("creates a new thumbnail with default edits", async () => {
    const photo = createPhoto({
      edits: { ...DEFAULT_PHOTO_EDITS, brightness: 200 },
    });

    await revertPhotoToOriginal(photo);

    expect(mockRenderThumbnailWithEdits).toHaveBeenCalledWith(
      expect.objectContaining({
        edits: DEFAULT_PHOTO_EDITS,
      }),
    );
  });

  it("returns the new thumbnail path", async () => {
    const photo = createPhoto({ name: "reverted.jpg" });

    const result = await revertPhotoToOriginal(photo);

    expect(result.thumbnail).toBe(`${PROJECT_THUMBNAIL_DIRECTORY}/reverted.jpg`);
  });
});
