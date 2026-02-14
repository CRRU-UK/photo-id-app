import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_PHOTO_EDITS } from "@/constants";
import type { PhotoBody, ProjectBody } from "@/types";

import Collection from "./Collection";
import Photo from "./Photo";
import Project from "./Project";

// Mock window.electronAPI.saveProject to prevent actual file I/O
vi.stubGlobal("window", {
  electronAPI: {
    saveProject: vi.fn<(data: string) => void>(),
    duplicatePhotoFile: vi.fn<() => void>(),
    exportMatches: vi.fn<() => void>(),
  },
});

const createPhotoBody = (name: string, isEdited = false): PhotoBody => ({
  directory: "/project",
  name,
  thumbnail: `.thumbnails/${name}`,
  edits: { ...DEFAULT_PHOTO_EDITS, pan: { x: 0, y: 0 } },
  isEdited,
});

const createProjectBody = (overrides?: Partial<ProjectBody>): ProjectBody => ({
  version: "v1",
  id: "test-project-id",
  directory: "/project",
  unassigned: {
    photos: [createPhotoBody("photo1.jpg"), createPhotoBody("photo2.jpg")],
    index: 0,
  },
  discarded: {
    photos: [],
    index: 0,
  },
  matched: [
    {
      id: 1,
      left: { photos: [createPhotoBody("left1.jpg")], index: 0 },
      right: { photos: [], index: 0 },
    },
  ],
  created: "2025-01-01T00:00:00.000Z",
  lastModified: "2025-01-15T12:00:00.000Z",
  ...overrides,
});

describe(Project, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("initialises with default metadata when no data is provided", () => {
      const project = new Project();

      expect(project.version).toBe("v1");
      expect(project.id).toBe("");
      expect(project.directory).toBe("");
    });

    it("initialises with empty collections when no data is provided", () => {
      const project = new Project();

      expect(project.allPhotos.size).toBe(0);
      expect(project.unassigned.photos.size).toBe(0);
      expect(project.discarded.photos.size).toBe(0);
      expect(project.matched.size).toBe(0);
    });

    it("loads from data when provided to constructor", () => {
      const data = createProjectBody();
      const project = new Project(data);

      expect(project.id).toBe("test-project-id");
      expect(project.directory).toBe("/project");
      expect(project.version).toBe("v1");
    });
  });

  describe("loadFromJSON", () => {
    it("loads project state from a ProjectBody object", () => {
      const project = new Project();
      const data = createProjectBody();

      project.loadFromJSON(data);

      expect(project.id).toBe("test-project-id");
      expect(project.directory).toBe("/project");
      expect(project.unassigned.photos.size).toBe(2);
      expect(project.discarded.photos.size).toBe(0);
      expect(project.matched.size).toBe(1);
    });

    it("loads project state from a JSON string", () => {
      const project = new Project();
      const data = createProjectBody();

      project.loadFromJSON(JSON.stringify(data));

      expect(project.id).toBe("test-project-id");
      expect(project.directory).toBe("/project");
    });

    it("populates allPhotos with all photos from all collections", () => {
      const project = new Project();
      const data = createProjectBody();

      project.loadFromJSON(data);

      // 2 unassigned + 1 left matched = 3
      expect(project.allPhotos.size).toBe(3);
    });

    it("correctly parses dates", () => {
      const project = new Project();
      const data = createProjectBody();

      project.loadFromJSON(data);

      expect(project.created).toStrictEqual(new Date("2025-01-01T00:00:00.000Z"));
      expect(project.lastModified).toStrictEqual(new Date("2025-01-15T12:00:00.000Z"));
    });

    it("creates Collection instances for unassigned and discarded", () => {
      const project = new Project();
      project.loadFromJSON(createProjectBody());

      expect(project.unassigned).toBeInstanceOf(Collection);
      expect(project.discarded).toBeInstanceOf(Collection);
    });

    it("creates Collection instances for matched left and right", () => {
      const project = new Project();
      project.loadFromJSON(createProjectBody());

      const matched = Array.from(project.matched);

      expect(matched[0].left).toBeInstanceOf(Collection);
      expect(matched[0].right).toBeInstanceOf(Collection);
    });

    it("populates photos as Photo instances", () => {
      const project = new Project();
      project.loadFromJSON(createProjectBody());

      const firstPhoto = Array.from(project.allPhotos)[0];

      expect(firstPhoto).toBeInstanceOf(Photo);
    });

    it("preserves matched set IDs", () => {
      const project = new Project();
      const data = createProjectBody({
        matched: [
          {
            id: 5,
            left: { photos: [], index: 0 },
            right: { photos: [], index: 0 },
          },
          {
            id: 10,
            left: { photos: [], index: 0 },
            right: { photos: [], index: 0 },
          },
        ],
      });

      project.loadFromJSON(data);

      const matched = Array.from(project.matched);

      expect(matched[0].id).toBe(5);
      expect(matched[1].id).toBe(10);
    });

    it("handles empty project data", () => {
      const project = new Project();
      const data = createProjectBody({
        unassigned: { photos: [], index: 0 },
        discarded: { photos: [], index: 0 },
        matched: [],
      });

      project.loadFromJSON(data);

      expect(project.allPhotos.size).toBe(0);
      expect(project.unassigned.photos.size).toBe(0);
      expect(project.discarded.photos.size).toBe(0);
      expect(project.matched.size).toBe(0);
    });

    it("defaults id to empty string when not provided", () => {
      const project = new Project();
      const data = createProjectBody();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...rest } = data;

      project.loadFromJSON(rest as ProjectBody);

      expect(project.id).toBe("");
    });

    it("returns the project for chaining", () => {
      const project = new Project();
      const result = project.loadFromJSON(createProjectBody());

      expect(result).toBe(project);
    });

    it("preserves collection names", () => {
      const project = new Project();
      const data = createProjectBody({
        matched: [
          {
            id: 1,
            left: { name: "001", photos: [], index: 0 },
            right: { name: "002", photos: [], index: 0 },
          },
        ],
      });

      project.loadFromJSON(data);

      const matched = Array.from(project.matched);

      expect(matched[0].left.name).toBe("001");
      expect(matched[0].right.name).toBe("002");
    });
  });

  describe("updatePhoto", () => {
    it("updates an existing photo by name", () => {
      const project = new Project(createProjectBody());

      const updatedData: PhotoBody = {
        directory: "/project",
        name: "photo1.jpg",
        thumbnail: ".thumbnails/photo1_edited.jpg",
        edits: {
          brightness: 150,
          contrast: 80,
          saturate: 120,
          zoom: 2,
          pan: { x: 10, y: 20 },
        },
        isEdited: true,
      };

      project.updatePhoto(updatedData);

      const photo = Array.from(project.allPhotos).find((p) => p.fileName === "photo1.jpg");

      expect(photo?.edits.brightness).toBe(150);
      expect(photo?.thumbnail).toBe(".thumbnails/photo1_edited.jpg");
    });

    it("logs error when photo is not found", () => {
      const project = new Project(createProjectBody());
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

      project.updatePhoto(createPhotoBody("nonexistent.jpg"));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Unable to find photo with name:",
        "nonexistent.jpg",
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("addPhotoToStack", () => {
    it("moves a photo from one collection to another", () => {
      const project = new Project(createProjectBody());
      const from = project.unassigned;
      const to = project.discarded;
      const photo = from.currentPhoto!;

      project.addPhotoToStack(from, to, photo);

      expect(from.hasPhoto(photo)).toBe(false);
      expect(to.hasPhoto(photo)).toBe(true);
    });

    it("does not add photo if it already exists in the target collection", () => {
      const project = new Project(createProjectBody());
      const from = project.unassigned;
      const photo = from.currentPhoto!;

      const result = project.addPhotoToStack(from, from, photo);

      expect(result).toBe(project);
      expect(from.photos.size).toBe(2); // unchanged
    });

    it("calls save after moving", () => {
      const project = new Project(createProjectBody());
      const from = project.unassigned;
      const matched = Array.from(project.matched);
      const to = matched[0].left;
      const photo = from.currentPhoto!;

      vi.mocked(window.electronAPI.saveProject).mockClear();

      project.addPhotoToStack(from, to, photo);

      expect(window.electronAPI.saveProject).toHaveBeenCalledWith(expect.any(String));
    });

    it("returns the project for chaining", () => {
      const project = new Project(createProjectBody());
      const from = project.unassigned;
      const to = project.discarded;
      const photo = from.currentPhoto!;

      const result = project.addPhotoToStack(from, to, photo);

      expect(result).toBe(project);
    });
  });

  describe("save", () => {
    it("calls window.electronAPI.saveProject with JSON string", () => {
      const project = new Project(createProjectBody());

      project.save();

      expect(window.electronAPI.saveProject).toHaveBeenCalledWith(expect.any(String));
    });

    it("produces valid JSON when saving", () => {
      const project = new Project(createProjectBody());

      project.save();

      const savedData = vi.mocked(window.electronAPI.saveProject).mock.calls[0][0];
      const parsed = JSON.parse(savedData) as ProjectBody;

      expect(parsed.version).toBe("v1");
      expect(parsed.directory).toBe("/project");
      expect(parsed.unassigned.photos).toHaveLength(2);
    });

    it("updates lastModified when saving", () => {
      const project = new Project(createProjectBody());
      const originalLastModified = project.lastModified;

      // Small delay to ensure different timestamp
      project.save();

      expect(project.lastModified.getTime()).toBeGreaterThanOrEqual(originalLastModified.getTime());
    });

    it("serialises matched sets correctly", () => {
      const project = new Project(createProjectBody());

      project.save();

      const savedData = vi.mocked(window.electronAPI.saveProject).mock.calls[0][0];
      const parsed = JSON.parse(savedData) as ProjectBody;

      expect(parsed.matched).toHaveLength(1);
      expect(parsed.matched[0].id).toBe(1);
      expect(parsed.matched[0].left.photos).toHaveLength(1);
      expect(parsed.matched[0].left.photos[0].name).toBe("left1.jpg");
    });
  });

  describe("round-trip serialisation", () => {
    it("preserves data through load and save cycle", () => {
      const originalData = createProjectBody();
      const project = new Project(originalData);

      project.save();

      const savedJSON = vi.mocked(window.electronAPI.saveProject).mock.calls[0][0];
      const restored = JSON.parse(savedJSON) as ProjectBody;

      expect(restored.version).toBe(originalData.version);
      expect(restored.directory).toBe(originalData.directory);
      expect(restored.unassigned.photos).toHaveLength(originalData.unassigned.photos.length);
      expect(restored.discarded.photos).toHaveLength(originalData.discarded.photos.length);
      expect(restored.matched).toHaveLength(originalData.matched.length);
    });

    it("preserves photo data through load and save cycle", () => {
      const originalData = createProjectBody({
        unassigned: {
          photos: [
            {
              directory: "/project",
              name: "edited.jpg",
              thumbnail: ".thumbnails/edited.jpg",
              edits: {
                brightness: 150,
                contrast: 80,
                saturate: 120,
                zoom: 2.5,
                pan: { x: 100, y: -50 },
              },
              isEdited: true,
            },
          ],
          index: 0,
        },
      });

      const project = new Project(originalData);
      project.save();

      const savedJSON = vi.mocked(window.electronAPI.saveProject).mock.calls[0][0];
      const restored = JSON.parse(savedJSON) as ProjectBody;

      const photo = restored.unassigned.photos[0];

      expect(photo.name).toBe("edited.jpg");
      expect(photo.edits.brightness).toBe(150);
      expect(photo.edits.pan).toStrictEqual({ x: 100, y: -50 });
      expect(photo.isEdited).toBe(true);
    });
  });
});
