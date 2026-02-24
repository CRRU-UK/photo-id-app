import { beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_RECENT_PROJECTS, RECENT_PROJECTS_FILE_NAME } from "@/constants";
import type { RecentProject } from "@/types";

const mockExistsSync = vi.fn<(path: string) => boolean>();
const mockReadFile = vi.fn<(path: string, encoding: string) => Promise<string>>();
const mockWriteFile = vi.fn<(path: string, data: string, encoding: string) => Promise<void>>();

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn<() => string>(() => "/mock/userData"),
  },
}));

vi.mock("node:fs", () => ({
  default: {
    existsSync: (...args: Parameters<typeof mockExistsSync>) => mockExistsSync(...args),
    promises: {
      readFile: (...args: Parameters<typeof mockReadFile>) => mockReadFile(...args),
      writeFile: (...args: Parameters<typeof mockWriteFile>) => mockWriteFile(...args),
    },
  },
}));

const { addRecentProject, dedupeRecentProjects, getRecentProjects, removeRecentProject } =
  await import("./recents");

describe(dedupeRecentProjects, () => {
  it("returns empty array when given empty array", () => {
    const result = dedupeRecentProjects([], 5);

    expect(result).toStrictEqual([]);
  });

  it("returns items unchanged when no duplicates and within limit", () => {
    const items: RecentProject[] = [
      { name: "Project A", path: "/path/a", lastOpened: "2025-01-01" },
      { name: "Project B", path: "/path/b", lastOpened: "2025-01-02" },
    ];

    const result = dedupeRecentProjects(items, 5);

    expect(result).toStrictEqual(items);
  });

  it("removes duplicate paths, keeping the first occurrence", () => {
    const items: RecentProject[] = [
      { name: "Project A (new)", path: "/path/a", lastOpened: "2025-01-03" },
      { name: "Project B", path: "/path/b", lastOpened: "2025-01-02" },
      { name: "Project A (old)", path: "/path/a", lastOpened: "2025-01-01" },
    ];

    const result = dedupeRecentProjects(items, 5);

    expect(result).toStrictEqual([
      { name: "Project A (new)", path: "/path/a", lastOpened: "2025-01-03" },
      { name: "Project B", path: "/path/b", lastOpened: "2025-01-02" },
    ]);
  });

  it("limits results to max number of items", () => {
    const items: RecentProject[] = [
      { name: "A", path: "/a", lastOpened: "2025-01-01" },
      { name: "B", path: "/b", lastOpened: "2025-01-02" },
      { name: "C", path: "/c", lastOpened: "2025-01-03" },
      { name: "D", path: "/d", lastOpened: "2025-01-04" },
    ];

    const result = dedupeRecentProjects(items, 2);

    expect(result).toStrictEqual([
      { name: "A", path: "/a", lastOpened: "2025-01-01" },
      { name: "B", path: "/b", lastOpened: "2025-01-02" },
    ]);
  });

  it("deduplicates before applying limit", () => {
    const items: RecentProject[] = [
      { name: "A", path: "/a", lastOpened: "2025-01-04" },
      { name: "A dup", path: "/a", lastOpened: "2025-01-01" },
      { name: "B", path: "/b", lastOpened: "2025-01-03" },
      { name: "C", path: "/c", lastOpened: "2025-01-02" },
    ];

    const result = dedupeRecentProjects(items, 3);

    expect(result).toStrictEqual([
      { name: "A", path: "/a", lastOpened: "2025-01-04" },
      { name: "B", path: "/b", lastOpened: "2025-01-03" },
      { name: "C", path: "/c", lastOpened: "2025-01-02" },
    ]);
  });

  it("handles max of zero", () => {
    const items: RecentProject[] = [{ name: "A", path: "/a", lastOpened: "2025-01-01" }];

    const result = dedupeRecentProjects(items, 0);

    expect(result).toStrictEqual([]);
  });

  it("handles all items being duplicates", () => {
    const items: RecentProject[] = [
      { name: "A1", path: "/same", lastOpened: "2025-01-03" },
      { name: "A2", path: "/same", lastOpened: "2025-01-02" },
      { name: "A3", path: "/same", lastOpened: "2025-01-01" },
    ];

    const result = dedupeRecentProjects(items, 5);

    expect(result).toStrictEqual([{ name: "A1", path: "/same", lastOpened: "2025-01-03" }]);
  });

  it("returns exactly max items when deduplicated count equals max", () => {
    const items: RecentProject[] = [
      { name: "A", path: "/a", lastOpened: "2025-01-01" },
      { name: "B", path: "/b", lastOpened: "2025-01-02" },
      { name: "C", path: "/c", lastOpened: "2025-01-03" },
    ];

    const result = dedupeRecentProjects(items, 3);

    expect(result).toHaveLength(3);
  });
});

describe(getRecentProjects, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when the file does not exist", async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await getRecentProjects();

    expect(result).toStrictEqual([]);
  });

  it("reads and returns projects from the file", async () => {
    const projects: RecentProject[] = [
      { name: "A", path: "/a", lastOpened: "2025-01-01" },
      { name: "B", path: "/b", lastOpened: "2025-01-02" },
    ];
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(projects));

    const result = await getRecentProjects();

    expect(result).toStrictEqual(projects);
  });

  it("reads from the correct file path", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue("[]");

    await getRecentProjects();

    expect(mockReadFile).toHaveBeenCalledWith(
      expect.stringContaining(RECENT_PROJECTS_FILE_NAME),
      "utf8",
    );
  });
});

describe(addRecentProject, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
  });

  it("adds a new project to the front of the list", async () => {
    const existing: RecentProject[] = [{ name: "Old", path: "/old", lastOpened: "2025-01-01" }];
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(existing));

    const result = await addRecentProject({ name: "New", path: "/new" });

    expect(result[0].name).toBe("New");
    expect(result[0].path).toBe("/new");
  });

  it("sets lastOpened to current ISO timestamp", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue("[]");

    const before = Date.now();
    const result = await addRecentProject({ name: "Project", path: "/project" });
    const after = Date.now();

    const lastOpenedMs = new Date(result[0].lastOpened).getTime();

    expect(lastOpenedMs).toBeGreaterThanOrEqual(before);
    expect(lastOpenedMs).toBeLessThanOrEqual(after);
  });

  it("deduplicates and limits to MAX_RECENT_PROJECTS", async () => {
    const existing: RecentProject[] = Array.from({ length: MAX_RECENT_PROJECTS + 2 }, (_, i) => ({
      name: `Project ${i}`,
      path: `/path/${i}`,
      lastOpened: "2025-01-01",
    }));
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(existing));

    const result = await addRecentProject({ name: "New", path: "/new" });

    expect(result.length).toBeLessThanOrEqual(MAX_RECENT_PROJECTS);
  });

  it("writes the updated list to disk", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue("[]");

    await addRecentProject({ name: "Project", path: "/project" });

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining(RECENT_PROJECTS_FILE_NAME),
      expect.any(String),
      "utf8",
    );
  });

  it("deduplicates when adding a project that already exists", async () => {
    const existing: RecentProject[] = [
      { name: "Existing", path: "/same", lastOpened: "2025-01-01" },
    ];
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(existing));

    const result = await addRecentProject({ name: "Updated", path: "/same" });

    // The new entry should replace the old one (first occurrence wins after prepend)
    expect(result.filter((item) => item.path === "/same")).toHaveLength(1);
    expect(result[0].name).toBe("Updated");
  });
});

describe(removeRecentProject, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
  });

  it("removes the project with the given path", async () => {
    const existing: RecentProject[] = [
      { name: "A", path: "/a", lastOpened: "2025-01-01" },
      { name: "B", path: "/b", lastOpened: "2025-01-02" },
      { name: "C", path: "/c", lastOpened: "2025-01-03" },
    ];
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(existing));

    const result = await removeRecentProject("/b");

    expect(result).toStrictEqual([
      { name: "A", path: "/a", lastOpened: "2025-01-01" },
      { name: "C", path: "/c", lastOpened: "2025-01-03" },
    ]);
  });

  it("writes the updated list to disk", async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(
      JSON.stringify([{ name: "A", path: "/a", lastOpened: "2025-01-01" }]),
    );

    await removeRecentProject("/a");

    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining(RECENT_PROJECTS_FILE_NAME),
      expect.any(String),
      "utf8",
    );
  });

  it("returns unchanged list when path is not found", async () => {
    const existing: RecentProject[] = [{ name: "A", path: "/a", lastOpened: "2025-01-01" }];
    mockExistsSync.mockReturnValue(true);
    mockReadFile.mockResolvedValue(JSON.stringify(existing));

    const result = await removeRecentProject("/nonexistent");

    expect(result).toStrictEqual(existing);
  });

  it("returns empty array when list is already empty", async () => {
    mockExistsSync.mockReturnValue(false);

    const result = await removeRecentProject("/anything");

    expect(result).toStrictEqual([]);
  });
});
