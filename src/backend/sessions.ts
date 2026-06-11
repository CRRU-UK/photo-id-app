import path from "node:path";
import url from "node:url";
import { app, net } from "electron";
import {
  installExtension,
  MOBX_DEVTOOLS,
  REACT_DEVELOPER_TOOLS,
} from "electron-devtools-installer";

import { CSP_HEADERS, PHOTO_FILE_EXTENSIONS, PHOTO_PROTOCOL_SCHEME } from "@/constants";

const production = app.isPackaged;

const corsHeaders = { "Access-Control-Allow-Origin": "*" };

interface SetupProjectSessionOptions {
  /** Resolved at request time so the same registration covers the window's whole lifetime. */
  getProjectDirectory: () => string | null;
  session: Electron.Session;
}

/**
 * Registers CSP, permission denial, the `photo://` protocol, and (in dev) DevTools extensions on
 * a per-window session. See ARCHITECTURE.md "Per-window sessions" for the design.
 */
export const setupProjectSession = async ({
  session,
  getProjectDirectory,
}: SetupProjectSessionOptions): Promise<void> => {
  session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [CSP_HEADERS],
        "Document-Policy": ["js-profiling"],
      },
    });
  });

  session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  session.protocol.handle(PHOTO_PROTOCOL_SCHEME, async (request) => {
    try {
      const directory = getProjectDirectory();
      if (directory === null) {
        return new Response(null, { status: 403, headers: corsHeaders });
      }

      const fileUrl = request.url.replace(/^photo:/, "file:");
      const filePath = path.resolve(url.fileURLToPath(fileUrl));

      const extension = path.extname(filePath).toLowerCase();
      if (!PHOTO_FILE_EXTENSIONS.includes(extension)) {
        return new Response(null, { status: 403, headers: corsHeaders });
      }

      const resolvedDirectory = path.resolve(directory);
      if (!filePath.startsWith(resolvedDirectory + path.sep)) {
        return new Response(null, { status: 403, headers: corsHeaders });
      }

      const upstream = await net.fetch(url.pathToFileURL(filePath).toString());
      const headers = new Headers(upstream.headers);
      headers.set("Access-Control-Allow-Origin", "*");

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      });
    } catch {
      return new Response(null, { status: 400, headers: corsHeaders });
    }
  });

  if (!production && !process.env.E2E) {
    try {
      await installExtension([REACT_DEVELOPER_TOOLS, MOBX_DEVTOOLS], { session });
    } catch (error) {
      console.error("Failed to install DevTools extensions:", error);
    }
  }
};
