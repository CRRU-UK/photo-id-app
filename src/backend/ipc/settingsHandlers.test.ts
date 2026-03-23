/* eslint-disable @typescript-eslint/unbound-method */

import type { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from "electron";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS } from "@/constants";
import type { ExternalLinks, SettingsData } from "@/types";

const mockOpenExternal = vi.fn<(url: string) => Promise<void>>();

vi.mock("electron", () => ({
  shell: {
    openExternal: (...args: Parameters<typeof mockOpenExternal>) => mockOpenExternal(...args),
  },
}));

const mockGetSettingsForRenderer = vi.fn<() => Promise<SettingsData>>();
const mockUpdateSettings = vi.fn<(settings: SettingsData) => Promise<void>>();
const mockSetSentryEnabled = vi.fn<(enabled: string) => void>();

vi.mock("@/backend/settings", () => ({
  getSettingsForRenderer: () => mockGetSettingsForRenderer(),
  updateSettings: (...args: Parameters<typeof mockUpdateSettings>) => mockUpdateSettings(...args),
  setSentryEnabled: (...args: Parameters<typeof mockSetSentryEnabled>) =>
    mockSetSentryEnabled(...args),
}));

const mockGetMainWindow = vi.fn<() => BrowserWindow | null>();

vi.mock("@/backend/WindowManager", () => ({
  windowManager: {
    getMainWindow: () => mockGetMainWindow(),
  },
}));

const mockBroadcastToAllWindows = vi.fn<(channel: string, data: unknown) => void>();
const mockResolveExternalLinkUrl = vi.fn<(link: ExternalLinks) => string | undefined>();

vi.mock("./shared", () => ({
  broadcastToAllWindows: (...args: Parameters<typeof mockBroadcastToAllWindows>) =>
    mockBroadcastToAllWindows(...args),
  resolveExternalLinkUrl: (...args: Parameters<typeof mockResolveExternalLinkUrl>) =>
    mockResolveExternalLinkUrl(...args),
}));

const { handleGetSettings, handleUpdateSettings, handleOpenSettings, handleOpenExternalLink } =
  await import("./settingsHandlers");

const createMockWindow = (): BrowserWindow =>
  ({
    focus: vi.fn<() => void>(),
    webContents: { send: vi.fn<(channel: string, ...args: unknown[]) => void>() },
  }) as unknown as BrowserWindow;

describe("settings IPC handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe(handleGetSettings, () => {
    it("returns settings from the renderer helper", async () => {
      const mockSettings = { ...DEFAULT_SETTINGS } as SettingsData;
      mockGetSettingsForRenderer.mockResolvedValue(mockSettings);

      const result = await handleGetSettings();

      expect(result).toBe(mockSettings);
    });
  });

  describe(handleUpdateSettings, () => {
    it("validates, updates, and broadcasts settings", async () => {
      const settings = { ...DEFAULT_SETTINGS } as SettingsData;
      const enrichedSettings = {
        ...DEFAULT_SETTINGS,
        isTokenEncryptionAvailable: true,
      } as SettingsData;
      mockUpdateSettings.mockResolvedValue(undefined);
      mockGetSettingsForRenderer.mockResolvedValue(enrichedSettings);

      await handleUpdateSettings({} as IpcMainInvokeEvent, settings);

      expect(mockUpdateSettings).toHaveBeenCalledWith(settings);
      expect(mockSetSentryEnabled).toHaveBeenCalledWith(settings.telemetry);
      expect(mockBroadcastToAllWindows).toHaveBeenCalledWith(
        "ui:settingsUpdated",
        enrichedSettings,
      );
    });

    it("throws when settings fail validation", async () => {
      const invalidSettings = { invalid: true } as unknown as SettingsData;

      await expect(
        handleUpdateSettings({} as IpcMainInvokeEvent, invalidSettings),
      ).rejects.toThrow(/invalid/i);
    });
  });

  describe(handleOpenSettings, () => {
    it("focuses the main window and sends the open settings event", () => {
      const mockWindow = createMockWindow();
      mockGetMainWindow.mockReturnValue(mockWindow);

      handleOpenSettings();

      expect(mockWindow.focus).toHaveBeenCalledWith();
      expect(mockWindow.webContents.send).toHaveBeenCalledWith("ui:openSettings");
    });

    it("does nothing when there is no main window", () => {
      mockGetMainWindow.mockReturnValue(null);

      expect(() => handleOpenSettings()).not.toThrow();
    });
  });

  describe(handleOpenExternalLink, () => {
    it("opens the resolved URL in the default browser", () => {
      mockResolveExternalLinkUrl.mockReturnValue("https://example.com");

      handleOpenExternalLink({} as IpcMainEvent, "website");

      expect(mockOpenExternal).toHaveBeenCalledWith("https://example.com");
    });

    it("does not open anything when the link is not recognised", () => {
      mockResolveExternalLinkUrl.mockReturnValue(undefined);

      handleOpenExternalLink({} as IpcMainEvent, "unknown" as ExternalLinks);

      expect(mockOpenExternal).not.toHaveBeenCalled();
    });
  });
});
