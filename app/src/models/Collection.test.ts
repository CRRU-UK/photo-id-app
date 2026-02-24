import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_PHOTO_EDITS } from "@/constants";

import Stack from "./Collection";
import Photo from "./Photo";
import Project from "./Project";

vi.stubGlobal("window", {
  electronAPI: {
    saveProject: vi.fn<(data: string) => void>(),
  },
});

const project = new Project();

const createPhoto = (name: string): Photo =>
  new Photo(
    {
      directory: "/project",
      name,
      thumbnail: `.thumbnails/${name}`,
      edits: { ...DEFAULT_PHOTO_EDITS, pan: { x: 0, y: 0 } },
    },
    project,
  );

describe(Stack, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("initialises with default values", () => {
      const stack = new Stack({ index: 0, photos: new Set() }, project);

      expect(stack.name).toBeUndefined();
      expect(stack.index).toBe(0);
      expect(stack.photos.size).toBe(0);
    });

    it("initialises with provided name", () => {
      const stack = new Stack({ name: "Test Stack", index: 0, photos: new Set() }, project);

      expect(stack.name).toBe("Test Stack");
    });

    it("initialises with existing photos", () => {
      const photo = createPhoto("photo.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, project);

      expect(stack.photos.size).toBe(1);
    });
  });

  describe("addPhoto", () => {
    it("adds a photo to the stack", () => {
      const stack = new Stack({ index: 0, photos: new Set() }, project);
      const photo = createPhoto("new.jpg");

      stack.addPhoto(photo);

      expect(stack.photos.has(photo)).toBe(true);
      expect(stack.photos.size).toBe(1);
    });

    it("moves index to the newly added photo", () => {
      const existing = createPhoto("existing.jpg");
      const stack = new Stack({ index: 0, photos: new Set([existing]) }, project);

      const newPhoto = createPhoto("new.jpg");
      stack.addPhoto(newPhoto);

      expect(stack.index).toBe(1);
    });

    it("calls project save", () => {
      const stack = new Stack({ index: 0, photos: new Set() }, project);
      stack.addPhoto(createPhoto("photo.jpg"));

      expect(window.electronAPI.saveProject).toHaveBeenCalledWith(expect.any(String));
    });

    it("returns the stack for chaining", () => {
      const stack = new Stack({ index: 0, photos: new Set() }, project);
      const result = stack.addPhoto(createPhoto("photo.jpg"));

      expect(result).toBe(stack);
    });
  });

  describe("removePhoto", () => {
    it("removes a photo from the stack", () => {
      const photo = createPhoto("remove.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, project);

      stack.removePhoto(photo);

      expect(stack.photos.has(photo)).toBe(false);
      expect(stack.photos.size).toBe(0);
    });

    it("decrements index when removing photo at or beyond current index", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const stack = new Stack({ index: 1, photos: new Set([photo1, photo2]) }, project);

      stack.removePhoto(photo2);

      expect(stack.index).toBe(0);
    });

    it("does not decrement index when index remains valid", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const photo3 = createPhoto("c.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo1, photo2, photo3]) }, project);

      stack.removePhoto(photo3);

      expect(stack.index).toBe(0);
    });

    it("returns the stack for chaining", () => {
      const photo = createPhoto("photo.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, project);
      const result = stack.removePhoto(photo);

      expect(result).toBe(stack);
    });
  });

  describe("hasPhoto", () => {
    it("returns true when photo exists in stack", () => {
      const photo = createPhoto("photo.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, project);

      expect(stack.hasPhoto(photo)).toBe(true);
    });

    it("returns false when photo does not exist in stack", () => {
      const photo = createPhoto("photo.jpg");
      const stack = new Stack({ index: 0, photos: new Set() }, project);

      expect(stack.hasPhoto(photo)).toBe(false);
    });
  });

  describe("currentPhoto", () => {
    it("returns null when stack is empty", () => {
      const stack = new Stack({ index: 0, photos: new Set() }, project);

      expect(stack.currentPhoto).toBeNull();
    });

    it("returns the photo at the current index", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const stack = new Stack({ index: 1, photos: new Set([photo1, photo2]) }, project);

      expect(stack.currentPhoto).toBe(photo2);
    });

    it("returns the first photo when index is 0", () => {
      const photo = createPhoto("only.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, project);

      expect(stack.currentPhoto).toBe(photo);
    });
  });

  describe("setPreviousPhoto", () => {
    it("moves to the previous photo", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const stack = new Stack({ index: 1, photos: new Set([photo1, photo2]) }, project);

      stack.setPreviousPhoto();

      expect(stack.index).toBe(0);
    });

    it("wraps around to the last photo from the first", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const photo3 = createPhoto("c.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo1, photo2, photo3]) }, project);

      stack.setPreviousPhoto();

      expect(stack.index).toBe(2);
    });

    it("calls project save", () => {
      const photo = createPhoto("a.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, project);

      stack.setPreviousPhoto();

      expect(window.electronAPI.saveProject).toHaveBeenCalledWith(expect.any(String));
    });

    it("returns the stack for chaining", () => {
      const photo = createPhoto("a.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, project);
      const result = stack.setPreviousPhoto();

      expect(result).toBe(stack);
    });
  });

  describe("setNextPhoto", () => {
    it("moves to the next photo", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo1, photo2]) }, project);

      stack.setNextPhoto();

      expect(stack.index).toBe(1);
    });

    it("wraps around to the first photo from the last", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const stack = new Stack({ index: 1, photos: new Set([photo1, photo2]) }, project);

      stack.setNextPhoto();

      expect(stack.index).toBe(0);
    });

    it("calls project save", () => {
      const photo = createPhoto("a.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, project);

      stack.setNextPhoto();

      expect(window.electronAPI.saveProject).toHaveBeenCalledWith(expect.any(String));
    });

    it("returns the stack for chaining", () => {
      const photo = createPhoto("a.jpg");
      const stack = new Stack({ index: 0, photos: new Set([photo]) }, project);
      const result = stack.setNextPhoto();

      expect(result).toBe(stack);
    });
  });

  describe("setName", () => {
    it("sets the name of the stack", () => {
      const stack = new Stack({ index: 0, photos: new Set() }, project);

      stack.setName("New Name");

      expect(stack.name).toBe("New Name");
    });

    it("calls project save", () => {
      const stack = new Stack({ index: 0, photos: new Set() }, project);

      stack.setName("Test");

      expect(window.electronAPI.saveProject).toHaveBeenCalledWith(expect.any(String));
    });

    it("returns the stack for chaining", () => {
      const stack = new Stack({ index: 0, photos: new Set() }, project);
      const result = stack.setName("Test");

      expect(result).toBe(stack);
    });
  });
});
