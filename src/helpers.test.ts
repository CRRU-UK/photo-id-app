import url from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";

import { PROVIDER_LABEL_VARIANTS, ROUTES } from "@/constants";

import type { AnalysisMatchResult, SettingsData } from "@/types";

import {
  buildPhotoUrl,
  chunkArray,
  computeIsEdited,
  decodeEditPayload,
  encodeEditPayload,
  getAlphabetLetter,
  getAnalysisProvidersLabel,
  getCanvasFilters,
  getImageCoordinates,
  getProjectDirectoryName,
  getProviderLabelVariants,
  getRecentProjectDisplayPath,
  getSelectedAnalysisProviders,
  isEditWindow,
  stripWhitespace,
  validateProviderFields,
} from "./helpers";

describe(getAlphabetLetter, () => {
  it.each([
    [1, "A"],
    [26, "Z"],
    [27, "AA"],
    [52, "AZ"],
    [53, "BA"],
    [703, "AAA"],
  ])("returns alphabet letter", (input, expected) => {
    expect(getAlphabetLetter(input)).toBe(expected);
  });
});

describe(chunkArray, () => {
  it("chunks array correctly", () => {
    const input = ["A", "B", "C", "D", "E", "F", "G"];
    const result = chunkArray(input, 3);

    expect(result).toStrictEqual([["A", "B", "C"], ["D", "E", "F"], ["G"]]);
  });

  it("does not chunk array that is less than the given size", () => {
    const input = ["A", "B"];
    const result = chunkArray(input, 3);

    expect(result).toStrictEqual([["A", "B"]]);
  });
});

describe(getCanvasFilters, () => {
  it("returns regular filter string", () => {
    const result = getCanvasFilters({
      brightness: 120,
      contrast: 80,
      saturate: 150,
      edgeDetection: { enabled: false },
    });

    expect(result).toBe("brightness(120%) contrast(80%) saturate(150%)");
  });

  it("returns edge detection filter string", () => {
    const result = getCanvasFilters({
      brightness: 120,
      contrast: 80,
      saturate: 150,
      edgeDetection: { enabled: true, value: 50 },
    });

    expect(result).toBe("grayscale(1) invert(1) contrast(150%)");
  });
});

describe(getImageCoordinates, () => {
  it("converts screen coordinates to image coordinates", () => {
    const canvas = {
      getBoundingClientRect: () => ({
        left: 100,
        top: 50,
      }),
      clientWidth: 800,
      clientHeight: 600,
    } as unknown as HTMLCanvasElement;

    const image = {
      naturalWidth: 1600,
      naturalHeight: 1200,
    } as HTMLImageElement;

    const result = getImageCoordinates({ clientX: 500, clientY: 350, canvas, image });

    expect(result).toStrictEqual({ x: 800, y: 600 });
  });

  it("handles canvas offset correctly", () => {
    const canvas = {
      getBoundingClientRect: () => ({
        left: 200,
        top: 100,
      }),
      clientWidth: 400,
      clientHeight: 300,
    } as unknown as HTMLCanvasElement;

    const image = {
      naturalWidth: 800,
      naturalHeight: 600,
    } as HTMLImageElement;

    const result = getImageCoordinates({ clientX: 400, clientY: 250, canvas, image });

    expect(result).toStrictEqual({ x: 400, y: 300 });
  });

  it("returns null when canvas is null", () => {
    const image = {
      naturalWidth: 800,
      naturalHeight: 600,
    } as HTMLImageElement;

    const result = getImageCoordinates({
      clientX: 100,
      clientY: 100,
      canvas: null as unknown as HTMLCanvasElement,
      image,
    });

    expect(result).toBeNull();
  });

  it("returns null when image is null", () => {
    const canvas = {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
      }),
      clientWidth: 800,
      clientHeight: 600,
    } as unknown as HTMLCanvasElement;

    const result = getImageCoordinates({
      clientX: 100,
      clientY: 100,
      canvas,
      image: null as unknown as HTMLImageElement,
    });

    expect(result).toBeNull();
  });

  it("maps the canvas centre to the image centre regardless of aspect ratio", () => {
    const canvas = {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
      }),
      clientWidth: 1000,
      clientHeight: 500,
    } as unknown as HTMLCanvasElement;

    const image = {
      naturalWidth: 2000,
      naturalHeight: 2000,
    } as HTMLImageElement;

    const result = getImageCoordinates({ clientX: 500, clientY: 250, canvas, image });

    expect(result).toStrictEqual({ x: 1000, y: 1000 });
  });

  it("applies fitScale correctly when image is wider than canvas (height is the constraining dimension)", () => {
    // 1600*400 image (4:1) in an 800*600 canvas: fitScale = min(800/1600, 600/400) = min(0.5, 1.5) = 0.5
    // Top-left of image in CSS: centre (400, 300) offset by (-naturalWidth/2 * fitScale, -naturalHeight/2 * fitScale)
    //   = (400 - 400, 300 - 100) = (0, 200)
    const canvas = {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
      }),
      clientWidth: 800,
      clientHeight: 600,
    } as unknown as HTMLCanvasElement;

    const image = {
      naturalWidth: 1600,
      naturalHeight: 400,
    } as HTMLImageElement;

    // Cursor at the top-left corner of the displayed image (CSS x=0, y=200)
    const result = getImageCoordinates({ clientX: 0, clientY: 200, canvas, image });

    expect(result).toStrictEqual({ x: 0, y: 0 });
  });

  it("applies fitScale correctly when image is taller than canvas (width is the constraining dimension)", () => {
    // 200*1200 image (1:6) in an 800*600 canvas: fitScale = min(800/200, 600/1200) = min(4, 0.5) = 0.5
    // Top-right of image in CSS: centre (400, 300) offset by (naturalWidth/2 * fitScale, -naturalHeight/2 * fitScale)
    //   = (400 + 50, 300 - 300) = (450, 0)
    const canvas = {
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
      }),
      clientWidth: 800,
      clientHeight: 600,
    } as unknown as HTMLCanvasElement;

    const image = {
      naturalWidth: 200,
      naturalHeight: 1200,
    } as HTMLImageElement;

    // Cursor at the top-right corner of the displayed image (CSS x=450, y=0)
    const result = getImageCoordinates({ clientX: 450, clientY: 0, canvas, image });

    expect(result).toStrictEqual({ x: 200, y: 0 });
  });

  it("maps canvas centre to image centre at zoom=2 with no pan", () => {
    // fitScale = min(800/1600, 600/1200) = 0.5
    // x = (400 - 400 - 0) / (0.5 * 2) + 800 = 0 + 800 = 800
    // y = (300 - 300 - 0) / (0.5 * 2) + 600 = 0 + 600 = 600
    const canvas = {
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      clientWidth: 800,
      clientHeight: 600,
    } as unknown as HTMLCanvasElement;

    const image = { naturalWidth: 1600, naturalHeight: 1200 } as HTMLImageElement;

    const result = getImageCoordinates({
      clientX: 400,
      clientY: 300,
      canvas,
      image,
      zoom: 2,
      pan: { x: 0, y: 0 },
    });

    expect(result).toStrictEqual({ x: 800, y: 600 });
  });

  it("accounts for pan when zoom=1 and image is panned right", () => {
    // pan.x = 100 image pixels right shifts the image right on canvas; the canvas centre now
    // shows image pixel 700 (100px left of centre).
    // fitScale = 0.5
    // x = (400 - 400 - 100*0.5) / (0.5 * 1) + 800 = -50 / 0.5 + 800 = 700
    // y = (300 - 300 - 0) / (0.5 * 1) + 600 = 600
    const canvas = {
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      clientWidth: 800,
      clientHeight: 600,
    } as unknown as HTMLCanvasElement;

    const image = { naturalWidth: 1600, naturalHeight: 1200 } as HTMLImageElement;

    const result = getImageCoordinates({
      clientX: 400,
      clientY: 300,
      canvas,
      image,
      zoom: 1,
      pan: { x: 100, y: 0 },
    });

    expect(result).toStrictEqual({ x: 700, y: 600 });
  });

  it("accounts for both zoom and pan together", () => {
    // fitScale = 0.5, zoom=2, pan.x=100
    // x = (400 - 400 - 100*0.5) / (0.5 * 2) + 800 = -50 / 1 + 800 = 750
    // y = (300 - 300 - 0) / (0.5 * 2) + 600 = 600
    const canvas = {
      getBoundingClientRect: () => ({ left: 0, top: 0 }),
      clientWidth: 800,
      clientHeight: 600,
    } as unknown as HTMLCanvasElement;

    const image = { naturalWidth: 1600, naturalHeight: 1200 } as HTMLImageElement;

    const result = getImageCoordinates({
      clientX: 400,
      clientY: 300,
      canvas,
      image,
      zoom: 2,
      pan: { x: 100, y: 0 },
    });

    expect(result).toStrictEqual({ x: 750, y: 600 });
  });
});

describe(computeIsEdited, () => {
  it("returns true if any edit value differs from defaults", () => {
    const edits = {
      brightness: 120,
      contrast: 80,
      saturate: 150,
      zoom: 1,
      pan: { x: 0, y: 0 },
    };

    expect(computeIsEdited(edits)).toBe(true);
  });

  it("returns false if all edit values are the same as defaults", () => {
    const edits = {
      brightness: 100,
      contrast: 100,
      saturate: 100,
      zoom: 1,
      pan: { x: 0, y: 0 },
    };

    expect(computeIsEdited(edits)).toBe(false);
  });
});

describe(encodeEditPayload, () => {
  it("encodes the edit payload (directory + photo) to a base64 string", () => {
    const data = {
      directory: "/path/to/project",
      photo: {
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
      },
    };

    const encoded = encodeEditPayload(data);

    expectTypeOf(encoded).toBeString();

    expect(decodeEditPayload(encodeEditPayload(data))).toStrictEqual(data);
  });
});

describe(decodeEditPayload, () => {
  it("decodes a base64 string back to the edit payload", () => {
    const data = {
      directory: "/path/to/project",
      photo: {
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
      },
    };

    const encoded = encodeEditPayload(data);
    const decoded = decodeEditPayload(encoded);

    expect(decoded).toStrictEqual(data);
  });

  it("throws when decoded payload does not match the edit payload schema", () => {
    const invalidPayload = Buffer.from(JSON.stringify({ wrong: "shape" }), "utf8").toString(
      "base64",
    );

    expect(() => decodeEditPayload(invalidPayload)).toThrow(/ZodError|invalid_type/);
  });
});

describe("encodeEditPayload and decodeEditPayload round-trip", () => {
  const defaultPhotoBody = {
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
  };

  it.each([
    { label: "basic photo body", name: "photo.jpg", directory: "/path/to/project" },
    { label: "unicode in directory path", name: "photo.jpg", directory: "/Users/foo/émoji/项目" },
    { label: "unicode in filename", name: "テスト画像.png", directory: "/path/to/project" },
    {
      label: "special characters in filename",
      name: "photo (1) [final].jpg",
      directory: "/path/to/project",
    },
    {
      label: "spaces and apostrophe in filename",
      name: "O'la.jpg",
      directory: "/path/to/project",
    },
  ])("round-trips $label", ({ name, directory }) => {
    const data = {
      directory,
      photo: {
        ...defaultPhotoBody,
        name,
        thumbnail: `.thumbnails/${name}`,
      },
    };

    const decoded = decodeEditPayload(encodeEditPayload(data));

    expect(decoded).toStrictEqual(data);
  });
});

describe(isEditWindow, () => {
  it("returns true if window is an edit window", () => {
    const hash = `#${ROUTES.EDIT}`;

    expect(isEditWindow(hash)).toBe(true);
  });

  it("returns false if hash is not an edit window", () => {
    const hash = `#${ROUTES.PROJECT}`;

    expect(isEditWindow(hash)).toBe(false);
  });
});

describe(buildPhotoUrl, () => {
  it("builds a photo URL from a POSIX absolute directory", () => {
    const result = buildPhotoUrl("/Users/admin/project", "photo.jpg");

    expect(result).toBe("photo:///Users/admin/project/photo.jpg");
  });

  it("builds a photo URL from a Windows directory", () => {
    const result = buildPhotoUrl(String.raw`C:\Users\admin\project`, "photo.jpg");

    expect(result).toBe("photo:///C%3A/Users/admin/project/photo.jpg");
  });

  it("encodes spaces in directory and file name", () => {
    const result = buildPhotoUrl("/Users/admin/Photo ID", "my photo.jpg");

    expect(result).toBe("photo:///Users/admin/Photo%20ID/my%20photo.jpg");
  });

  it("encodes special characters in path segments", () => {
    const result = buildPhotoUrl("/path/to/dir#1", "photo?v=2.jpg");

    expect(result).toBe("photo:///path/to/dir%231/photo%3Fv%3D2.jpg");
  });

  it("handles file names that contain path separators", () => {
    const result = buildPhotoUrl("/Users/admin/project", ".thumbnails/photo.jpg");

    expect(result).toBe("photo:///Users/admin/project/.thumbnails/photo.jpg");
  });

  it("produces a URL that round-trips through fileURLToPath", () => {
    const photoUrl = buildPhotoUrl("/Users/admin/Photo ID", "photo.jpg");
    const fileUrl = photoUrl.replace(/^photo:/, "file:");
    const result = url.fileURLToPath(fileUrl);

    expect(result).toBe("/Users/admin/Photo ID/photo.jpg");
  });
});

describe(getProjectDirectoryName, () => {
  it("returns the last segment of a POSIX path", () => {
    expect(getProjectDirectoryName("/Users/admin/foo/bar")).toBe("bar");
  });

  it("returns the last segment of a Windows path", () => {
    expect(getProjectDirectoryName(String.raw`C:\Users\admin\foo\bar`)).toBe("bar");
  });

  it("ignores a trailing POSIX separator", () => {
    expect(getProjectDirectoryName("/Users/admin/foo/bar/")).toBe("bar");
  });

  it("ignores a trailing Windows separator", () => {
    expect(getProjectDirectoryName("C:\\Users\\admin\\foo\\bar\\")).toBe("bar");
  });

  it("handles paths with spaces and unicode characters", () => {
    expect(getProjectDirectoryName("/Users/admin/2024 summer survey")).toBe("2024 summer survey");
    expect(getProjectDirectoryName("/Users/admin/Süßwasser")).toBe("Süßwasser");
  });

  it("handles a single-segment directory name", () => {
    expect(getProjectDirectoryName("bar")).toBe("bar");
  });

  it("handles mixed POSIX and Windows separators", () => {
    expect(getProjectDirectoryName("C:\\Users/admin\\foo/bar")).toBe("bar");
  });

  it("falls back to the input when no segments are found", () => {
    expect(getProjectDirectoryName("")).toBe("");
    expect(getProjectDirectoryName("/")).toBe("/");
    expect(getProjectDirectoryName("///")).toBe("///");
  });
});

describe(getRecentProjectDisplayPath, () => {
  it("strips the project file and folder name from a POSIX path", () => {
    const result = getRecentProjectDisplayPath("/Users/admin/foo/bar/project.photoid");

    expect(result).toBe("/Users/admin/foo");
  });

  it("strips the project file and folder name from a Windows path", () => {
    const result = getRecentProjectDisplayPath(String.raw`C:\Users\admin\foo\bar\project.photoid`);

    expect(result).toBe(String.raw`C:\Users\admin\foo`);
  });

  it("returns the input when there are not enough segments to drop", () => {
    expect(getRecentProjectDisplayPath("project.photoid")).toBe("project.photoid");
    expect(getRecentProjectDisplayPath("bar/project.photoid")).toBe("bar/project.photoid");
  });
});

describe(stripWhitespace, () => {
  it.each([
    ["leading and trailing spaces", "  abc  ", "abc"],
    ["interior space", "abc def", "abcdef"],
    ["narrow no-break space (U+202F)", "abc def", "abcdef"],
    ["non-breaking space (U+00A0)", "abc def", "abcdef"],
    ["tab and newline", "abc\tdef\nghi", "abcdefghi"],
    ["multiple consecutive whitespace characters", "abc \t\n def", "abcdef"],
    ["empty string", "", ""],
    ["whitespace-only string", "   \t\n", ""],
    ["string with no whitespace", "abcdef", "abcdef"],
  ])("strips %s", (_label, input, expected) => {
    expect(stripWhitespace(input)).toBe(expected);
  });
});

describe(getSelectedAnalysisProviders, () => {
  const providerA = { id: "id-a", name: "Provider A", endpoint: "https://a.example.com" };
  const providerB = { id: "id-b", name: "Provider B", endpoint: "https://b.example.com" };

  const createSettings = (selectedAnalysisProviderIds: string[]): SettingsData =>
    ({
      analysisProviders: [providerA, providerB],
      selectedAnalysisProviderIds,
    }) as SettingsData;

  it("returns every selected provider", () => {
    const result = getSelectedAnalysisProviders(createSettings([providerA.id, providerB.id]));

    expect(result).toStrictEqual([providerA, providerB]);
  });

  it("returns only the selected providers", () => {
    const result = getSelectedAnalysisProviders(createSettings([providerB.id]));

    expect(result).toStrictEqual([providerB]);
  });

  it("ignores selected IDs that no longer have a configured provider", () => {
    const result = getSelectedAnalysisProviders(createSettings(["id-gone"]));

    expect(result).toStrictEqual([]);
  });

  it("returns an empty array when nothing is selected", () => {
    expect(getSelectedAnalysisProviders(createSettings([]))).toStrictEqual([]);
  });

  it("returns an empty array when settings have not loaded", () => {
    expect(getSelectedAnalysisProviders(null)).toStrictEqual([]);
    expect(getSelectedAnalysisProviders(undefined)).toStrictEqual([]);
  });
});

describe(getAnalysisProvidersLabel, () => {
  const createProviders = (count: number) =>
    Array.from({ length: count }, (_value, index) => ({
      id: `id-${index}`,
      name: `Provider ${index}`,
      endpoint: `https://${index}.example.com`,
    }));

  it("falls back to a generic label when nothing is selected", () => {
    expect(getAnalysisProvidersLabel([])).toBe("Analysis Provider");
  });

  it("uses the provider name when exactly one is selected", () => {
    expect(getAnalysisProvidersLabel(createProviders(1))).toBe("Provider 0");
  });

  it("counts the providers when more than one is selected", () => {
    expect(getAnalysisProvidersLabel(createProviders(2))).toBe("2 providers selected");
    expect(getAnalysisProvidersLabel(createProviders(5))).toBe("5 providers selected");
  });
});

describe(getProviderLabelVariants, () => {
  const createMatch = (provider: string, rank: number): AnalysisMatchResult => ({
    provider,
    rank,
    id: `${provider}-${rank}`,
    rating: 0.5,
    details: "details",
  });

  it("gives each provider a distinct variant", () => {
    const result = getProviderLabelVariants([
      createMatch("A", 1),
      createMatch("B", 1),
      createMatch("C", 1),
    ]);

    expect([...result.values()]).toStrictEqual(["done", "accent", "sponsors"]);
  });

  it("keys providers by first appearance so a provider keeps one variant across ranks", () => {
    const result = getProviderLabelVariants([
      createMatch("A", 1),
      createMatch("B", 1),
      createMatch("A", 2),
      createMatch("B", 2),
    ]);

    expect(result.size).toBe(2);
    expect(result.get("A")).toBe("done");
    expect(result.get("B")).toBe("accent");
  });

  it("cycles variants when there are more providers than colours", () => {
    const matches = Array.from({ length: PROVIDER_LABEL_VARIANTS.length + 2 }, (_value, index) =>
      createMatch(`Provider ${index}`, 1),
    );

    const result = getProviderLabelVariants(matches);

    expect(result.get("Provider 0")).toBe(PROVIDER_LABEL_VARIANTS[0]);
    expect(result.get(`Provider ${PROVIDER_LABEL_VARIANTS.length}`)).toBe(
      PROVIDER_LABEL_VARIANTS[0],
    );
    expect(result.get(`Provider ${PROVIDER_LABEL_VARIANTS.length + 1}`)).toBe(
      PROVIDER_LABEL_VARIANTS[1],
    );
  });

  it("returns an empty map when there are no matches", () => {
    expect(getProviderLabelVariants([]).size).toBe(0);
  });
});

describe(validateProviderFields, () => {
  const validFields = {
    name: "Provider",
    endpoint: "http://localhost:8080",
    token: "secret",
    tokenLocked: false,
  };

  it("accepts a complete set of fields", () => {
    expect(validateProviderFields(validFields)).toEqual({
      endpointError: null,
      fieldsValid: true,
    });
  });

  it("reports an error and blocks saving for a malformed endpoint", () => {
    const result = validateProviderFields({ ...validFields, endpoint: "not a url" });

    expect(result.endpointError).toBeTruthy();
    expect(result.fieldsValid).toBe(false);
  });

  it("stays silent on an untouched endpoint but still blocks saving", () => {
    expect(validateProviderFields({ ...validFields, endpoint: "   " })).toEqual({
      endpointError: null,
      fieldsValid: false,
    });
  });

  it("blocks saving when the name is only whitespace", () => {
    expect(validateProviderFields({ ...validFields, name: "  " }).fieldsValid).toBe(false);
  });

  it("requires a token unless an existing one is kept", () => {
    expect(validateProviderFields({ ...validFields, token: "" }).fieldsValid).toBe(false);
    expect(
      validateProviderFields({ ...validFields, token: "", tokenLocked: true }).fieldsValid,
    ).toBe(true);
  });

  it("treats a whitespace-only token as missing", () => {
    expect(validateProviderFields({ ...validFields, token: " \t " }).fieldsValid).toBe(false);
  });
});
