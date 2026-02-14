/* eslint-disable @typescript-eslint/unbound-method */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_PHOTO_EDITS } from "@/constants";
import type Project from "@/models/Project";
import type { PhotoBody, PhotoEdits } from "@/types";

import Photo from "./Photo";

const mockProject = {
  save: vi.fn<() => void>(),
} as unknown as Project;

const defaultEdits: PhotoEdits = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  zoom: 1,
  pan: { x: 0, y: 0 },
};

const createPhoto = (overrides?: Partial<{ name: string; edits: PhotoEdits }>): Photo =>
  new Photo(
    {
      directory: "/project",
      name: overrides?.name ?? "photo.jpg",
      thumbnail: ".thumbnails/photo.jpg",
      edits: overrides?.edits ?? { ...defaultEdits, pan: { ...defaultEdits.pan } },
    },
    mockProject,
  );

describe(Photo, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("initialises with provided values", () => {
      const photo = createPhoto();

      expect(photo.directory).toBe("/project");
      expect(photo.fileName).toBe("photo.jpg");
      expect(photo.thumbnail).toBe(".thumbnails/photo.jpg");
      expect(photo.version).toBe(1);
    });

    it("creates a deep copy of edits to avoid shared references", () => {
      const edits: PhotoEdits = {
        brightness: 120,
        contrast: 80,
        saturate: 150,
        zoom: 2,
        pan: { x: 10, y: 20 },
      };

      const photo = createPhoto({ edits });

      // Mutating original edits should not affect photo
      edits.pan.x = 999;

      expect(photo.edits.pan.x).toBe(10);
    });
  });

  describe("isEdited", () => {
    it("returns false when edits match defaults", () => {
      const photo = createPhoto({ edits: { ...DEFAULT_PHOTO_EDITS, pan: { x: 0, y: 0 } } });

      expect(photo.isEdited).toBe(false);
    });

    it("returns true when brightness differs from default", () => {
      const photo = createPhoto({
        edits: { ...defaultEdits, brightness: 120, pan: { x: 0, y: 0 } },
      });

      expect(photo.isEdited).toBe(true);
    });

    it("returns true when contrast differs from default", () => {
      const photo = createPhoto({
        edits: { ...defaultEdits, contrast: 80, pan: { x: 0, y: 0 } },
      });

      expect(photo.isEdited).toBe(true);
    });

    it("returns true when saturate differs from default", () => {
      const photo = createPhoto({
        edits: { ...defaultEdits, saturate: 150, pan: { x: 0, y: 0 } },
      });

      expect(photo.isEdited).toBe(true);
    });

    it("returns true when zoom differs from default", () => {
      const photo = createPhoto({
        edits: { ...defaultEdits, zoom: 2, pan: { x: 0, y: 0 } },
      });

      expect(photo.isEdited).toBe(true);
    });

    it("returns true when pan differs from default", () => {
      const photo = createPhoto({
        edits: { ...defaultEdits, pan: { x: 50, y: 30 } },
      });

      expect(photo.isEdited).toBe(true);
    });
  });

  describe("fileName", () => {
    it("returns the file name", () => {
      const photo = createPhoto({ name: "dolphin.png" });

      expect(photo.fileName).toBe("dolphin.png");
    });
  });

  describe("thumbnailFullPath", () => {
    it("builds a photo URL with version cache buster", () => {
      const photo = createPhoto();

      const result = photo.thumbnailFullPath;

      expect(result).toContain("photo://");
      expect(result).toContain(".thumbnails");
      expect(result).toMatch(/\?1$/);
    });

    it("increments version cache buster after update", () => {
      const photo = createPhoto();

      const bodyForUpdate: PhotoBody = {
        directory: "/project",
        name: "photo.jpg",
        thumbnail: ".thumbnails/photo_edited.jpg",
        edits: { ...defaultEdits, brightness: 120, pan: { x: 0, y: 0 } },
        isEdited: true,
      };

      photo.updatePhoto(bodyForUpdate);

      expect(photo.thumbnailFullPath).toMatch(/\?2$/);
    });
  });

  describe("toBody", () => {
    it("returns the correct shape", () => {
      const photo = createPhoto();
      const body = photo.toBody();

      expect(body).toStrictEqual({
        directory: "/project",
        name: "photo.jpg",
        thumbnail: ".thumbnails/photo.jpg",
        edits: {
          brightness: 100,
          contrast: 100,
          saturate: 100,
          zoom: 1,
          pan: { x: 0, y: 0 },
        },
        isEdited: false,
      });
    });

    it("returns deep copy of edits so mutations do not affect photo", () => {
      const photo = createPhoto();
      const body = photo.toBody();

      body.edits.pan.x = 999;

      expect(photo.edits.pan.x).toBe(0);
    });

    it("reflects edited state when edits differ from defaults", () => {
      const photo = createPhoto({
        edits: { brightness: 120, contrast: 100, saturate: 100, zoom: 1, pan: { x: 0, y: 0 } },
      });

      const body = photo.toBody();

      expect(body.isEdited).toBe(true);
    });
  });

  describe("updatePhoto", () => {
    it("updates edits from provided data", () => {
      const photo = createPhoto();

      const newData: PhotoBody = {
        directory: "/project",
        name: "photo.jpg",
        thumbnail: ".thumbnails/photo_edited.jpg",
        edits: {
          brightness: 150,
          contrast: 80,
          saturate: 120,
          zoom: 2,
          pan: { x: 50, y: -30 },
        },
        isEdited: true,
      };

      photo.updatePhoto(newData);

      expect(photo.edits.brightness).toBe(150);
      expect(photo.edits.contrast).toBe(80);
      expect(photo.edits.saturate).toBe(120);
      expect(photo.edits.zoom).toBe(2);
      expect(photo.edits.pan).toStrictEqual({ x: 50, y: -30 });
    });

    it("updates thumbnail", () => {
      const photo = createPhoto();

      photo.updatePhoto({
        directory: "/project",
        name: "photo.jpg",
        thumbnail: ".thumbnails/new_thumbnail.jpg",
        edits: { ...defaultEdits, pan: { x: 0, y: 0 } },
        isEdited: false,
      });

      expect(photo.thumbnail).toBe(".thumbnails/new_thumbnail.jpg");
    });

    it("increments version", () => {
      const photo = createPhoto();

      expect(photo.version).toBe(1);

      photo.updatePhoto({
        directory: "/project",
        name: "photo.jpg",
        thumbnail: ".thumbnails/photo.jpg",
        edits: { ...defaultEdits, pan: { x: 0, y: 0 } },
        isEdited: false,
      });

      expect(photo.version).toBe(2);
    });

    it("calls project save", () => {
      const photo = createPhoto();

      photo.updatePhoto({
        directory: "/project",
        name: "photo.jpg",
        thumbnail: ".thumbnails/photo.jpg",
        edits: { ...defaultEdits, pan: { x: 0, y: 0 } },
        isEdited: false,
      });

      expect(mockProject.save).toHaveBeenCalledWith();
    });

    it("returns the photo for chaining", () => {
      const photo = createPhoto();

      const result = photo.updatePhoto({
        directory: "/project",
        name: "photo.jpg",
        thumbnail: ".thumbnails/photo.jpg",
        edits: { ...defaultEdits, pan: { x: 0, y: 0 } },
        isEdited: false,
      });

      expect(result).toBe(photo);
    });

    it("creates deep copy of edits to avoid shared references", () => {
      const photo = createPhoto();

      const updateData: PhotoBody = {
        directory: "/project",
        name: "photo.jpg",
        thumbnail: ".thumbnails/photo.jpg",
        edits: { brightness: 120, contrast: 80, saturate: 150, zoom: 1.5, pan: { x: 10, y: 20 } },
        isEdited: true,
      };

      photo.updatePhoto(updateData);

      // Mutating the source data should not affect the photo
      updateData.edits.pan.x = 999;

      expect(photo.edits.pan.x).toBe(10);
    });
  });
});
