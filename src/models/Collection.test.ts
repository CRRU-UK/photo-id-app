/* eslint-disable @typescript-eslint/unbound-method */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type Project from "@/models/Project";

import Stack from "./Collection";
import Photo from "./Photo";

const mockProject = {
  save: vi.fn<() => void>(),
} as unknown as Project;

const createPhoto = (name: string): Photo =>
  new Photo(
    {
      directory: "/project",
      name,
      thumbnail: `.thumbnails/${name}`,
      edits: {
        brightness: 100,
        contrast: 100,
        saturate: 100,
        zoom: 1,
        pan: { x: 0, y: 0 },
      },
    },
    mockProject,
  );

describe(Stack, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("initialises with default values", () => {
      const stack = new Stack({ index: 0, photos: new Set() }, mockProject);

      expect(stack.name).toBeUndefined();
      expect(stack.index).toBe(0);
      expect(stack.photos.size).toBe(0);
    });

    it("initialises with provided name", () => {
      const stack = new Stack({ name: "Test Stack", index: 0, photos: new Set() }, mockProject);

      expect(stack.name).toBe("Test Stack");
    });

    it("initialises with existing photos", () => {
      const photo = createPhoto("photo.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, mockProject);

      expect(stack.photos.size).toBe(1);
    });
  });

  describe("addPhoto", () => {
    it("adds a photo to the stack", () => {
      const stack = new Stack({ index: 0, photos: new Set() }, mockProject);
      const photo = createPhoto("new.jpg");

      stack.addPhoto(photo);

      expect(stack.photos.has(photo)).toBe(true);
      expect(stack.photos.size).toBe(1);
    });

    it("moves index to the newly added photo", () => {
      const existing = createPhoto("existing.jpg");
      const stack = new Stack({ index: 0, photos: new Set([existing]) }, mockProject);

      const newPhoto = createPhoto("new.jpg");
      stack.addPhoto(newPhoto);

      expect(stack.index).toBe(1);
    });

    it("calls project save", () => {
      const stack = new Stack({ index: 0, photos: new Set() }, mockProject);
      stack.addPhoto(createPhoto("photo.jpg"));

      expect(mockProject.save).toHaveBeenCalledWith();
    });

    it("returns the stack for chaining", () => {
      const stack = new Stack({ index: 0, photos: new Set() }, mockProject);
      const result = stack.addPhoto(createPhoto("photo.jpg"));

      expect(result).toBe(stack);
    });
  });

  describe("removePhoto", () => {
    it("removes a photo from the stack", () => {
      const photo = createPhoto("remove.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, mockProject);

      stack.removePhoto(photo);

      expect(stack.photos.has(photo)).toBe(false);
      expect(stack.photos.size).toBe(0);
    });

    it("decrements index when removing photo at or beyond current index", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const stack = new Stack({ index: 1, photos: new Set([photo1, photo2]) }, mockProject);

      stack.removePhoto(photo2);

      expect(stack.index).toBe(0);
    });

    it("does not decrement index when index remains valid", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const photo3 = createPhoto("c.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo1, photo2, photo3]) }, mockProject);

      stack.removePhoto(photo3);

      expect(stack.index).toBe(0);
    });

    it("returns the stack for chaining", () => {
      const photo = createPhoto("photo.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, mockProject);
      const result = stack.removePhoto(photo);

      expect(result).toBe(stack);
    });
  });

  describe("hasPhoto", () => {
    it("returns true when photo exists in stack", () => {
      const photo = createPhoto("photo.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, mockProject);

      expect(stack.hasPhoto(photo)).toBe(true);
    });

    it("returns false when photo does not exist in stack", () => {
      const photo = createPhoto("photo.jpg");
      const stack = new Stack({ index: 0, photos: new Set() }, mockProject);

      expect(stack.hasPhoto(photo)).toBe(false);
    });
  });

  describe("currentPhoto", () => {
    it("returns null when stack is empty", () => {
      const stack = new Stack({ index: 0, photos: new Set() }, mockProject);

      expect(stack.currentPhoto).toBeNull();
    });

    it("returns the photo at the current index", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const stack = new Stack({ index: 1, photos: new Set([photo1, photo2]) }, mockProject);

      expect(stack.currentPhoto).toBe(photo2);
    });

    it("returns the first photo when index is 0", () => {
      const photo = createPhoto("only.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, mockProject);

      expect(stack.currentPhoto).toBe(photo);
    });
  });

  describe("setPreviousPhoto", () => {
    it("moves to the previous photo", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const stack = new Stack({ index: 1, photos: new Set([photo1, photo2]) }, mockProject);

      stack.setPreviousPhoto();

      expect(stack.index).toBe(0);
    });

    it("wraps around to the last photo from the first", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const photo3 = createPhoto("c.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo1, photo2, photo3]) }, mockProject);

      stack.setPreviousPhoto();

      expect(stack.index).toBe(2);
    });

    it("calls project save", () => {
      const photo = createPhoto("a.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, mockProject);

      stack.setPreviousPhoto();

      expect(mockProject.save).toHaveBeenCalledWith();
    });

    it("returns the stack for chaining", () => {
      const photo = createPhoto("a.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, mockProject);
      const result = stack.setPreviousPhoto();

      expect(result).toBe(stack);
    });
  });

  describe("setNextPhoto", () => {
    it("moves to the next photo", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo1, photo2]) }, mockProject);

      stack.setNextPhoto();

      expect(stack.index).toBe(1);
    });

    it("wraps around to the first photo from the last", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const stack = new Stack({ index: 1, photos: new Set([photo1, photo2]) }, mockProject);

      stack.setNextPhoto();

      expect(stack.index).toBe(0);
    });

    it("calls project save", () => {
      const photo = createPhoto("a.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, mockProject);

      stack.setNextPhoto();

      expect(mockProject.save).toHaveBeenCalledWith();
    });

    it("returns the stack for chaining", () => {
      const photo = createPhoto("a.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, mockProject);
      const result = stack.setNextPhoto();

      expect(result).toBe(stack);
    });
  });

  describe("setName", () => {
    it("sets the name of the stack", () => {
      const stack = new Stack({ index: 0, photos: new Set() }, mockProject);

      stack.setName("New Name");

      expect(stack.name).toBe("New Name");
    });

    it("calls project save", () => {
      const stack = new Stack({ index: 0, photos: new Set() }, mockProject);

      stack.setName("Test");

      expect(mockProject.save).toHaveBeenCalledWith();
    });

    it("returns the stack for chaining", () => {
      const stack = new Stack({ index: 0, photos: new Set() }, mockProject);
      const result = stack.setName("Test");

      expect(result).toBe(stack);
    });
  });
});
