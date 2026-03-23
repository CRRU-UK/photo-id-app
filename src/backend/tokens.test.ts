import { beforeEach, describe, expect, it, vi } from "vitest";

import { TOKENS_FILE_NAME } from "@/constants";
import type { TokenStore } from "@/types";

const mockExistsSync = vi.fn<(path: string) => boolean>();
const mockReadFile = vi.fn<(path: string, encoding: string) => Promise<string>>();
const mockWriteFile = vi.fn<(path: string, data: string, encoding: string) => Promise<void>>();

vi.mock("node:fs", () => ({
  default: {
    existsSync: (...args: Parameters<typeof mockExistsSync>) => mockExistsSync(...args),
    promises: {
      readFile: (...args: Parameters<typeof mockReadFile>) => mockReadFile(...args),
      writeFile: (...args: Parameters<typeof mockWriteFile>) => mockWriteFile(...args),
    },
  },
}));

const mockIsEncryptionAvailable = vi.fn<() => boolean>(() => true);
const mockEncryptString = vi.fn<(text: string) => Buffer>((text: string) =>
  Buffer.from(`encrypted:${text}`),
);
const mockDecryptString = vi.fn<(buffer: Buffer) => string>((buffer: Buffer) => {
  const str = buffer.toString();

  if (str.startsWith("encrypted:")) {
    return str.slice("encrypted:".length);
  }

  throw new Error("Decryption failed");
});

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn<() => string>(() => "/mock/userData"),
  },
  safeStorage: {
    isEncryptionAvailable: () => mockIsEncryptionAvailable(),
    encryptString: (text: string) => mockEncryptString(text),
    decryptString: (buffer: Buffer) => mockDecryptString(buffer),
  },
}));

const { deleteToken, getToken, isEncryptionAvailable, saveToken } = await import("./tokens");

describe("tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
    mockIsEncryptionAvailable.mockReturnValue(true);
  });

  describe(isEncryptionAvailable, () => {
    it("returns true when safeStorage encryption is available", () => {
      mockIsEncryptionAvailable.mockReturnValue(true);

      expect(isEncryptionAvailable()).toBe(true);
    });

    it("returns false when safeStorage encryption is not available", () => {
      mockIsEncryptionAvailable.mockReturnValue(false);

      expect(isEncryptionAvailable()).toBe(false);
    });
  });

  describe(saveToken, () => {
    it("encrypts and stores a token when encryption is available", async () => {
      mockExistsSync.mockReturnValue(false);

      await saveToken("model-1", "my-secret-token");

      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]) as TokenStore;

      expect(writtenData.tokens["model-1"].encrypted).toBe(true);
      expect(writtenData.tokens["model-1"].value).toBe(
        Buffer.from("encrypted:my-secret-token").toString("base64"),
      );
    });

    it("stores a token as plaintext when encryption is not available", async () => {
      mockIsEncryptionAvailable.mockReturnValue(false);
      mockExistsSync.mockReturnValue(false);

      await saveToken("model-1", "my-secret-token");

      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]) as TokenStore;

      expect(writtenData.tokens["model-1"].encrypted).toBe(false);
      expect(writtenData.tokens["model-1"].value).toBe("my-secret-token");
    });

    it("overwrites an existing token for the same model ID", async () => {
      const existingStore = {
        tokens: { "model-1": { value: "old-value", encrypted: false } },
      };
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(existingStore));

      await saveToken("model-1", "new-token");

      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]) as TokenStore;

      expect(writtenData.tokens["model-1"].encrypted).toBe(true);
    });

    it("preserves tokens for other models when saving", async () => {
      const existingStore = {
        tokens: { "model-1": { value: "existing-value", encrypted: false } },
      };
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(existingStore));

      await saveToken("model-2", "another-token");

      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]) as TokenStore;

      expect(writtenData.tokens["model-1"]).toStrictEqual({
        value: "existing-value",
        encrypted: false,
      });
      expect(writtenData.tokens["model-2"]).toBeDefined();
    });

    it("writes to the userData path", async () => {
      mockExistsSync.mockReturnValue(false);

      await saveToken("model-1", "token");

      const writtenPath = mockWriteFile.mock.calls[0][0];

      expect(writtenPath).toMatch(/^\/mock\/userData/);
      expect(writtenPath).toContain(TOKENS_FILE_NAME);
    });
  });

  describe(getToken, () => {
    it("decrypts and returns an encrypted token", async () => {
      const encryptedValue = Buffer.from("encrypted:my-secret-token").toString("base64");
      const store = {
        tokens: { "model-1": { value: encryptedValue, encrypted: true } },
      };
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(store));

      const result = await getToken("model-1");

      expect(result).toBe("my-secret-token");
    });

    it("returns a plaintext token without decryption", async () => {
      const store = {
        tokens: { "model-1": { value: "plain-token", encrypted: false } },
      };
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(store));

      const result = await getToken("model-1");

      expect(result).toBe("plain-token");
      expect(mockDecryptString).not.toHaveBeenCalled();
    });

    it("returns null for a non-existent model ID", async () => {
      const store = { tokens: {} };
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(store));

      const result = await getToken("non-existent");

      expect(result).toBeNull();
    });

    it("returns null when the tokens file does not exist", async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await getToken("model-1");

      expect(result).toBeNull();
    });

    it("returns null when decryption fails", async () => {
      const store = {
        tokens: { "model-1": { value: "bad-encrypted-data", encrypted: true } },
      };
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(store));

      const result = await getToken("model-1");

      expect(result).toBeNull();
    });
  });

  describe(deleteToken, () => {
    it("removes a token from the store", async () => {
      const store = {
        tokens: {
          "model-1": { value: "token-1", encrypted: false },
          "model-2": { value: "token-2", encrypted: false },
        },
      };
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(store));

      await deleteToken("model-1");

      const writtenData = JSON.parse(mockWriteFile.mock.calls[0][1]) as TokenStore;

      expect(writtenData.tokens["model-1"]).toBeUndefined();
      expect(writtenData.tokens["model-2"]).toStrictEqual({ value: "token-2", encrypted: false });
    });

    it("does not throw when deleting a non-existent model ID", async () => {
      mockExistsSync.mockReturnValue(false);

      await expect(deleteToken("non-existent")).resolves.not.toThrow();
    });
  });

  describe("readTokenStore", () => {
    it("returns an empty store when the file contains invalid JSON", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue("not valid json {{{");

      const result = await getToken("model-1");

      expect(result).toBeNull();
    });

    it("returns an empty store when reading the file throws an error", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockRejectedValue(new Error("Permission denied"));

      const result = await getToken("model-1");

      expect(result).toBeNull();
    });
  });
});
