# Overview

- The Photo ID app is a research tool that can be used for photo-identification methodologies for longitudinal mark-recapture studies. It allows for the organisation and matching of photographs containing unique identification markings (such as cetacean dorsal fins). It includes tools for editing and visually filtering photographs to help with identification of marks.
- It is NOT a cataloguing tool, but a tool to group photos and edit them to more easily see identifiable marks. These photos can then be exported and used in external cataloguing software.
- ALWAYS read `ARCHITECTURE.md` for specifications and requirements of user journeys and flows.
- ALWAYS read `docs/` as it contains user-facing documentation and should be kept in sync with any changes, as well as providing further context.

## Build / dev / test

### Required Before Each Commit

- Run `npm test` before committing any changes to ensure:
  - Linting passes (`eslint` + `prettier`)
  - Type-checking passes (`tsc --noEmit`)
  - All unit tests pass (`vitest run`)
- This ensures all code changes meet quality and consistency standards

### Development Flow

- **Prerequisites**: Node >= 24 required (see `README.md`)
- **Install dependencies**: `npm ci` from repo root (installs all workspaces) — or `npm ci` from `app/` directly
- **Run locally**: `npm start` from `app/` (uses `electron-forge start`)
- **Run tests**: `npm test` from `app/` (includes linting, type-check, and unit tests)
- **Run tests in watch mode**: `npm run test:unit:watch` from `app/` for iterative development
- **Serve docs**: `npm run docs` from repo root
- **Never run**: `npm run package`, `npm run make`, or `npm run publish`

## Conventions

### Code standards and style

- Prefer using and centralising constants (see `app/src/constants.ts`) and types (see `app/src/types.ts`).
- Prefer abstracting small blocks of logic into helper functions (see `app/src/helpers.ts`).
- Prefer using full variable and parameter names for clarity (e.g. `error` instead of `e`).
- Prefer using longer functions that are easier to read over clever one-liners.
- Prefer using async/await over raw Promises for async code.
- Prefer using `try/catch` for error handling over `.catch()` on Promises.
- Prefer using long math expressions broken over multiple lines for readability and shorthand assignments (e.g. `a = a + b` instead of `a += b`).
- Prefer early returns instead of nested `else if` and `else` blocks.
- Prefer adding comments only for workarounds, hacks, or non-obvious code paths. Never remove existing comments, only update them if necessary instead.
- Prefer adding JSDocs where helpful, but avoid redundant types that are already covered by TypeScript.
- For functions with more than two parameters, prefer using objects.
- The UI uses GitHub Primer components/icons — prefer reusing Primer primitives and icons for consistency.
- Do not remove console logs.

### Architecture-specific conventions

- IPC naming is explicit. Prefer using the `IPC_EVENTS` enum from `app/src/constants.ts` instead of raw strings.
- File operations and project persistence happen on the main side (`app/src/backend/*.ts`). Frontend should call preload helpers and assume I/O is async.
- Edit-window lifecycle: when navigating editor photos, the renderer calls `window.electronAPI.navigateEditorPhoto(data, direction)` which returns a base64-encoded JSON string that the edit route sets back into its query param.
- Thumbnails are stored next to the project: see `PROJECT_THUMBNAIL_DIRECTORY` in `app/src/constants.ts`.
- Avoid editing generated files: `app/src/routeTree.gen.ts` and other generator outputs.

## Integration points / external deps

- Electron + electron-forge + vite: packaging handled by `electron-forge` + forge Vite plugin (configs under `app/`: `vite.*.mts`, `forge.config.ts`).
- Sentry: integrated in both main (`@sentry/electron`) and renderer (`@sentry/electron/renderer`). Opt-in via settings; when enabled, captures crashes, errors, session replay (error-only), tracing, profiling, and console logs. Initialised before app ready; user preference applied in `whenReady`. Privacy policy at `docs/privacy.md`. Environment variables: `VITE_SENTRY_DSN` (renderer) and `SENTRY_DSN` (main). See `app/.env.example`.
- Native image processing: `@napi-rs/canvas` is used in backend image helpers.

## If you need to change behaviour

- For IPC additions: add a new `IPC_EVENTS` entry, implement handler in `app/src/main.ts` (or backend helper) and expose through `app/src/preload.ts`.
- For UI routes: add/edit files in `app/src/routes/` — the generated `app/src/routeTree.gen.ts` will be updated by the router tooling.

When unsure, look at these files first

- `app/src/main.ts`
- `app/src/preload.ts`
- `app/src/index.tsx`
- `app/src/constants.ts`
- `app/src/types.ts`
- `app/src/backend/*`
- `app/src/frontend/components/*`
- `app/src/routes/*`

## Considerations

- The app is often run on machines with limited hardware. Be conservative with memory and avoid loading many full-resolution images into memory at once.
- Favour streaming, thumbnails (`app/src/backend/photos.ts`), and on-disk edits over keeping large buffers in renderer memory. Use the backend helpers for file I/O and image processing (`@napi-rs/canvas`).
- In React, avoid retaining large binary blobs in state across long sessions; prefer references to on-disk filenames and load File/ArrayBuffer only when needed (see `app/src/routes/edit.tsx` and `app/src/frontend/hooks/usePhotoEditor.ts`).

## Key Guidelines

1. **Be mindful of performance**: Avoid loading large buffers into state; prefer references and lazy loading
2. **Usage considerations**: Remember the app is typically run on low-spec hardware Windows computers, for long periods of time, and using high-resolution images; optimize for memory and CPU usage
3. **Always run tests before proposing changes**: Use `npm test` to verify linting, types, and unit tests pass
4. **Follow established patterns**: Examine similar code in the codebase before implementing new features
5. **Use IPC constants**: Always reference `IPC_EVENTS` from `app/src/constants.ts` instead of raw strings
6. **Maintain type safety**: Ensure all types are defined in `app/src/types.ts` and shared properly between main and renderer
7. **Keep the architecture clean**: Frontend calls preload helpers, main process handles file I/O, backend helpers do actual work
8. **Test new functionality**: Add or update unit tests alongside feature changes in `*.test.ts` files
9. **Document non-obvious code**: Add comments only for workarounds, hacks, or non-obvious logic paths

## Reviewing code

Evaluate in order: architecture → code quality → tests → performance. Before reviewing, sync to latest remote (`git fetch origin`).

For each issue: describe concretely with file:line references, present options with trade-offs when the fix isn't obvious, recommend one, and ask before proceeding.

## Testing

**Test behaviour, not implementation**. Tests should verify what code does, not how. If a refactor breaks your tests but not your code, the tests were wrong.

**Test edges and errors, not just the happy path**. Empty inputs, boundaries, malformed data, missing files, network failures — bugs live in edges. Every error path the code handles should have a test that triggers it.

**Mock boundaries, not logic**. Only mock things that are slow (network, filesystem), non-deterministic (time, randomness), or external services you don't control.
