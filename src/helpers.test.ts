import url from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";

import { ROUTES } from "@/constants";

import {
  buildPhotoUrl,
  chunkArray,
  clampPan,
  computeIsEdited,
  decodeEditPayload,
  encodeEditPayload,
  getAlphabetLetter,
  getBoundaries,
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

describe(getBoundaries, () => {
  it("calculates boundaries when image is larger than canvas", () => {
    const result = getBoundaries(400, 800);

    expect(result).toStrictEqual({ min: -200, max: 200 });
  });

  it("calculates boundaries when image is smaller than canvas", () => {
    const result = getBoundaries(800, 400);

    expect(result).toStrictEqual({ min: 200, max: -200 });
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

    const result = getImageCoordinates({ screenX: 500, screenY: 350, canvas, image });

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

    const result = getImageCoordinates({ screenX: 400, screenY: 250, canvas, image });

    expect(result).toStrictEqual({ x: 400, y: 300 });
  });

  it("returns null when canvas is null", () => {
    const image = {
      naturalWidth: 800,
      naturalHeight: 600,
    } as HTMLImageElement;

    const result = getImageCoordinates({
      screenX: 100,
      screenY: 100,
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
      screenX: 100,
      screenY: 100,
      canvas,
      image: null as unknown as HTMLImageElement,
    });

    expect(result).toBeNull();
  });

  it("handles different aspect ratios correctly", () => {
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

    const result = getImageCoordinates({ screenX: 500, screenY: 250, canvas, image });

    expect(result).toStrictEqual({ x: 1000, y: 1000 });
  });
});

describe(clampPan, () => {
  it("returns pan unchanged when within bounds", () => {
    const pan = { x: 50, y: 75 };
    const result = clampPan({
      pan,
      canvas: { width: 800, height: 600 },
      scaledImage: { width: 1000, height: 800 },
    });

    expect(result).toStrictEqual({ x: 50, y: 75 });
  });

  it("clamps pan.x to max when exceeding upper bound", () => {
    const pan = { x: 200, y: 0 };
    const result = clampPan({
      pan,
      canvas: { width: 800, height: 600 },
      scaledImage: { width: 1000, height: 800 },
    });

    expect(result).toStrictEqual({ x: 100, y: 0 });
  });

  it("clamps pan.x to min when below lower bound", () => {
    const pan = { x: -200, y: 0 };
    const result = clampPan({
      pan,
      canvas: { width: 800, height: 600 },
      scaledImage: { width: 1000, height: 800 },
    });

    expect(result).toStrictEqual({ x: -100, y: 0 });
  });

  it("clamps pan.y to max when exceeding upper bound", () => {
    const pan = { x: 0, y: 200 };
    const result = clampPan({
      pan,
      canvas: { width: 800, height: 600 },
      scaledImage: { width: 1000, height: 800 },
    });

    expect(result).toStrictEqual({ x: 0, y: 100 });
  });

  it("clamps pan.y to min when below lower bound", () => {
    const pan = { x: 0, y: -200 };
    const result = clampPan({
      pan,
      canvas: { width: 800, height: 600 },
      scaledImage: { width: 1000, height: 800 },
    });

    expect(result).toStrictEqual({ x: 0, y: -100 });
  });

  it("clamps both x and y when both exceed bounds", () => {
    const pan = { x: 300, y: 300 };
    const result = clampPan({
      pan,
      canvas: { width: 800, height: 600 },
      scaledImage: { width: 1000, height: 800 },
    });

    expect(result).toStrictEqual({ x: 100, y: 100 });
  });

  it("handles image smaller than canvas", () => {
    const pan = { x: 0, y: 0 };
    const result = clampPan({
      pan,
      canvas: { width: 800, height: 600 },
      scaledImage: { width: 400, height: 300 },
    });

    expect(result).toStrictEqual({ x: 200, y: 150 });
  });

  it("handles image exactly same size as canvas", () => {
    const pan = { x: 100, y: 100 };
    const result = clampPan({
      pan,
      canvas: { width: 800, height: 600 },
      scaledImage: { width: 800, height: 600 },
    });

    expect(result).toStrictEqual({ x: 0, y: 0 });
  });

  it("handles pan at exact boundary values", () => {
    const pan = { x: 100, y: 100 };
    const result = clampPan({
      pan,
      canvas: { width: 800, height: 600 },
      scaledImage: { width: 1000, height: 800 },
    });

    expect(result).toStrictEqual({ x: 100, y: 100 });
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
