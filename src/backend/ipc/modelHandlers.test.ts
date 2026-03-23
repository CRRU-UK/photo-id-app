import type { IpcMainInvokeEvent } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_PHOTO_EDITS, DEFAULT_SETTINGS } from "@/constants";
import type { MLMatchResponse, MLModelDraft, PhotoBody, SettingsData } from "@/types";

vi.mock("electron", () => ({}));

const MOCK_UUID = "a0b1c2d3-e4f5-6789-abcd-ef0123456789";

const mockAnalyseStack =
  vi.fn<
    (options: {
      photos: PhotoBody[];
      settings: { endpoint: string; token: string };
    }) => Promise<MLMatchResponse | null>
  >();
const mockCancelAnalyseStack = vi.fn<() => void>();

vi.mock("@/backend/model", () => ({
  analyseStack: (...args: Parameters<typeof mockAnalyseStack>) => mockAnalyseStack(...args),
  cancelAnalyseStack: () => mockCancelAnalyseStack(),
}));

const mockGetSettings = vi.fn<() => Promise<SettingsData>>();
const mockUpdateSettings = vi.fn<(settings: SettingsData) => Promise<void>>();
const mockUpsertModel =
  vi.fn<(settings: SettingsData, modelId: string, model: unknown) => SettingsData>();
const mockRemoveModel = vi.fn<(settings: SettingsData, modelId: string) => SettingsData>();
const mockGetSettingsForRenderer = vi.fn<() => Promise<SettingsData>>();

vi.mock("@/backend/settings", () => ({
  getSettings: () => mockGetSettings(),
  updateSettings: (settings: SettingsData) => mockUpdateSettings(settings),
  upsertModel: (settings: SettingsData, modelId: string, model: unknown) =>
    mockUpsertModel(settings, modelId, model),
  removeModel: (settings: SettingsData, modelId: string) => mockRemoveModel(settings, modelId),
  getSettingsForRenderer: () => mockGetSettingsForRenderer(),
}));

const mockSaveToken = vi.fn<(id: string, token: string) => Promise<void>>();
const mockGetToken = vi.fn<(id: string) => Promise<string | null>>();
const mockDeleteToken = vi.fn<(id: string) => Promise<void>>();

vi.mock("@/backend/tokens", () => ({
  saveToken: (...args: Parameters<typeof mockSaveToken>) => mockSaveToken(...args),
  getToken: (...args: Parameters<typeof mockGetToken>) => mockGetToken(...args),
  deleteToken: (...args: Parameters<typeof mockDeleteToken>) => mockDeleteToken(...args),
}));

const mockBroadcastToAllWindows = vi.fn<(channel: string, data: unknown) => void>();

vi.mock("./shared", () => ({
  broadcastToAllWindows: (...args: Parameters<typeof mockBroadcastToAllWindows>) =>
    mockBroadcastToAllWindows(...args),
}));

const { handleSaveModel, handleDeleteModel, handleAnalyseStack } = await import("./modelHandlers");

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

describe("model IPC handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSettings.mockResolvedValue(undefined);
    mockSaveToken.mockResolvedValue(undefined);
    mockDeleteToken.mockResolvedValue(undefined);
  });

  describe(handleSaveModel, () => {
    it("creates a new model with a generated ID when no ID is provided", async () => {
      const draft: MLModelDraft = {
        name: "Test Model",
        endpoint: "https://api.example.com",
        token: "secret-token",
      };
      const settings = { ...DEFAULT_SETTINGS } as SettingsData;
      const updatedSettings = { ...settings } as SettingsData;
      mockGetSettings.mockResolvedValue(settings);
      mockUpsertModel.mockReturnValue(updatedSettings);
      mockGetSettingsForRenderer.mockResolvedValue(updatedSettings);

      await handleSaveModel(mockEvent, draft);

      expect(mockUpsertModel).toHaveBeenCalledWith(
        settings,
        expect.any(String),
        expect.objectContaining({
          name: "Test Model",
          endpoint: "https://api.example.com",
        }),
      );
      expect(mockSaveToken).toHaveBeenCalledWith(expect.any(String), "secret-token");
      expect(mockUpdateSettings).toHaveBeenCalledWith(updatedSettings);
      expect(mockBroadcastToAllWindows).toHaveBeenCalledWith("ui:settingsUpdated", updatedSettings);
    });

    it("uses the provided ID when updating an existing model", async () => {
      const draft: MLModelDraft = {
        id: MOCK_UUID,
        name: "Updated Model",
        endpoint: "https://api.example.com",
        token: "new-token",
      };
      const settings = { ...DEFAULT_SETTINGS } as SettingsData;
      mockGetSettings.mockResolvedValue(settings);
      mockUpsertModel.mockReturnValue(settings);
      mockGetSettingsForRenderer.mockResolvedValue(settings);

      await handleSaveModel(mockEvent, draft);

      expect(mockUpsertModel).toHaveBeenCalledWith(
        settings,
        MOCK_UUID,
        expect.objectContaining({ id: MOCK_UUID }),
      );
    });

    it("does not save a token when none is provided", async () => {
      const draft: MLModelDraft = {
        name: "No Token Model",
        endpoint: "https://api.example.com",
      };
      const settings = { ...DEFAULT_SETTINGS } as SettingsData;
      mockGetSettings.mockResolvedValue(settings);
      mockUpsertModel.mockReturnValue(settings);
      mockGetSettingsForRenderer.mockResolvedValue(settings);

      await handleSaveModel(mockEvent, draft);

      expect(mockSaveToken).not.toHaveBeenCalled();
    });
  });

  describe(handleDeleteModel, () => {
    it("deletes the model token, updates settings, and broadcasts", async () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        mlModels: [{ id: MOCK_UUID, name: "Test", endpoint: "https://api.com" }],
      } as SettingsData;
      const updatedSettings = { ...DEFAULT_SETTINGS } as SettingsData;
      mockGetSettings.mockResolvedValue(settings);
      mockRemoveModel.mockReturnValue(updatedSettings);
      mockGetSettingsForRenderer.mockResolvedValue(updatedSettings);

      await handleDeleteModel(mockEvent, MOCK_UUID);

      expect(mockDeleteToken).toHaveBeenCalledWith(MOCK_UUID);
      expect(mockUpdateSettings).toHaveBeenCalledWith(updatedSettings);
      expect(mockBroadcastToAllWindows).toHaveBeenCalledWith("ui:settingsUpdated", updatedSettings);
    });
  });

  describe(handleAnalyseStack, () => {
    it("throws when no model is configured", async () => {
      const settings = { ...DEFAULT_SETTINGS, selectedModelId: null } as SettingsData;
      mockGetSettings.mockResolvedValue(settings);

      await expect(handleAnalyseStack(mockEvent, [createMockPhotoBody()])).rejects.toThrow(
        "Machine Learning integration is not configured.",
      );
    });

    it("throws when the selected model has no endpoint", async () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        selectedModelId: "model-1",
        mlModels: [{ id: MOCK_UUID, name: "Test", endpoint: "" }],
      } as SettingsData;
      mockGetSettings.mockResolvedValue(settings);

      await expect(handleAnalyseStack(mockEvent, [createMockPhotoBody()])).rejects.toThrow(
        "Machine Learning integration is not configured.",
      );
    });

    it("throws when the token is not available", async () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        selectedModelId: MOCK_UUID,
        mlModels: [{ id: MOCK_UUID, name: "Test", endpoint: "https://api.com" }],
      } as SettingsData;
      mockGetSettings.mockResolvedValue(settings);
      mockGetToken.mockResolvedValue(null);

      await expect(handleAnalyseStack(mockEvent, [createMockPhotoBody()])).rejects.toThrow(
        "Machine Learning API token is not configured or could not be decrypted.",
      );
    });

    it("calls analyseStack with validated photos and settings", async () => {
      const settings = {
        ...DEFAULT_SETTINGS,
        selectedModelId: MOCK_UUID,
        mlModels: [{ id: MOCK_UUID, name: "Test", endpoint: "https://api.com" }],
      } as SettingsData;
      const photo = createMockPhotoBody();
      const mockResponse: MLMatchResponse = { matches: [] };

      mockGetSettings.mockResolvedValue(settings);
      mockGetToken.mockResolvedValue("api-token");
      mockAnalyseStack.mockResolvedValue(mockResponse);

      const result = await handleAnalyseStack(mockEvent, [photo]);

      expect(mockAnalyseStack).toHaveBeenCalledWith({
        photos: [expect.objectContaining({ name: "photo.jpg" })],
        settings: { endpoint: "https://api.com", token: "api-token" },
      });
      expect(result).toBe(mockResponse);
    });
  });
});
