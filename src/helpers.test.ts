import { describe, it, expect } from "vitest";

import { getAlphabetLetter, chunkArray, readFileAsString } from "./helpers";

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

describe(readFileAsString, () => {
  it("reads a file", async () => {
    const content = new Uint8Array([1, 2, 3]);
    const blob = new Blob([content]);
    const file = new File([blob], "mock-file.txt");

    const result = await readFileAsString(file);

    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(result)).toStrictEqual(content);
  });
});
