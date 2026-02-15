import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Auto-cleanup DOM after each test to prevent state leaking between tests
afterEach(cleanup);

// Mock window.matchMedia which is not available in jsdom but used by Primer React
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

// Mock ResizeObserver which is not available in jsdom but used by Primer React hooks
if (!window.ResizeObserver) {
  class MockResizeObserver {
    observe() {
      return undefined;
    }
    unobserve() {
      return undefined;
    }
    disconnect() {
      return undefined;
    }
  }

  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    value: MockResizeObserver,
  });
}

// Mock adoptedStyleSheets used by Primer's popover polyfill
if (!document.adoptedStyleSheets) {
  Object.defineProperty(document, "adoptedStyleSheets", {
    writable: true,
    value: [],
  });
}
