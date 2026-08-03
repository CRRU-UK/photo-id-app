import { describe, expect, it } from "vitest";

import { nextDuplicateBaseName } from "@/backend/duplicateNames";
import { DUPLICATE_LIMIT_ERROR } from "@/constants";

describe(nextDuplicateBaseName, () => {
  describe("CRRU names", () => {
    it("advances the counter digit in place", () => {
      const result = nextDuplicateBaseName("20240708_1420_ABC", ["20240708_1420_ABC"]);

      expect(result).toBe("20240708_1421_ABC");
    });

    it("continues from the highest counter in use without filling gaps", () => {
      const result = nextDuplicateBaseName("20240708_1420_ABC", [
        "20240708_1420_ABC",
        "20240708_1421_ABC",
        "20240708_1423_ABC",
      ]);

      expect(result).toBe("20240708_1424_ABC");
    });

    it("advances from the source when its own file is missing from the directory", () => {
      const result = nextDuplicateBaseName("20240708_1423_ABC", []);

      expect(result).toBe("20240708_1424_ABC");
    });

    it("throws once the counter is exhausted", () => {
      expect(() =>
        nextDuplicateBaseName("20240708_1420_ABC", ["20240708_1420_ABC", "20240708_1429_ABC"]),
      ).toThrow(DUPLICATE_LIMIT_ERROR);
    });

    it("throws when duplicating the last available counter", () => {
      expect(() => nextDuplicateBaseName("20240708_1429_ABC", ["20240708_1429_ABC"])).toThrow(
        DUPLICATE_LIMIT_ERROR,
      );
    });

    it("ignores names with a different identifier suffix", () => {
      const result = nextDuplicateBaseName("20240708_1420_ABC", [
        "20240708_1420_ABC",
        "20240708_1425_XYZ",
      ]);

      expect(result).toBe("20240708_1421_ABC");
    });

    it("ignores names with a different date or number prefix", () => {
      const result = nextDuplicateBaseName("20240708_1420_ABC", [
        "20240708_1420_ABC",
        "20240709_1426_ABC",
        "20240708_1436_ABC",
      ]);

      expect(result).toBe("20240708_1421_ABC");
    });
  });

  describe("other names", () => {
    it("appends a counter", () => {
      const result = nextDuplicateBaseName("IMG_1234", ["IMG_1234"]);

      expect(result).toBe("IMG_1234_2");
    });

    it("continues from the highest counter in use", () => {
      const result = nextDuplicateBaseName("IMG_1234", ["IMG_1234", "IMG_1234_2", "IMG_1234_3"]);

      expect(result).toBe("IMG_1234_4");
    });

    it("has no counter ceiling", () => {
      const result = nextDuplicateBaseName("IMG_1234", ["IMG_1234", "IMG_1234_9"]);

      expect(result).toBe("IMG_1234_10");
    });

    it("extends the family when duplicating a duplicate instead of nesting", () => {
      const result = nextDuplicateBaseName("IMG_1234_2", ["IMG_1234", "IMG_1234_2"]);

      expect(result).toBe("IMG_1234_3");
    });

    it("keeps a camera name ending in digits intact", () => {
      const result = nextDuplicateBaseName("DSC_0001", ["DSC_0001", "DSC_0002"]);

      expect(result).toBe("DSC_0001_2");
    });

    it("ignores names that only share a prefix", () => {
      const result = nextDuplicateBaseName("IMG_1234", [
        "IMG_1234",
        "IMG_12345",
        "IMG_1234_notacounter",
      ]);

      expect(result).toBe("IMG_1234_2");
    });

    it("handles a name with no separator", () => {
      const result = nextDuplicateBaseName("photo", ["photo"]);

      expect(result).toBe("photo_2");
    });

    it("handles an empty directory listing", () => {
      const result = nextDuplicateBaseName("photo", []);

      expect(result).toBe("photo_2");
    });
  });
});
