# Security

This document describes the security model of the Photo ID app.

## Renderer Isolation

The renderer process has no direct access to Node.js APIs. All system access is mediated through the preload script (`src/preload.ts`), which exposes a limited API via `contextBridge.exposeInMainWorld()`.

- `nodeIntegration: false` - Node.js APIs are not available in the renderer
- `contextIsolation: true` - The preload script runs in an isolated context
- `sandbox: true` - OS-level sandboxing is enabled
- `webSecurity: true` - Same-origin policy is enforced
- `allowRunningInsecureContent: false` - Mixed content is blocked
- `setWindowOpenHandler(() => ({ action: "deny" }))` - Prevents arbitrary window creation
- `will-navigate` handler - Blocks navigation to arbitrary URLs from the renderer

## Content Security Policy

A Content Security Policy (CSP) is applied to all renderer responses via `session.defaultSession.webRequest.onHeadersReceived`. The policy restricts script sources to `'self'`, image sources to the app origin and the custom `photo://` protocol, and connections to the app origin and Sentry (when telemetry is enabled).

## Custom Protocol (`photo://`)

All image rendering in the renderer uses the custom `photo://` protocol instead of `file://`. The protocol handler in the main process:

1. Validates that the requested file extension is in the allowlist (`PHOTO_FILE_EXTENSIONS`)
2. Validates that the resolved file path is within the current project directory (path traversal protection)
3. Returns 403 for any request that fails validation

## Path Traversal Protection

Backend file operations (duplicate, export, thumbnail generation, ML analysis) use `resolvePhotoPath()` to validate that constructed file paths do not escape the project directory. This guards against tampered project JSON containing traversal sequences (e.g. `../../`) in photo filenames.

## External Links

The renderer cannot open arbitrary URLs in the default browser. External link requests pass through `resolveExternalLinkUrl()`, which maps enum values to a hardcoded allowlist of URLs. Unrecognised values are silently ignored.

## Token Security

ML model API tokens are encrypted at rest using Electron's `safeStorage` API and stored in a separate `tokens.json` file in the app user data directory. Tokens are decrypted only at the moment of an API request and never sent to the renderer. Per-token encryption flags handle edge cases where encryption availability changes between sessions. On machines where secure storage is unavailable, tokens fall back to plaintext storage with a UI warning.

## Electron Fuses

Production builds use Electron Fuses to disable potentially dangerous features:

- `RunAsNode: false` - Prevents using the app binary as a Node.js runtime
- `EnableNodeOptionsEnvironmentVariable: false` - Blocks `NODE_OPTIONS`
- `EnableNodeCliInspectArguments: false` - Blocks debugging flags
- `EnableEmbeddedAsarIntegrityValidation: true` - Validates ASAR archive integrity
- `OnlyLoadAppFromAsar: true` - Only loads code from the packaged archive
- `EnableCookieEncryption: true` - Encrypts cookies at rest

## Input Validation

All data crossing process boundaries is validated with Zod schemas (`src/schemas.ts`):

- Project files are validated on load via `parseProjectFile()`
- Settings and token files are validated on read with their respective schemas
- IPC payloads are validated in handlers before processing
- ML API responses are validated with `mlMatchResponseSchema`

## Reporting Security Issues

If you discover a security vulnerability, please report it by opening a private issue or contacting the maintainers directly rather than disclosing it publicly.
