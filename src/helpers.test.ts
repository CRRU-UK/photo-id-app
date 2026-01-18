import { describe, expect, it } from "vitest";

import { chunkArray, getAlphabetLetter, getBoundaries, getCanvasFilters } from "./helpers";

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
