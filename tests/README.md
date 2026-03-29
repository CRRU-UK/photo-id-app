# E2E Tests

End-to-end tests using [Playwright](https://playwright.dev/) with its built-in Electron support.

## Running locally

```bash
# Build the Vite output (required once, or after source changes)
npm run test:e2e:build

# Run E2E tests
npm run test:e2e
```

## How it works

Playwright launches Electron and connects via Chrome DevTools Protocol (CDP) to drive the app. Native file dialogues are mocked so tests can run non-interactively, but all other I/O (filesystem, thumbnails, IPC) runs for real against an isolated temp directory that is cleaned up after each test.

The packaged binary has the `EnableNodeCliInspectArguments` Electron fuse disabled (a security requirement). This prevents Playwright from establishing a CDP connection. Instead, tests launch Electron directly from the Vite-built output (`electron .`), which reads the `main` property in `package.json` and loads `.vite/build/main.js`.

The `test:e2e:build` script runs `electron-forge package` to produce this `.vite/` output. `electron-forge` has no standalone "build" command, so `package` is the only reliable way to generate the build with all forge-injected variables. The `out/` directory it also creates is an unused byproduct.

A consequence of this approach is that `app.isPackaged` is `false` during tests, so production-only code paths gated behind that flag are not exercised. Currently this only affects DevTools and the macOS Applications folder check, both of which are skipped via the `E2E` environment variable anyway.

### Test images

Test files (such as photos) are stored in [`tests/data`](data/) and are copied to a temp directory for each test.

## CI

E2E tests run across Linux, macOS, and Windows in CI (`.github/workflows/main.yaml`).

- **Linux** requires `xvfb-run` because there is no display server (Electron cannot run headless)
- **Linux** also requires `--no-sandbox` because the Electron SUID sandbox helper is not configured on GitHub runners
- **macOS** and **Windows** have display servers available on CI runners and work as-is

## Notes

### Linux worker tear-down

On macOS and Windows, `app.close()` shuts down Electron gracefully via CDP. On Linux under `xvfb-run`, the Electron process stops responding to Playwright's CDP protocol after the tests complete, causing `app.close()` to hang indefinitely. The `afterAll` hook therefore uses a platform-conditional approach: `app.close()` on macOS/Windows, and `SIGKILL` on Linux.

Sending `SIGKILL` alone is not sufficient. Playwright's worker tear-down calls `gracefullyCloseAll()`, which iterates an internal `gracefullyCloseSet`. Each entry is only removed when the `ChildProcess` emits its `'close'` event. Because this event fires asynchronously, `afterAll` can return before it is processed, leaving the entry in the set. The tear-down then calls `attemptToGracefullyClose()`, then `app.close()`, then a CDP command to the dead process - hanging for the full test timeout.

To prevent this, the Linux code path awaits the `'close'` event (with a timeout fallback) after killing the process, guaranteeing the set is clean before tear-down starts.
