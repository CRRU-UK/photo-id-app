import fs from "node:fs";
import path from "node:path";
import { app, safeStorage } from "electron";

import { TOKENS_FILE_NAME } from "@/constants";
import { tokenStoreSchema } from "@/schemas";
import type { TokenStore } from "@/types";

const emptyTokenStore = (): TokenStore => ({ tokens: {} });

const getTokensFilePath = (): string => path.join(app.getPath("userData"), TOKENS_FILE_NAME);

/**
 * Reads and validates the token store from disk. Returns an empty store if the file does not exist
 * or is invalid.
 */
const readTokenStore = async (): Promise<TokenStore> => {
  const tokensFile = getTokensFilePath();

  if (!fs.existsSync(tokensFile)) {
    return emptyTokenStore();
  }

  try {
    const data = await fs.promises.readFile(tokensFile, "utf8");
    const parsed = tokenStoreSchema.parse(JSON.parse(data));

    return parsed;
  } catch (error) {
    console.error("Error reading tokens file:", error);

    return emptyTokenStore();
  }
};

/**
 * Writes the token store to disk.
 */
const writeTokenStore = async (store: TokenStore): Promise<void> => {
  const tokensFile = getTokensFilePath();

  await fs.promises.writeFile(tokensFile, JSON.stringify(store, null, 2), "utf8");
};

/**
 * Returns whether safeStorage encryption is currently available on the system.
 *
 * Unsigned dev builds prompt for keychain access on every launch on macOS. Skip safeStorage in dev
 * in dev mode and fall back to plaintext storage.
 */
const isEncryptionAvailable = (): boolean => {
  if (!app.isPackaged) {
    return false;
  }

  return safeStorage.isEncryptionAvailable();
};

/**
 * Saves a token for an analysis provider ID. Encrypts with safeStorage if available, otherwise
 * stores as plaintext.
 */
const saveToken = async (providerId: string, token: string): Promise<void> => {
  const store = await readTokenStore();
  const encrypted = isEncryptionAvailable();

  if (encrypted) {
    const buffer = safeStorage.encryptString(token);
    store.tokens[providerId] = { value: buffer.toString("base64"), encrypted: true };
  } else {
    store.tokens[providerId] = { value: token, encrypted: false };
  }

  await writeTokenStore(store);
};

/**
 * Retrieves and decrypts a token for an analysis provider ID. Returns null if not found or if
 * decryption fails (e.g. OS keychain key has changed).
 */
const getToken = async (providerId: string): Promise<string | null> => {
  const store = await readTokenStore();
  const entry = store.tokens[providerId];

  if (!entry) {
    return null;
  }

  if (entry.encrypted) {
    try {
      const buffer = Buffer.from(entry.value, "base64");
      return safeStorage.decryptString(buffer);
    } catch (error) {
      console.error("Failed to decrypt token for analysis provider:", providerId, error);
      return null;
    }
  }

  return entry.value;
};

/**
 * Removes a token for an analysis provider ID from the store.
 */
const deleteToken = async (providerId: string): Promise<void> => {
  const store = await readTokenStore();

  delete store.tokens[providerId];

  await writeTokenStore(store);
};

export { deleteToken, getToken, isEncryptionAvailable, saveToken };
