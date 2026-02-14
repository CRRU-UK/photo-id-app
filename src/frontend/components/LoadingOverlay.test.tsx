import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { LoadingData } from "@/types";

import LoadingOverlay from "./LoadingOverlay";

describe(LoadingOverlay, () => {
  it("renders nothing when show is false", () => {
    const data: LoadingData = { show: false };
    const { container } = render(<LoadingOverlay data={data} />);

    expect(container.innerHTML).toBe("");
  });

  it("renders the loading container when show is true", () => {
    const data: LoadingData = { show: true };
    const { container } = render(<LoadingOverlay data={data} />);

    expect(container.querySelector(".loading")).not.toBeNull();
  });

  it("does not render a progress bar when no progress value is provided", () => {
    const data: LoadingData = { show: true };
    render(<LoadingOverlay data={data} />);

    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("renders text when provided", () => {
    const data: LoadingData = { show: true, text: "Loading project" };
    render(<LoadingOverlay data={data} />);

    expect(screen.getByText("Loading project")).toBeDefined();
  });

  it("does not render text when not provided", () => {
    const data: LoadingData = { show: true };
    render(<LoadingOverlay data={data} />);

    expect(screen.queryByText("Loading project")).toBeNull();
  });

  it("renders a progress bar when progressValue is provided", () => {
    const data: LoadingData = { show: true, progressValue: 75 };
    render(<LoadingOverlay data={data} />);

    expect(screen.getByRole("progressbar")).toBeDefined();
  });

  it("renders a progress bar with zero value", () => {
    const data: LoadingData = { show: true, progressValue: 0 };
    render(<LoadingOverlay data={data} />);

    expect(screen.getByRole("progressbar")).toBeDefined();
  });

  it("renders progress text when provided alongside progressValue", () => {
    const data: LoadingData = {
      show: true,
      progressValue: 50,
      progressText: "Processing photo 3 of 10",
    };
    render(<LoadingOverlay data={data} />);

    expect(screen.getByText("Processing photo 3 of 10")).toBeDefined();
  });

  it("does not render progress text when only progressValue is provided", () => {
    const data: LoadingData = { show: true, progressValue: 50 };
    render(<LoadingOverlay data={data} />);

    expect(screen.queryByText(/Processing/)).toBeNull();
  });

  it("renders both text and progress bar together", () => {
    const data: LoadingData = {
      show: true,
      text: "Preparing project",
      progressValue: 25,
      progressText: "Processing photo 1 of 4",
    };
    render(<LoadingOverlay data={data} />);

    expect(screen.getByText("Preparing project")).toBeDefined();
    expect(screen.getByRole("progressbar")).toBeDefined();
    expect(screen.getByText("Processing photo 1 of 4")).toBeDefined();
  });

  it("renders null progress value as spinner mode", () => {
    const data: LoadingData = { show: true, progressValue: null };
    render(<LoadingOverlay data={data} />);

    // When progressValue is explicitly null, should show spinner (no progress bar)
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
