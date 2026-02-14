import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { SettingsData } from "@/types";

// Mock the SettingsContext hook
const mockUpdateSettings = vi.fn<(settings: SettingsData) => Promise<void>>();

vi.mock("@/contexts/SettingsContext", () => ({
  useSettings: () => ({
    settings: { themeMode: "dark", telemetry: "disabled" } as SettingsData,
    colorMode: "dark" as const,
    updateSettings: mockUpdateSettings,
  }),
}));

// Import after mocks are set up
const { default: Settings } = await import("./Settings");

const noop = () => vi.fn<() => void>();

describe(Settings, () => {
  // Add electronAPI to the existing window (don't replace the whole window object)
  beforeAll(() => {
    Object.defineProperty(window, "electronAPI", {
      writable: true,
      value: {
        onOpenSettings: vi.fn<() => () => void>(() => vi.fn<() => void>()),
      },
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when open is false", () => {
    const { container } = render(<Settings open={false} onClose={noop()} />);

    expect(container.innerHTML).toBe("");
  });

  it("renders the dialog when open is true", () => {
    render(<Settings open={true} onClose={noop()} />);

    expect(screen.getByText("App Settings")).toBeDefined();
  });

  it("renders theme mode selector with current value", () => {
    render(<Settings open={true} onClose={noop()} />);

    expect(screen.getByText("Theme Mode")).toBeDefined();

    const themeSelect = screen.getByDisplayValue("Dark (Default)");

    expect(themeSelect).toBeDefined();
  });

  it("renders telemetry selector with current value", () => {
    render(<Settings open={true} onClose={noop()} />);

    expect(screen.getByText("Telemetry")).toBeDefined();

    const telemetrySelect = screen.getByDisplayValue("Disabled (Default)");

    expect(telemetrySelect).toBeDefined();
  });

  it("calls updateSettings when theme mode is changed", () => {
    render(<Settings open={true} onClose={noop()} />);

    const themeSelect = screen.getByDisplayValue("Dark (Default)");
    fireEvent.change(themeSelect, { target: { value: "light" } });

    expect(mockUpdateSettings).toHaveBeenCalledWith({
      themeMode: "light",
      telemetry: "disabled",
    });
  });

  it("calls updateSettings when telemetry is changed", () => {
    render(<Settings open={true} onClose={noop()} />);

    const telemetrySelect = screen.getByDisplayValue("Disabled (Default)");
    fireEvent.change(telemetrySelect, { target: { value: "enabled" } });

    expect(mockUpdateSettings).toHaveBeenCalledWith({
      themeMode: "dark",
      telemetry: "enabled",
    });
  });

  it("renders the dialog subtitle", () => {
    render(<Settings open={true} onClose={noop()} />);

    expect(screen.getByText("App settings are per-user and affect all projects.")).toBeDefined();
  });

  it("renders the close button", () => {
    render(<Settings open={true} onClose={noop()} />);

    // "Close" appears in both a tooltip and the button label, so use getAllByText
    const closeElements = screen.getAllByText("Close");

    expect(closeElements.length).toBeGreaterThanOrEqual(1);
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn<() => void>();
    render(<Settings open={true} onClose={onClose} />);

    // Find the actual close button (not the tooltip) via the footer button role
    const buttons = screen.getAllByRole("button");
    const closeButton = buttons.find((button) => button.textContent === "Close");

    expect(closeButton).toBeDefined();

    fireEvent.click(closeButton!);

    expect(onClose).toHaveBeenCalledWith(expect.anything());
  });

  it("renders theme mode options", () => {
    render(<Settings open={true} onClose={noop()} />);

    expect(screen.getByText("Light")).toBeDefined();
    expect(screen.getByText("Dark (Default)")).toBeDefined();
    expect(screen.getByText("Auto")).toBeDefined();
  });

  it("renders telemetry options", () => {
    render(<Settings open={true} onClose={noop()} />);

    expect(screen.getByText("Disabled (Default)")).toBeDefined();
    expect(screen.getByText("Enabled")).toBeDefined();
  });

  it("renders the telemetry restart note", () => {
    render(<Settings open={true} onClose={noop()} />);

    expect(
      screen.getByText("Note: This requires a restart of the app to take effect."),
    ).toBeDefined();
  });

  it("registers onOpenSettings listener when onOpenRequest is provided", () => {
    const onOpenRequest = vi.fn<() => void>();
    render(<Settings open={true} onClose={noop()} onOpenRequest={onOpenRequest} />);

    expect(window.electronAPI.onOpenSettings).toHaveBeenCalledWith(onOpenRequest);
  });
});
