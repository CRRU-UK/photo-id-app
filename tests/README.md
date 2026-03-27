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
