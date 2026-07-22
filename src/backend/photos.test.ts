import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PHOTO_EDITS, PROJECT_THUMBNAIL_DIRECTORY } from "@/constants";
import type { PhotoBody, PhotoEdits } from "@/types";

const mockWriteFile = vi.fn<(path: string, data: Buffer) => Promise<void>>();
const mockMkdir = vi.fn<(path: string, options?: unknown) => Promise<void>>();
const mockExistsSync = vi.fn<(path: string) => boolean>();

vi.mock("node:fs", () => ({
  default: {
    promises: {
      writeFile: (...args: Parameters<typeof mockWriteFile>) => mockWriteFile(...args),
      mkdir: (...args: Parameters<typeof mockMkdir>) => mockMkdir(...args),
    },
    existsSync: (...args: Parameters<typeof mockExistsSync>) => mockExistsSync(...args),
  },
}));

const mockRenderThumbnailWithEdits =
  vi.fn<(options: { sourcePath: string; edits: PhotoEdits }) => Promise<Buffer>>();

vi.mock("@/backend/imageRenderer", () => ({
  renderThumbnailWithEdits: (...args: Parameters<typeof mockRenderThumbnailWithEdits>) =>
    mockRenderThumbnailWithEdits(...args),
}));

vi.mock("@/backend/projects", () => ({
  resolvePhotoPath: (directory: string, fileName: string) => `${directory}/${fileName}`,
}));

const { createPhotoThumbnail } = await import("./photos");

const createPhoto = (overrides?: Partial<PhotoBody>): PhotoBody => ({
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
    mockMkdir.mockResolvedValue(undefined);
    mockExistsSync.mockReturnValue(true);
  });

  it("calls renderThumbnailWithEdits with the correct source path and edits", async () => {
    const photo = createPhoto({ name: "image.jpg" });

    await createPhotoThumbnail("/my/project", photo);

    expect(mockRenderThumbnailWithEdits).toHaveBeenCalledWith({
      sourcePath: "/my/project/image.jpg",
      edits: photo.edits,
    });
  });

  it("writes the thumbnail data to the correct path", async () => {
    const photo = createPhoto({ name: "photo.jpg" });

    await createPhotoThumbnail("/project", photo);

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining(`${PROJECT_THUMBNAIL_DIRECTORY}/photo.jpg`),
      Buffer.from("thumbnail-data"),
    );
  });

  it("returns the relative thumbnail path with forward slashes", async () => {
    const photo = createPhoto({ name: "test-image.png" });

    const result = await createPhotoThumbnail("/project", photo);

    expect(result).toBe(`${PROJECT_THUMBNAIL_DIRECTORY}/test-image.png`);
  });

  it("uses the photo name as the thumbnail filename", async () => {
    const photo = createPhoto({ name: "DSC_0001.JPG" });

    const result = await createPhotoThumbnail("/project", photo);

    expect(result).toBe(`${PROJECT_THUMBNAIL_DIRECTORY}/DSC_0001.JPG`);
  });

  it("creates the thumbnails directory if it does not exist", async () => {
    mockExistsSync.mockReturnValue(false);
    const photo = createPhoto({ name: "photo.jpg" });

    await createPhotoThumbnail("/project", photo);

    expect(mockMkdir).toHaveBeenCalled();
  });
});
