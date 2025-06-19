import { getAlphabetLetter, chunkArray } from "./helpers";

describe("getAlphabetLetter", () => {
  it.each([
    [1, "A"],
    [26, "Z"],
    [27, "AA"],
    [52, "AZ"],
    [53, "BA"],
    [703, "AAA"],
  ])("For %p returns %p", (input, expected) => {
    expect(getAlphabetLetter(input)).toBe(expected);
  });
});

describe("getAlphchunkArrayabetLetter", () => {
  it("Chunks array correctly", () => {
    const input = ["A", "B", "C", "D", "E", "F", "G"];
    const result = chunkArray(input, 3);

    expect(result).toStrictEqual([["A", "B", "C"], ["D", "E", "F"], ["G"]]);
  });

  it("Does not array that is less than given size", () => {
    const input = ["A", "B"];
    const result = chunkArray(input, 3);

    expect(result).toStrictEqual([["A", "B"]]);
  });
});
