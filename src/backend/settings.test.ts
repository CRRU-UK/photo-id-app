import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS, SETTINGS_FILE_NAME } from "@/constants";
import type { SettingsData } from "@/types";

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn<() => string>(() => "/mock/userData"),
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

const { getSettings, initSentry, setSentryEnabled, updateSettings } = await import("./settings");

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
        themeMode: "light",
        telemetry: "enabled",
        mlModels: [],
        selectedModelId: null,
      };
      mockExistsSync.mockReturnValue(true);
      mockReadFile.mockResolvedValue(JSON.stringify(savedSettings));

      const result = await getSettings();

      expect(result).toStrictEqual(savedSettings);
    });

    it("merges saved settings with defaults to fill missing fields", async () => {
      // Simulate a settings file with only one field
      const partialSettings = { themeMode: "light" };
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

    it("returns default settings when a field has an invalid value", async () => {
      const invalidSettings = { themeMode: "neon", telemetry: "enabled" };
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

  describe(updateSettings, () => {
    it("writes settings as formatted JSON to the correct file", async () => {
      const settings: SettingsData = {
        themeMode: "auto",
        telemetry: "disabled",
        mlModels: [],
        selectedModelId: null,
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

      expect(() => setSentryEnabled("enabled")).not.toThrowError();
    });
  });
});
