import { beforeEach, describe, expect, it, vi } from "vitest";

import { CSP_HEADERS } from "@/constants";

type HeadersHandler = (
  details: { responseHeaders?: Record<string, unknown> },
  callback: (result: { responseHeaders: Record<string, unknown> }) => void,
) => void;

interface MockSession {
  // Captured handlers
  capturedHeadersHandler: HeadersHandler | null;
  capturedPermissionHandler:
    | ((webContents: unknown, permission: unknown, callback: (allow: boolean) => void) => void)
    | null;
  capturedProtocolHandler: ((request: { url: string }) => Promise<Response>) | null;
  protocol: {
    handle: ReturnType<typeof vi.fn>;
  };
  setPermissionRequestHandler: ReturnType<typeof vi.fn>;
  webRequest: {
    onHeadersReceived: ReturnType<typeof vi.fn>;
  };
}

const createMockSession = (): MockSession => {
  const session: MockSession = {
    webRequest: {
      onHeadersReceived: vi.fn((handler) => {
        session.capturedHeadersHandler = handler;
      }),
    },
    setPermissionRequestHandler: vi.fn((handler) => {
      session.capturedPermissionHandler = handler;
    }),
    protocol: {
      handle: vi.fn((_scheme, handler) => {
        session.capturedProtocolHandler = handler;
      }),
    },
    capturedHeadersHandler: null,
    capturedPermissionHandler: null,
    capturedProtocolHandler: null,
  };
  return session;
};

const mockNetFetch = vi.fn<(input: string) => Promise<Response>>();
const mockInstallExtension = vi.fn<() => Promise<unknown>>();

vi.mock("electron", () => ({
  app: { isPackaged: false },
  net: {
    fetch: (...args: Parameters<typeof mockNetFetch>) => mockNetFetch(...args),
  },
}));

vi.mock("electron-devtools-installer", () => ({
  installExtension: (...args: unknown[]) => mockInstallExtension(...(args as [])),
  REACT_DEVELOPER_TOOLS: "react-id",
  MOBX_DEVTOOLS: "mobx-id",
}));

const { setupProjectSession } = await import("./sessions");

describe("setupProjectSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.E2E;
  });

  describe("CSP", () => {
    it("attaches a Content-Security-Policy header to renderer responses", () => {
      const session = createMockSession();
      setupProjectSession({
        session: session as unknown as Electron.Session,
        getProjectDirectory: () => "/project",
      });

      let captured: { responseHeaders: Record<string, unknown> } | null = null;
      session.capturedHeadersHandler?.({ responseHeaders: { existing: ["yes"] } }, (result) => {
        captured = result;
      });

      expect(captured).toEqual({
        responseHeaders: {
          existing: ["yes"],
          "Content-Security-Policy": [CSP_HEADERS],
          "Document-Policy": ["js-profiling"],
        },
      });
    });
  });

  describe("permission handler", () => {
    it("denies every permission request", () => {
      const session = createMockSession();
      setupProjectSession({
        session: session as unknown as Electron.Session,
        getProjectDirectory: () => "/project",
      });

      const allow = vi.fn<(grant: boolean) => void>();
      session.capturedPermissionHandler?.(null, "media", allow);

      expect(allow).toHaveBeenCalledWith(false);
    });
  });

  describe("photo:// handler", () => {
    const callProtocol = async (
      session: MockSession,
      requestUrl: string,
    ): Promise<Response | null> => {
      if (!session.capturedProtocolHandler) {
        return null;
      }
      return session.capturedProtocolHandler({ url: requestUrl });
    };

    it("returns 403 when the window has no project loaded", async () => {
      const session = createMockSession();
      setupProjectSession({
        session: session as unknown as Electron.Session,
        getProjectDirectory: () => null,
      });

      const response = await callProtocol(session, "photo:///project/photo.jpg");
      expect(response?.status).toBe(403);
    });

    it("returns 403 for a file extension outside the allow-list", async () => {
      const session = createMockSession();
      setupProjectSession({
        session: session as unknown as Electron.Session,
        getProjectDirectory: () => "/project",
      });

      const response = await callProtocol(session, "photo:///project/secret.txt");
      expect(response?.status).toBe(403);
    });

    it("returns 403 when the path escapes the project directory", async () => {
      const session = createMockSession();
      setupProjectSession({
        session: session as unknown as Electron.Session,
        getProjectDirectory: () => "/project",
      });

      const response = await callProtocol(session, "photo:///elsewhere/photo.jpg");
      expect(response?.status).toBe(403);
      expect(mockNetFetch).not.toHaveBeenCalled();
    });

    it("returns 403 for a path inside a different window's project directory", async () => {
      // The handler closes over `getProjectDirectory`. A photo:// request bound to this session
      // can only resolve files inside this window's project, even if another window has another
      // project open — that other project is unknown here.
      const session = createMockSession();
      setupProjectSession({
        session: session as unknown as Electron.Session,
        getProjectDirectory: () => "/project-a",
      });

      const response = await callProtocol(session, "photo:///project-b/photo.jpg");
      expect(response?.status).toBe(403);
    });

    it("serves files inside the project directory through net.fetch", async () => {
      mockNetFetch.mockResolvedValue(
        new Response("body", { status: 200, statusText: "OK", headers: { "X-Custom": "1" } }),
      );
      const session = createMockSession();
      setupProjectSession({
        session: session as unknown as Electron.Session,
        getProjectDirectory: () => "/project",
      });

      const response = await callProtocol(session, "photo:///project/photo.jpg");

      expect(mockNetFetch).toHaveBeenCalledWith(
        expect.stringMatching(/^file:.*\/project\/photo\.jpg$/),
      );
      expect(response?.status).toBe(200);
      expect(response?.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("re-evaluates the project directory on each request", async () => {
      let current: string | null = null;
      const session = createMockSession();
      setupProjectSession({
        session: session as unknown as Electron.Session,
        getProjectDirectory: () => current,
      });

      // First request: idle window, no project
      let response = await callProtocol(session, "photo:///project/photo.jpg");
      expect(response?.status).toBe(403);

      // Project loads
      current = "/project";
      mockNetFetch.mockResolvedValue(new Response("body", { status: 200 }));
      response = await callProtocol(session, "photo:///project/photo.jpg");
      expect(response?.status).toBe(200);
    });

    it("returns 400 when the request URL cannot be parsed", async () => {
      const session = createMockSession();
      setupProjectSession({
        session: session as unknown as Electron.Session,
        getProjectDirectory: () => "/project",
      });

      const response = await callProtocol(session, "photo://not a valid url");
      expect(response?.status).toBe(400);
    });
  });

  describe("DevTools extensions", () => {
    it("installs React and MobX devtools into the session in development", () => {
      const session = createMockSession();
      setupProjectSession({
        session: session as unknown as Electron.Session,
        getProjectDirectory: () => "/project",
      });

      expect(mockInstallExtension).toHaveBeenCalledWith(["react-id", "mobx-id"], {
        session,
      });
    });

    it("skips DevTools installation when running under E2E", () => {
      process.env.E2E = "1";
      const session = createMockSession();
      setupProjectSession({
        session: session as unknown as Electron.Session,
        getProjectDirectory: () => "/project",
      });

      expect(mockInstallExtension).not.toHaveBeenCalled();
    });
  });
});
