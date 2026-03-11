import url from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";

import { ROUTES } from "@/constants";

import {
  buildPhotoUrl,
  chunkArray,
  computeIsEdited,
  decodeEditPayload,
  encodeEditPayload,
  getAlphabetLetter,
  getCanvasFilters,
  getImageCoordinates,
  isEditWindow,
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
    // 1600*400 image (4:1) in an 800*600 canvas — fitScale = min(800/1600, 600/400) = min(0.5, 1.5) = 0.5
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
    // 200*1200 image (1:6) in an 800*600 canvas — fitScale = min(800/200, 600/1200) = min(4, 0.5) = 0.5
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
  it("encodes photo body to base64 string", () => {
    const data = {
      directory: "/path/to/project",
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

    const encoded = encodeEditPayload(data);

    expectTypeOf(encoded).toBeString();

    expect(decodeEditPayload(encodeEditPayload(data))).toStrictEqual(data);
  });
});

describe(decodeEditPayload, () => {
  it("decodes base64 string back to photo body", () => {
    const data = {
      directory: "/path/to/project",
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

    const encoded = encodeEditPayload(data);
    const decoded = decodeEditPayload(encoded);

    expect(decoded).toStrictEqual(data);
  });

  it("throws when decoded payload does not match photo body schema", () => {
    const invalidPayload = Buffer.from(JSON.stringify({ wrong: "shape" }), "utf8").toString(
      "base64",
    );

    expect(() => decodeEditPayload(invalidPayload)).toThrowError(/ZodError|invalid_type/);
  });
});

describe("encodeEditPayload and decodeEditPayload round-trip", () => {
  const defaultPhotoBody = {
    directory: "/path/to/project",
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
    { label: "basic photo body", name: "photo.jpg" },
    { label: "unicode in directory path", name: "photo.jpg", directory: "/Users/foo/émoji/项目" },
    { label: "unicode in filename", name: "テスト画像.png" },
    { label: "special characters in filename", name: "photo (1) [final].jpg" },
    { label: "spaces and apostrophe in filename", name: "O'la.jpg" },
  ])("round-trips $label", ({ name, directory }) => {
    const data = {
      ...defaultPhotoBody,
      directory: directory ?? defaultPhotoBody.directory,
      name,
      thumbnail: `.thumbnails/${name}`,
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
