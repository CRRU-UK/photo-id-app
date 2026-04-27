import type { IpcMainInvokeEvent } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_PHOTO_EDITS, DEFAULT_SETTINGS } from "@/constants";
import type {
  AnalysisMatchResponse,
  AnalysisProviderDraft,
  PhotoBody,
  SettingsData,
} from "@/types";

vi.mock("electron", () => ({}));

const MOCK_UUID = "a0b1c2d3-e4f5-6789-abcd-ef0123456789";

const mockAnalyseMatches =
  vi.fn<
    (options: {
      photos: PhotoBody[];
      settings: { endpoint: string; token: string };
    }) => Promise<AnalysisMatchResponse | null>
  >();
const mockCancelAnalyseMatches = vi.fn<() => void>();

vi.mock("@/backend/analysis", () => ({
  analyseMatches: (...args: Parameters<typeof mockAnalyseMatches>) => mockAnalyseMatches(...args),
  cancelAnalyseMatches: () => mockCancelAnalyseMatches(),
}));

const mockGetSettings = vi.fn<() => Promise<SettingsData>>();
const mockUpdateSettings = vi.fn<(settings: SettingsData) => Promise<void>>();
const mockUpsertAnalysisProvider =
  vi.fn<(settings: SettingsData, providerId: string, provider: unknown) => SettingsData>();
const mockRemoveAnalysisProvider =
  vi.fn<(settings: SettingsData, providerId: string) => SettingsData>();
const mockGetSettingsForRenderer = vi.fn<() => Promise<SettingsData>>();

vi.mock("@/backend/settings", () => ({
  getSettings: () => mockGetSettings(),
  updateSettings: (settings: SettingsData) => mockUpdateSettings(settings),
  upsertAnalysisProvider: (settings: SettingsData, providerId: string, provider: unknown) =>
    mockUpsertAnalysisProvider(settings, providerId, provider),
  removeAnalysisProvider: (settings: SettingsData, providerId: string) =>
    mockRemoveAnalysisProvider(settings, providerId),
  getSettingsForRenderer: () => mockGetSettingsForRenderer(),
}));

const mockSaveToken = vi.fn<(id: string, token: string) => Promise<void>>();
const mockGetToken = vi.fn<(id: string) => Promise<string | null>>();
const mockDeleteToken = vi.fn<(id: string) => Promise<void>>();
const mockIsEncryptionAvailable = vi.fn<() => boolean>();

vi.mock("@/backend/tokens", () => ({
  saveToken: (...args: Parameters<typeof mockSaveToken>) => mockSaveToken(...args),
  getToken: (...args: Parameters<typeof mockGetToken>) => mockGetToken(...args),
  deleteToken: (...args: Parameters<typeof mockDeleteToken>) => mockDeleteToken(...args),
  isEncryptionAvailable: () => mockIsEncryptionAvailable(),
}));

const mockBroadcastToAllWindows = vi.fn<(channel: string, data: unknown) => void>();

vi.mock("./shared", () => ({
  broadcastToAllWindows: (...args: Parameters<typeof mockBroadcastToAllWindows>) =>
    mockBroadcastToAllWindows(...args),
}));

const {
  handleSaveAnalysisProvider,
  handleDeleteAnalysisProvider,
  handleAnalyseMatches,
  handleGetEncryptionAvailability,
} = await import("./analysisHandlers");

const mockEvent = {} as IpcMainInvokeEvent;

const createMockPhotoBody = (overrides: Partial<PhotoBody> = {}): PhotoBody =>
  ({
    directory: "/photos",
    name: "photo.jpg",
    thumbnail: "thumbnail.jpg",
    edits: { ...DEFAULT_PHOTO_EDITS },
    isEdited: false,
    ...overrides,
  }) as PhotoBody;

describe("analysis IPC handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSettings.mockResolvedValue(undefined);
    mockSaveToken.mockResolvedValue(undefined);
    mockDeleteToken.mockResolvedValue(undefined);
  });

  describe(handleSaveAnalysisProvider, () => {
    it("creates a new provider with a generated ID when no ID is provided", async () => {
      const draft: AnalysisProviderDraft = {
        name: "Test Provider",
        endpoint: "https://api.example.com",
        token: "secret-token",
      };
      const settings = { ...DEFAULT_SETTINGS } as SettingsData;
      const updatedSettings = { ...settings } as SettingsData;
      mockGetSettings.mockResolvedValue(settings);
      mockUpsertAnalysisProvider.mockReturnValue(updatedSettings);
      mockGetSettingsForRenderer.mockResolvedValue(updatedSettings);

      await handleSaveAnalysisProvider(mockEvent, draft);

      expect(mockUpsertAnalysisProvider).toHaveBeenCalledWith(
        settings,
        expect.any(String),
        expect.objectContaining({
          name: "Test Provider",
          endpoint: "https://api.example.com",
        }),
      );
      expect(mockSaveToken).toHaveBeenCalledWith(expect.any(String), "secret-token");
      expect(mockUpdateSettings).toHaveBeenCalledWith(updatedSettings);
      expect(mockBroadcastToAllWindows).toHaveBeenCalledWith("ui:settingsUpdated", updatedSettings);
    });

    it("uses the provided ID when updating an existing provider", async () => {
      const draft: AnalysisProviderDraft = {
        id: MOCK_UUID,
        name: "Updated Provider",
        endpoint: "https://api.example.com",
        token: "new-token",
      };
      const settings = { ...DEFAULT_SETTINGS } as SettingsData;
      mockGetSettings.mockResolvedValue(settings);
      mockUpsertAnalysisProvider.mockReturnValue(settings);
      mockGetSettingsForRenderer.mockResolvedValue(settings);

      await handleSaveAnalysisProvider(mockEvent, draft);

      expect(mockUpsertAnalysisProvider).toHaveBeenCalledWith(
        settings,
        MOCK_UUID,
        expect.objectContaining({ id: MOCK_UUID }),
      );
    });

    it("does not save a token when none is provided", async () => {
      const draft: AnalysisProviderDraft = {
        name: "No Token Provider",
        endpoint: "https://api.example.com",
      };
      const settings = { ...DEFAULT_SETTINGS } as SettingsData;
      mockGetSettings.mockResolvedValue(settings);
      mockUpsertAnalysisProvider.mockReturnValue(settings);
      mockGetSettingsForRenderer.mockResolvedValue(settings);

      await handleSaveAnalysisProvider(mockEvent, draft);

      expect(mockSaveToken).not.toHaveBeenCalled();
    });
  });

  describe(handleDeleteAnalysisProvider, () => {
    it("deletes the provider token, updates settings, and broadcasts", async () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        analysisProviders: [{ id: MOCK_UUID, name: "Test", endpoint: "https://api.com" }],
      } as SettingsData;
      const updatedSettings = { ...DEFAULT_SETTINGS } as SettingsData;
      mockGetSettings.mockResolvedValue(settings);
      mockRemoveAnalysisProvider.mockReturnValue(updatedSettings);
      mockGetSettingsForRenderer.mockResolvedValue(updatedSettings);

      await handleDeleteAnalysisProvider(mockEvent, MOCK_UUID);

      expect(mockDeleteToken).toHaveBeenCalledWith(MOCK_UUID);
      expect(mockUpdateSettings).toHaveBeenCalledWith(updatedSettings);
      expect(mockBroadcastToAllWindows).toHaveBeenCalledWith("ui:settingsUpdated", updatedSettings);
    });
  });

  describe(handleAnalyseMatches, () => {
    it("throws when no provider is configured", async () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        selectedAnalysisProviderId: null,
      } as SettingsData;
      mockGetSettings.mockResolvedValue(settings);

      await expect(handleAnalyseMatches(mockEvent, [createMockPhotoBody()])).rejects.toThrow(
        "Analysis provider is not configured.",
      );
    });

    it("throws when the selected provider has no endpoint", async () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        selectedAnalysisProviderId: "provider-1",
        analysisProviders: [{ id: MOCK_UUID, name: "Test", endpoint: "" }],
      } as SettingsData;
      mockGetSettings.mockResolvedValue(settings);

      await expect(handleAnalyseMatches(mockEvent, [createMockPhotoBody()])).rejects.toThrow(
        "Analysis provider is not configured.",
      );
    });

    it("throws when the token is not available", async () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        selectedAnalysisProviderId: MOCK_UUID,
        analysisProviders: [{ id: MOCK_UUID, name: "Test", endpoint: "https://api.com" }],
      } as SettingsData;
      mockGetSettings.mockResolvedValue(settings);
      mockGetToken.mockResolvedValue(null);

      await expect(handleAnalyseMatches(mockEvent, [createMockPhotoBody()])).rejects.toThrow(
        "Analysis API token is not configured or could not be decrypted.",
      );
    });

    it("calls analyseMatches with validated photos and settings", async () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        selectedAnalysisProviderId: MOCK_UUID,
        analysisProviders: [{ id: MOCK_UUID, name: "Test", endpoint: "https://api.com" }],
      } as SettingsData;
      const photo = createMockPhotoBody();
      const mockResponse: AnalysisMatchResponse = { matches: [] };

      mockGetSettings.mockResolvedValue(settings);
      mockGetToken.mockResolvedValue("api-token");
      mockAnalyseMatches.mockResolvedValue(mockResponse);

      const result = await handleAnalyseMatches(mockEvent, [photo]);

      expect(mockAnalyseMatches).toHaveBeenCalledWith({
        photos: [expect.objectContaining({ name: "photo.jpg" })],
        settings: { endpoint: "https://api.com", token: "api-token" },
      });
      expect(result).toBe(mockResponse);
    });
  });

  describe(handleGetEncryptionAvailability, () => {
    it("returns true when encryption is available", () => {
      mockIsEncryptionAvailable.mockReturnValue(true);

      expect(handleGetEncryptionAvailability()).toBe(true);
    });

    it("returns false when encryption is not available", () => {
      mockIsEncryptionAvailable.mockReturnValue(false);

      expect(handleGetEncryptionAvailability()).toBe(false);
    });
  });
});
