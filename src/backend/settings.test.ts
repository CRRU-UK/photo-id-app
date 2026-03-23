import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS, SETTINGS_FILE_NAME } from "@/constants";
import type { MLModel, SettingsData } from "@/types";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn<() => string>(() => "/mock/userData"),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn<() => boolean>(() => true),
  },
}));

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

vi.mock("@/backend/tokens", () => ({
  isEncryptionAvailable: () => mockIsEncryptionAvailable(),
}));

const mockSentryInit = vi.fn<(options: Record<string, unknown>) => void>();
const mockConsoleLoggingIntegration = vi.fn<(options: Record<string, unknown>) => string>(
  () => "mockIntegration",
);
const mockClientOptions = { enabled: true };
const mockSentryGetClient = vi.fn<() => { getOptions: () => typeof mockClientOptions } | undefined>(
  () => ({ getOptions: () => mockClientOptions }),
);

vi.mock("@sentry/electron/main", () => ({
  init: (options: Record<string, unknown>) => mockSentryInit(options),
  consoleLoggingIntegration: (options: Record<string, unknown>) =>
    mockConsoleLoggingIntegration(options),
  getClient: () => mockSentryGetClient(),
}));

const {
  getSettings,
  getSettingsForRenderer,
  initSentry,
  removeModel,
  setSentryEnabled,
  updateSettings,
  upsertModel,
} = await import("./settings");

describe("settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe(getSettings, () => {
    it("returns default settings when the file does not exist", async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await getSettings();

      expect(result).toStrictEqual(DEFAULT_SETTINGS);
    });

    it("writes default settings to disk when the file does not exist", async () => {
      mockExistsSync.mockReturnValue(false);

      await getSettings();

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(SETTINGS_FILE_NAME),
        JSON.stringify(DEFAULT_SETTINGS, null, 2),
        "utf8",
      );
    });

    it("reads and returns settings from disk when the file exists", async () => {
      const savedSettings: SettingsData = {
        version: "v1",
        themeMode: "light",
        telemetry: "enabled",
        mlModels: [],
        selectedModelId: null,
        isTokenEncryptionAvailable: true,
      };
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(savedSettings));

      const result = await getSettings();

      expect(result).toStrictEqual(savedSettings);
    });

    it("merges saved settings with defaults to fill missing fields", async () => {
      const partialSettings = { version: "v1" as const, themeMode: "light" as const };
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(partialSettings));

      const result = await getSettings();

      expect(result).toStrictEqual({
        ...DEFAULT_SETTINGS,
        themeMode: "light",
      });
    });

    it("returns default settings when the file contains invalid JSON", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue("not valid json {{{");

      const result = await getSettings();

      expect(result).toStrictEqual(DEFAULT_SETTINGS);
    });

    it("writes default settings when the file contains invalid JSON", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue("not valid json {{{");

      await getSettings();

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(SETTINGS_FILE_NAME),
        JSON.stringify(DEFAULT_SETTINGS, null, 2),
        "utf8",
      );
    });

    it("returns default settings when reading the file throws an error", async () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockRejectedValue(new Error("Permission denied"));

      const result = await getSettings();

      expect(result).toStrictEqual(DEFAULT_SETTINGS);
    });

    it("returns default settings when version is missing", async () => {
      const settingsWithoutVersion = {
        themeMode: "light",
        telemetry: "enabled",
        mlModels: [],
        selectedModelId: null,
      };
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(settingsWithoutVersion));

      const result = await getSettings();

      expect(result).toStrictEqual(DEFAULT_SETTINGS);
    });

    it("returns default settings when a field has an invalid value", async () => {
      const invalidSettings = { version: "v1", themeMode: "neon", telemetry: "enabled" };
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(invalidSettings));

      const result = await getSettings();

      expect(result).toStrictEqual(DEFAULT_SETTINGS);
    });

    it("writes default settings when a field has an invalid value", async () => {
      const invalidSettings = { themeMode: "dark", telemetry: 42 };
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(invalidSettings));

      await getSettings();

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(SETTINGS_FILE_NAME),
        JSON.stringify(DEFAULT_SETTINGS, null, 2),
        "utf8",
      );
    });
  });

  describe(getSettingsForRenderer, () => {
    it("includes isTokenEncryptionAvailable from safeStorage", async () => {
      mockExistsSync.mockReturnValue(false);
      mockIsEncryptionAvailable.mockReturnValue(false);

      const result = await getSettingsForRenderer();

      expect(result.isTokenEncryptionAvailable).toBe(false);
    });

    it("returns true for isTokenEncryptionAvailable when encryption is available", async () => {
      mockExistsSync.mockReturnValue(false);
      mockIsEncryptionAvailable.mockReturnValue(true);

      const result = await getSettingsForRenderer();

      expect(result.isTokenEncryptionAvailable).toBe(true);
    });

    it("overrides a stale false value on disk when encryption is available", async () => {
      const savedSettings: SettingsData = {
        version: "v1",
        themeMode: "dark",
        telemetry: "disabled",
        mlModels: [],
        selectedModelId: null,
        isTokenEncryptionAvailable: false,
      };
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(savedSettings));
      mockIsEncryptionAvailable.mockReturnValue(true);

      const result = await getSettingsForRenderer();

      expect(result.isTokenEncryptionAvailable).toBe(true);
    });
  });

  describe(upsertModel, () => {
    const modelA: MLModel = {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Model A",
      endpoint: "https://a.com",
    };
    const modelB: MLModel = {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Model B",
      endpoint: "https://b.com",
    };

    it("adds a new model when no model with that ID exists", () => {
      const settings: SettingsData = { ...DEFAULT_SETTINGS, mlModels: [] };

      const result = upsertModel(settings, modelA.id, modelA);

      expect(result.mlModels).toHaveLength(1);
      expect(result.mlModels[0]).toStrictEqual(modelA);
    });

    it("replaces an existing model when a model with that ID already exists", () => {
      const updated: MLModel = { ...modelA, name: "Updated Name", endpoint: "https://new.com" };
      const settings: SettingsData = { ...DEFAULT_SETTINGS, mlModels: [modelA] };

      const result = upsertModel(settings, modelA.id, updated);

      expect(result.mlModels).toHaveLength(1);
      expect(result.mlModels[0]).toStrictEqual(updated);
    });

    it("preserves other models when adding a new one", () => {
      const settings: SettingsData = { ...DEFAULT_SETTINGS, mlModels: [modelA] };

      const result = upsertModel(settings, modelB.id, modelB);

      expect(result.mlModels).toHaveLength(2);
      expect(result.mlModels[0]).toStrictEqual(modelA);
      expect(result.mlModels[1]).toStrictEqual(modelB);
    });

    it("does not mutate the original settings", () => {
      const settings: SettingsData = { ...DEFAULT_SETTINGS, mlModels: [] };

      upsertModel(settings, modelA.id, modelA);

      expect(settings.mlModels).toHaveLength(0);
    });
  });

  describe(removeModel, () => {
    const modelA: MLModel = {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Model A",
      endpoint: "https://a.com",
    };
    const modelB: MLModel = {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Model B",
      endpoint: "https://b.com",
    };

    it("removes the model with the given ID", () => {
      const settings: SettingsData = { ...DEFAULT_SETTINGS, mlModels: [modelA] };

      const result = removeModel(settings, modelA.id);

      expect(result.mlModels).toHaveLength(0);
    });

    it("preserves other models when removing", () => {
      const settings: SettingsData = { ...DEFAULT_SETTINGS, mlModels: [modelA, modelB] };

      const result = removeModel(settings, modelA.id);

      expect(result.mlModels).toHaveLength(1);
      expect(result.mlModels[0]).toStrictEqual(modelB);
    });

    it("clears selectedModelId when removing the selected model", () => {
      const settings: SettingsData = {
        ...DEFAULT_SETTINGS,
        mlModels: [modelA],
        selectedModelId: modelA.id,
      };

      const result = removeModel(settings, modelA.id);

      expect(result.selectedModelId).toBeNull();
    });

    it("preserves selectedModelId when removing a different model", () => {
      const settings: SettingsData = {
        ...DEFAULT_SETTINGS,
        mlModels: [modelA, modelB],
        selectedModelId: modelA.id,
      };

      const result = removeModel(settings, modelB.id);

      expect(result.selectedModelId).toBe(modelA.id);
    });

    it("does not mutate the original settings", () => {
      const settings: SettingsData = { ...DEFAULT_SETTINGS, mlModels: [modelA] };

      removeModel(settings, modelA.id);

      expect(settings.mlModels).toHaveLength(1);
    });
  });

  describe(updateSettings, () => {
    it("writes settings as formatted JSON to the correct file", async () => {
      const settings: SettingsData = {
        version: "v1",
        themeMode: "auto",
        telemetry: "disabled",
        mlModels: [],
        selectedModelId: null,
        isTokenEncryptionAvailable: true,
      };

      await updateSettings(settings);

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(SETTINGS_FILE_NAME),
        JSON.stringify(settings, null, 2),
        "utf8",
      );
    });

    it("writes to the userData path", async () => {
      await updateSettings(DEFAULT_SETTINGS);

      const writtenPath = mockWriteFile.mock.calls[0][0];

      expect(writtenPath).toMatch(/^\/mock\/userData/);
    });
  });

  describe(initSentry, () => {
    it("initialises Sentry with enabled false when DSN is set", () => {
      const originalEnv = process.env.SENTRY_DSN;
      process.env.SENTRY_DSN = "https://test@sentry.io/123";

      initSentry();

      expect(mockSentryInit).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: "https://test@sentry.io/123",
          enabled: false,
          enableRendererProfiling: true,
        }),
      );
      expect(mockConsoleLoggingIntegration).toHaveBeenCalledWith({
        levels: ["log", "warn", "error"],
      });

      process.env.SENTRY_DSN = originalEnv;
    });

    it("does not initialise Sentry when DSN is not set", () => {
      const originalEnv = process.env.SENTRY_DSN;
      delete process.env.SENTRY_DSN;

      initSentry();

      expect(mockSentryInit).not.toHaveBeenCalled();

      process.env.SENTRY_DSN = originalEnv;
    });
  });

  describe(setSentryEnabled, () => {
    it("enables Sentry on the live client", () => {
      mockClientOptions.enabled = false;

      setSentryEnabled("enabled");

      expect(mockClientOptions.enabled).toBe(true);
    });

    it("disables Sentry on the live client", () => {
      mockClientOptions.enabled = true;

      setSentryEnabled("disabled");

      expect(mockClientOptions.enabled).toBe(false);
    });

    it("does not throw when there is no Sentry client", () => {
      mockSentryGetClient.mockReturnValueOnce(undefined as never);

      expect(() => setSentryEnabled("enabled")).not.toThrow();
    });
  });
});
