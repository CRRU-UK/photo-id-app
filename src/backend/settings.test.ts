import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS, SETTINGS_FILE_NAME } from "@/constants";
import type { AnalysisProvider, SettingsData } from "@/types";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn<() => string>(() => "/mock/userData"),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn<() => boolean>(() => true),
  },
}));

const mockExistsSync = vi.fn<(path: string) => boolean>();
const mockReadFileSync = vi.fn<(path: string, encoding: string) => string>();
const mockReadFile = vi.fn<(path: string, encoding: string) => Promise<string>>();
const mockWriteFile = vi.fn<(path: string, data: string, encoding: string) => Promise<void>>();

vi.mock("node:fs", () => ({
  default: {
    existsSync: (...args: Parameters<typeof mockExistsSync>) => mockExistsSync(...args),
    readFileSync: (...args: Parameters<typeof mockReadFileSync>) => mockReadFileSync(...args),
    promises: {
      readFile: (...args: Parameters<typeof mockReadFile>) => mockReadFile(...args),
      writeFile: (...args: Parameters<typeof mockWriteFile>) => mockWriteFile(...args),
    },
  },
}));

const mockSentryInit = vi.fn<(options: Record<string, unknown>) => void>();
const mockConsoleLoggingIntegration = vi.fn<(options: Record<string, unknown>) => string>(
  () => "mockIntegration",
);

vi.mock("@sentry/electron/main", () => ({
  init: (options: Record<string, unknown>) => mockSentryInit(options),
  consoleLoggingIntegration: (options: Record<string, unknown>) =>
    mockConsoleLoggingIntegration(options),
}));

const {
  getSettings,
  getSettingsForRenderer,
  getTelemetrySync,
  initSentry,
  removeAnalysisProvider,
  updateSettings,
  upsertAnalysisProvider,
} = await import("./settings");

describe("settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();

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
        analysisProviders: [],
        selectedAnalysisProviderId: null,
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
        analysisProviders: [],
        selectedAnalysisProviderId: null,
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
    it("returns the settings from disk", async () => {
      mockExistsSync.mockReturnValue(false);

      const result = await getSettingsForRenderer();

      expect(result).toStrictEqual(DEFAULT_SETTINGS);
    });
  });

  describe(upsertAnalysisProvider, () => {
    const providerA: AnalysisProvider = {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Provider A",
      endpoint: "https://a.com",
    };
    const providerB: AnalysisProvider = {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Provider B",
      endpoint: "https://b.com",
    };

    it("adds a new provider when no provider with that ID exists", () => {
      const settings: SettingsData = { ...DEFAULT_SETTINGS, analysisProviders: [] };

      const result = upsertAnalysisProvider(settings, providerA.id, providerA);

      expect(result.analysisProviders).toHaveLength(1);
      expect(result.analysisProviders[0]).toStrictEqual(providerA);
    });

    it("replaces an existing provider when a provider with that ID already exists", () => {
      const updated: AnalysisProvider = {
        ...providerA,
        name: "Updated Name",
        endpoint: "https://new.com",
      };
      const settings: SettingsData = { ...DEFAULT_SETTINGS, analysisProviders: [providerA] };

      const result = upsertAnalysisProvider(settings, providerA.id, updated);

      expect(result.analysisProviders).toHaveLength(1);
      expect(result.analysisProviders[0]).toStrictEqual(updated);
    });

    it("preserves other providers when adding a new one", () => {
      const settings: SettingsData = { ...DEFAULT_SETTINGS, analysisProviders: [providerA] };

      const result = upsertAnalysisProvider(settings, providerB.id, providerB);

      expect(result.analysisProviders).toHaveLength(2);
      expect(result.analysisProviders[0]).toStrictEqual(providerA);
      expect(result.analysisProviders[1]).toStrictEqual(providerB);
    });

    it("does not mutate the original settings", () => {
      const settings: SettingsData = { ...DEFAULT_SETTINGS, analysisProviders: [] };

      upsertAnalysisProvider(settings, providerA.id, providerA);

      expect(settings.analysisProviders).toHaveLength(0);
    });
  });

  describe(removeAnalysisProvider, () => {
    const providerA: AnalysisProvider = {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Provider A",
      endpoint: "https://a.com",
    };
    const providerB: AnalysisProvider = {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Provider B",
      endpoint: "https://b.com",
    };

    it("removes the provider with the given ID", () => {
      const settings: SettingsData = { ...DEFAULT_SETTINGS, analysisProviders: [providerA] };

      const result = removeAnalysisProvider(settings, providerA.id);

      expect(result.analysisProviders).toHaveLength(0);
    });

    it("preserves other providers when removing", () => {
      const settings: SettingsData = {
        ...DEFAULT_SETTINGS,
        analysisProviders: [providerA, providerB],
      };

      const result = removeAnalysisProvider(settings, providerA.id);

      expect(result.analysisProviders).toHaveLength(1);
      expect(result.analysisProviders[0]).toStrictEqual(providerB);
    });

    it("clears selectedAnalysisProviderId when removing the selected provider", () => {
      const settings: SettingsData = {
        ...DEFAULT_SETTINGS,
        analysisProviders: [providerA],
        selectedAnalysisProviderId: providerA.id,
      };

      const result = removeAnalysisProvider(settings, providerA.id);

      expect(result.selectedAnalysisProviderId).toBeNull();
    });

    it("preserves selectedAnalysisProviderId when removing a different provider", () => {
      const settings: SettingsData = {
        ...DEFAULT_SETTINGS,
        analysisProviders: [providerA, providerB],
        selectedAnalysisProviderId: providerA.id,
      };

      const result = removeAnalysisProvider(settings, providerB.id);

      expect(result.selectedAnalysisProviderId).toBe(providerA.id);
    });

    it("does not mutate the original settings", () => {
      const settings: SettingsData = { ...DEFAULT_SETTINGS, analysisProviders: [providerA] };

      removeAnalysisProvider(settings, providerA.id);

      expect(settings.analysisProviders).toHaveLength(1);
    });
  });

  describe(updateSettings, () => {
    it("writes settings as formatted JSON to the correct file", async () => {
      const settings: SettingsData = {
        version: "v1",
        themeMode: "auto",
        telemetry: "disabled",
        analysisProviders: [],
        selectedAnalysisProviderId: null,
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

  describe(getTelemetrySync, () => {
    it("returns disabled when the settings file does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      expect(getTelemetrySync()).toBe("disabled");
    });

    it("returns the telemetry value from the settings file", () => {
      const savedSettings: SettingsData = {
        version: "v1",
        themeMode: "dark",
        telemetry: "enabled",
        analysisProviders: [],
        selectedAnalysisProviderId: null,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(savedSettings));

      expect(getTelemetrySync()).toBe("enabled");
    });

    it("returns disabled when the settings file contains invalid JSON", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue("not valid json {{{");

      expect(getTelemetrySync()).toBe("disabled");
    });

    it("returns disabled when readFileSync throws an error", () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockImplementation(() => {
        throw new Error("Permission denied");
      });

      expect(getTelemetrySync()).toBe("disabled");
    });
  });

  describe(initSentry, () => {
    it("initialises Sentry with enabled true when telemetry setting is enabled", () => {
      vi.stubEnv("SENTRY_DSN", "https://test@sentry.io/123");

      const savedSettings: SettingsData = {
        version: "v1",
        themeMode: "dark",
        telemetry: "enabled",
        analysisProviders: [],
        selectedAnalysisProviderId: null,
      };

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify(savedSettings));

      initSentry();

      expect(mockSentryInit).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: "https://test@sentry.io/123",
          enabled: true,
          enableRendererProfiling: true,
        }),
      );

      expect(mockConsoleLoggingIntegration).toHaveBeenCalledWith({
        levels: ["log", "warn", "error"],
      });
    });

    it("initialises Sentry with enabled false when settings file is missing", () => {
      vi.stubEnv("SENTRY_DSN", "https://test@sentry.io/123");

      mockExistsSync.mockReturnValue(false);

      initSentry();

      expect(mockSentryInit).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: "https://test@sentry.io/123",
          enabled: false,
        }),
      );
    });

    it("does not initialise Sentry when DSN is not set", () => {
      delete process.env.SENTRY_DSN;

      initSentry();

      expect(mockSentryInit).not.toHaveBeenCalled();
    });
  });
});
