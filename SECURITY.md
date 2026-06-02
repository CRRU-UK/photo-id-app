# Security

This document describes the security model of the Photo ID app.

## Renderer Isolation

The renderer process has no direct access to Node.js APIs. All system access is mediated through the preload scripts, which expose a limited API via `contextBridge.exposeInMainWorld()`. Project windows use `src/preload.ts` (full API surface). Edit windows use the narrower `src/preload-editor.ts`, which only exposes the IPC the editor actually needs (project/settings bootstrap, photo save/navigation, analysis) — anything that mutates project data, opens new windows, or interacts with the home/project screens is intentionally absent so a compromised editor renderer cannot reach those handlers.

- `nodeIntegration: false` - Node.js APIs are not available in the renderer
- `contextIsolation: true` - The preload script runs in an isolated context
- `sandbox: true` - OS-level sandboxing is enabled
- `webSecurity: true` - Same-origin policy is enforced
- `allowRunningInsecureContent: false` - Mixed content is blocked
- `setWindowOpenHandler(() => ({ action: "deny" }))` - Prevents arbitrary window creation
- `will-navigate` handler - Blocks navigation to arbitrary URLs from the renderer
- `setPermissionRequestHandler` - Denies all renderer permission requests (camera, geolocation, notifications, media). The app does not use these capabilities

## Content Security Policy

A Content Security Policy (CSP) is applied to all renderer responses via `session.defaultSession.webRequest.onHeadersReceived`. The policy restricts script sources to `'self'`, image sources to the app origin and the custom `photo://` protocol, and connections to the app origin and Sentry (when telemetry is enabled).

The `style-src` directive includes `'unsafe-inline'` because the Primer React component library applies runtime inline styles for layout and theming. This is a known trade-off as removing `'unsafe-inline'` would require a nonce-based approach that Primer does not currently support. The risk is mitigated by the strict `script-src 'self'` policy, which prevents injected inline styles from executing code.

## Custom Protocol (`photo://`)

All image rendering in the renderer uses the custom `photo://` protocol instead of `file://`. The protocol handler in the main process:

1. Validates that the requested file extension is in the allowlist (`PHOTO_FILE_EXTENSIONS`)
2. Validates that the resolved file path is within **at least one currently-open project directory** (path traversal protection)
3. Returns 403 for any request that fails validation

The scheme is registered with `corsEnabled: true` and responses set `Access-Control-Allow-Origin: *` so the edit window can `fetch()` full-size image bytes cross-origin (the renderer is loaded from the Vite dev server in development and `file://` in production - both are cross-origin to `photo://`). Cross-origin access to a custom protocol requires `corsEnabled` since [electron/electron#51152](https://github.com/electron/electron/pull/51152) as the path-traversal and extension checks above continue to gate which files are served.

### Multi-window validation model

The app can have multiple project windows open simultaneously. The protocol handler validates the requested path against the **union** of all open project directories (via `windowManager.getAllProjectDirectories()`). Electron's `protocol.handle` callback does not expose the requesting `webContents`, so the handler cannot scope the check to "the requesting window's project."

**This is a deliberate trade-off**: while projects A and B are simultaneously open, a renderer for A can request a thumbnail from B's directory and the protocol serves it.

**Why this is acceptable**: every open project is opened by the user via the OS file picker, file association, or the recent-projects list, so every directory in the set is equally user-authorised. There is no per-project secret or per-project access control elsewhere in the app - analysis tokens and settings are global, not project-scoped - so cross-project file access does not unlock any data the user has not already opened. The trust boundary is "any file inside any project the user has open right now," and the protocol enforces that.

**What this is NOT defending against**: a compromised renderer in project A's window crafting `photo://` URLs pointing at project B's files. Stricter per-window isolation would require per-session `partition`s (each project window with its own Electron `Session` and a per-session protocol handler bound to that session's project directory), at the cost of re-registering the CSP / permission handlers and re-attaching `installExtension` calls per session. This is only worth implementing if the app gains per-project secrets (encrypted project files, per-project tokens, etc.).

**What this IS defending against and what the validation enforces**: file paths that escape any open project directory (path traversal), file extensions outside the allow-list, and any request when no project is open at all (403).

## Path Traversal Protection

Backend file operations (duplicate, export, thumbnail generation, analysis) use `resolvePhotoPath()` to validate that constructed file paths do not escape the project directory. This guards against tampered project JSON containing traversal sequences (e.g. `../../`) in photo filenames.

## External Links

The renderer cannot open arbitrary URLs in the default browser. External link requests pass through `resolveExternalLinkUrl()`, which maps enum values to a hardcoded allowlist of URLs. Unrecognised values are silently ignored.

## Token Security

Analysis provider API tokens are encrypted at rest using Electron's `safeStorage` API and stored in a separate `tokens.json` file in the app user data directory. Tokens are decrypted only at the moment of an API request and never sent to the renderer. Per-token encryption flags handle edge cases where encryption availability changes between sessions. On machines where secure storage is unavailable, tokens fall back to plaintext storage with a UI warning.

## macOS Entitlements

`entitlements.mac.plist` declares the OS-level capabilities the app is permitted to use under the macOS hardened runtime. The declared entitlements are kept to a minimum and only for what the app actively requires:

- `com.apple.security.cs.allow-jit` - Required for Electron's V8 JIT compiler to function under the hardened runtime
- `com.apple.security.cs.allow-unsigned-executable-memory` - Required for Electron's renderer process memory model
- `com.apple.security.cs.disable-library-validation` - Required to load `@napi-rs/canvas` native binaries, which are not signed by the same Developer ID as the app
- `keychain-access-groups` - Binds the `safeStorage` keychain item ACL to the Team ID rather than a specific binary hash, so a user's "Always Allow" keychain permission persists across app updates, as long as the same Developer ID certificate is used

Any future features that requires additional system access (camera, microphone, file access beyond user-selected, etc.) must add the corresponding entitlement to `entitlements.mac.plist` as part of that feature's implementation. The `appBundleId` in `forge.config.ts` must stay in sync with the bundle ID used in the `keychain-access-groups` value.

## Electron Fuses

Production builds use Electron Fuses to disable potentially dangerous features:

- `RunAsNode: false` - Prevents using the app binary as a Node.js runtime
- `EnableNodeOptionsEnvironmentVariable: false` - Blocks `NODE_OPTIONS`
- `EnableNodeCliInspectArguments: false` - Blocks debugging flags
- `EnableEmbeddedAsarIntegrityValidation` - Validates ASAR archive integrity (disabled on Windows where code signing modifies the binary after integrity checksums are embedded, which invalidates them)
- `OnlyLoadAppFromAsar: true` - Only loads code from the packaged archive
- `EnableCookieEncryption: true` - Encrypts cookies at rest

## Input Validation

All data crossing process boundaries is validated with Zod schemas (`src/schemas.ts`):

- Project files are validated on load via `parseProjectFile()`
- Settings and token files are validated on read with their respective schemas
- IPC payloads are validated in handlers before processing
- Analysis API responses are validated with schemas such as `analysisMatchResponseSchema`

## Reporting Security Issues

If you discover a security vulnerability, please report it by opening a private issue or contacting the maintainers directly rather than disclosing it publicly.
