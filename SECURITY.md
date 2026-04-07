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

The `style-src` directive includes `'unsafe-inline'` because the Primer React component library applies runtime inline styles for layout and theming. This is a known trade-off as removing `'unsafe-inline'` would require a nonce-based approach that Primer does not currently support. The risk is mitigated by the strict `script-src 'self'` policy, which prevents injected inline styles from executing code.

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
- `EnableEmbeddedAsarIntegrityValidation` - Validates ASAR archive integrity (macOS only, on Windows code signing modifies the binary after integrity checksums are embedded, which invalidates them)
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
