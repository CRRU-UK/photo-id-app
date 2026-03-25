import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_PHOTO_EDITS } from "@/constants";

import Collection from "./Collection";
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

describe(Collection, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("initialises with default values", () => {
      const collection = new Collection({ index: 0, photos: [] }, project);

      expect(collection.name).toBeUndefined();
      expect(collection.index).toBe(0);
      expect(collection.photos).toHaveLength(0);
    });

    it("initialises with provided name", () => {
      const collection = new Collection({ name: "Test Collection", index: 0, photos: [] }, project);

      expect(collection.name).toBe("Test Collection");
    });

    it("initialises with existing photos", () => {
      const photo = createPhoto("photo.jpg");
      const collection = new Collection({ index: 0, photos: [photo] }, project);

      expect(collection.photos).toHaveLength(1);
    });
  });

  describe("addPhoto", () => {
    it("adds a photo to the collection", () => {
      const collection = new Collection({ index: 0, photos: [] }, project);
      const photo = createPhoto("new.jpg");

      collection.addPhoto(photo);

      expect(collection.photos).toContain(photo);
      expect(collection.photos).toHaveLength(1);
    });

    it("moves index to the newly added photo", () => {
      const existing = createPhoto("existing.jpg");
      const collection = new Collection({ index: 0, photos: [existing] }, project);

      const newPhoto = createPhoto("new.jpg");
      collection.addPhoto(newPhoto);

      expect(collection.index).toBe(1);
    });

    it("calls project save", () => {
      const collection = new Collection({ index: 0, photos: [] }, project);
      collection.addPhoto(createPhoto("photo.jpg"));

      vi.runAllTimers();

      expect(window.electronAPI.saveProject).toHaveBeenCalledWith(expect.any(String));
    });

    it("returns the collection for chaining", () => {
      const collection = new Collection({ index: 0, photos: [] }, project);
      const result = collection.addPhoto(createPhoto("photo.jpg"));

      expect(result).toBe(collection);
    });
  });

  describe("removePhoto", () => {
    it("removes a photo from the collection", () => {
      const photo = createPhoto("remove.jpg");
      const collection = new Collection({ index: 0, photos: [photo] }, project);

      collection.removePhoto(photo);

      expect(collection.photos).not.toContain(photo);
      expect(collection.photos).toHaveLength(0);
    });

    it("decrements index when removing photo at or beyond current index", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const collection = new Collection({ index: 1, photos: [photo1, photo2] }, project);

      collection.removePhoto(photo2);

      expect(collection.index).toBe(0);
    });

    it("does not decrement index when index remains valid", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const photo3 = createPhoto("c.jpg");
      const collection = new Collection({ index: 0, photos: [photo1, photo2, photo3] }, project);

      collection.removePhoto(photo3);

      expect(collection.index).toBe(0);
    });

    it("returns the collection for chaining", () => {
      const photo = createPhoto("photo.jpg");
      const collection = new Collection({ index: 0, photos: [photo] }, project);
      const result = collection.removePhoto(photo);

      expect(result).toBe(collection);
    });
  });

  describe("hasPhoto", () => {
    it("returns true when photo exists in collection", () => {
      const photo = createPhoto("photo.jpg");
      const collection = new Collection({ index: 0, photos: [photo] }, project);

      expect(collection.hasPhoto(photo)).toBe(true);
    });

    it("returns false when photo does not exist in collection", () => {
      const photo = createPhoto("photo.jpg");
      const collection = new Collection({ index: 0, photos: [] }, project);

      expect(collection.hasPhoto(photo)).toBe(false);
    });
  });

  describe("currentPhoto", () => {
    it("returns null when collection is empty", () => {
      const collection = new Collection({ index: 0, photos: [] }, project);

      expect(collection.currentPhoto).toBeNull();
    });

    it("returns null when index is negative", () => {
      const photo = createPhoto("a.jpg");
      const collection = new Collection({ index: -1, photos: [photo] }, project);

      expect(collection.currentPhoto).toBeNull();
    });

    it("returns null when index is out of bounds", () => {
      const photo = createPhoto("a.jpg");
      const collection = new Collection({ index: 5, photos: [photo] }, project);

      expect(collection.currentPhoto).toBeNull();
    });

    it("returns the photo at the current index", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const collection = new Collection({ index: 1, photos: [photo1, photo2] }, project);

      expect(collection.currentPhoto).toBe(photo2);
    });

    it("returns the first photo when index is 0", () => {
      const photo = createPhoto("only.jpg");
      const collection = new Collection({ index: 0, photos: [photo] }, project);

      expect(collection.currentPhoto).toBe(photo);
    });
  });

  describe("setPreviousPhoto", () => {
    it("returns without changing index on empty collection", () => {
      const collection = new Collection({ index: 0, photos: [] }, project);

      const result = collection.setPreviousPhoto();

      expect(collection.index).toBe(0);
      expect(result).toBe(collection);
    });

    it("moves to the previous photo", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const collection = new Collection({ index: 1, photos: [photo1, photo2] }, project);

      collection.setPreviousPhoto();

      expect(collection.index).toBe(0);
    });

    it("wraps around to the last photo from the first", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const photo3 = createPhoto("c.jpg");
      const collection = new Collection({ index: 0, photos: [photo1, photo2, photo3] }, project);

      collection.setPreviousPhoto();

      expect(collection.index).toBe(2);
    });

    it("calls project save", () => {
      const photo = createPhoto("a.jpg");
      const collection = new Collection({ index: 0, photos: [photo] }, project);

      collection.setPreviousPhoto();

      vi.runAllTimers();

      expect(window.electronAPI.saveProject).toHaveBeenCalledWith(expect.any(String));
    });

    it("returns the collection for chaining", () => {
      const photo = createPhoto("a.jpg");
      const collection = new Collection({ index: 0, photos: [photo] }, project);
      const result = collection.setPreviousPhoto();

      expect(result).toBe(collection);
    });
  });

  describe("setNextPhoto", () => {
    it("returns without changing index on empty collection", () => {
      const collection = new Collection({ index: 0, photos: [] }, project);

      const result = collection.setNextPhoto();

      expect(collection.index).toBe(0);
      expect(result).toBe(collection);
    });

    it("moves to the next photo", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const collection = new Collection({ index: 0, photos: [photo1, photo2] }, project);

      collection.setNextPhoto();

      expect(collection.index).toBe(1);
    });

    it("wraps around to the first photo from the last", () => {
      const photo1 = createPhoto("a.jpg");
      const photo2 = createPhoto("b.jpg");
      const collection = new Collection({ index: 1, photos: [photo1, photo2] }, project);

      collection.setNextPhoto();

      expect(collection.index).toBe(0);
    });

    it("calls project save", () => {
      const photo = createPhoto("a.jpg");
      const collection = new Collection({ index: 0, photos: [photo] }, project);

      collection.setNextPhoto();

      vi.runAllTimers();

      expect(window.electronAPI.saveProject).toHaveBeenCalledWith(expect.any(String));
    });

    it("returns the collection for chaining", () => {
      const photo = createPhoto("a.jpg");
      const collection = new Collection({ index: 0, photos: [photo] }, project);
      const result = collection.setNextPhoto();

      expect(result).toBe(collection);
    });
  });

  describe("setName", () => {
    it("sets the name of the collection", () => {
      const collection = new Collection({ index: 0, photos: [] }, project);

      collection.setName("New Name");

      expect(collection.name).toBe("New Name");
    });

    it("calls project save", () => {
      const collection = new Collection({ index: 0, photos: [] }, project);

      collection.setName("Test");

      vi.runAllTimers();

      expect(window.electronAPI.saveProject).toHaveBeenCalledWith(expect.any(String));
    });

    it("returns the collection for chaining", () => {
      const collection = new Collection({ index: 0, photos: [] }, project);
      const result = collection.setName("Test");

      expect(result).toBe(collection);
    });
  });
});
