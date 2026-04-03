# Photo ID App

![Screenshots of the Photo ID app.](./docs/assets/images/banner.png?v3)

[![Test](https://github.com/CRRU-UK/photo-id-app/actions/workflows/main.yaml/badge.svg?branch=main)](https://github.com/CRRU-UK/photo-id-app/actions/workflows/main.yaml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=CRRU-UK_photo-id-app&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=CRRU-UK_photo-id-app)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=CRRU-UK_photo-id-app&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=CRRU-UK_photo-id-app)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=CRRU-UK_photo-id-app&metric=bugs)](https://sonarcloud.io/summary/new_code?id=CRRU-UK_photo-id-app)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=CRRU-UK_photo-id-app&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=CRRU-UK_photo-id-app)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=CRRU-UK_photo-id-app&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=CRRU-UK_photo-id-app)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=CRRU-UK_photo-id-app&metric=coverage)](https://sonarcloud.io/summary/new_code?id=CRRU-UK_photo-id-app)

- [Introduction](#introduction)
- [Development](#development)
  - [E2E Tests](#e2e-tests)
  - [Debugging](#debugging)
- [Releases](#releases)
  - [Code Signing](#code-signing)
- [Notes](#notes)

## Introduction

The Photo ID app is a multi-platform research tool that can be used for photo-identification methodologies such as in longitudinal mark-recapture studies. It allows for the grouping of photographs containing unique identification markings (such as the dorsal fins of cetaceans), includes tools for editing and visually filtering photographs to help with the identification of marks, and can be integrated with a machine learning model for convenient catalogue matching.

It supports Windows, macOS, and Linux.

> [!TIP]
> 📚 [Check out the documentation](https://photoidapp.crru.org.uk) for guides on how to install and use the app!

## Development

1. Clone the repository
2. Ensure you are using Node version >= 24 (`nvm install 24` / `nvm use 24`)
3. Install the dependencies by running [`npm ci`](https://docs.npmjs.com/cli/ci.html)
4. If using VS Code install the [Biome](https://marketplace.visualstudio.com/items?itemName=biomejs.biome) extension

Below are the NPM commands that can be used for development:

| Command              | Description                                                      |
| -------------------- | ---------------------------------------------------------------- |
| `start`              | Starts the app in development mode.                              |
| `package`            | Builds and packages the app.                                     |
| `make`               | Builds app distributables.                                       |
| `publish`            | Publishes the app.                                               |
| `changesets:add`     | Adds changeset.                                                  |
| `changesets:version` | Bumps the app version.                                           |
| `changesets:tag`     | Tags the app and pushes to remote.                               |
| `test`               | Runs `test:linting`, `test:types`, and `test:unit` sequentially. |
| `test:linting`       | Runs Biome linting and formatting checks.                        |
| `test:types`         | Runs TypeScript tests.                                           |
| `test:unit`          | Runs unit tests and generates a coverage report.                 |
| `test:unit:watch`    | Same as `test:unit` but runs it in watch mode.                   |
| `test:e2e:build`     | Builds the app for E2E testing.                                  |
| `test:e2e`           | Runs E2E tests (requires `test:e2e:build` first).                |
| `docs`               | Builds and serves documentation locally. <sup>1</sup>            |

<sup>1</sup> Requires [Material for MKDocs](https://squidfunk.github.io/mkdocs-material/).

### E2E Tests

More information about end-to-end (E2E) tests can be found in [`tests/`](tests/).

### Debugging

Using VSCode, a debugger can be attached to the main process in Electron by running "Debug main process" in the _Run and Debug_ view.

## Releases

Releases are managed with [changesets](https://github.com/changesets/changesets) and published automatically via GitHub Actions.

1. **Add a changeset** - run `npm run changesets:add` on a feature branch and commit the generated `.changeset/*.md` file alongside the PR
2. **Release PR** - each push to `main` triggers the `version` action in `release.yaml`, which creates or updates the Release PR that accumulates pending changesets (which determine the next semantic version and changelog)
3. **Publishing** - merging the Release PR into `main` triggers the `publish` action in `release.yaml`, which builds the app for each platform and attaches the binaries to a release on GitHub (used by the auto-updater)

Note that the `prerelease.yaml` workflow can be triggered manually via GitHub Actions to build a single-platform production-like artifact (1-day retention) without publishing, useful for smoke-testing before a release.

### Publishing Flow

The draft release is pre-created in `release.yaml` _before_ the tag is pushed. This is done as the auto-update checker in distributed app sessions caches release metadata, so a release that is briefly live without binaries will be permanently skipped by those sessions. `publish.yaml` appends platform artifacts to the draft, and the final job marks the release as published once all three builds complete.

### Code Signing

Secrets and variables used for code singing are managed via Terraform ([`terraform/`](terraform/)) and populated into GitHub Actions automatically via Terraform Cloud. The `GITHUB_TOKEN` environment variable (a GitHub PAT with `repo` scope) is required to allow the GitHub provider to manage repository secrets and variables.

#### macOS

Certificates are managed in the Apple Developer Program. Signing and notarisation is configured with the `osxSign` and `osxNotarize` options in `forge.config.ts`.

| Secret                        | Description                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `APPLE_ID`                    | Apple ID email associated with the Developer account.                        |
| `APPLE_TEAM_ID`               | Team ID from Apple Developer Program membership.                             |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password generated at appleid.apple.com, used for notarisation. |
| `APPLE_CERTIFICATE`           | Base64-encoded `.p12` certificate exported from Keychain.                    |
| `APPLE_CERTIFICATE_PASSWORD`  | Password set during `.p12` export.                                           |

#### Windows

> [!NOTE]
> This is currently being worked on and is temporarily disabled.

Signing is done with [Azure Artifact Signing](https://azure.microsoft.com/en-us/products/artifact-signing) and invoked in the Windows variation of `publish.yaml` via `azure/artifact-signing-action`.

| Secret / Variable                             | Description                    |
| --------------------------------------------- | ------------------------------ |
| `AZURE_CLIENT_ID`                             | Service principal client ID.   |
| `AZURE_TENANT_ID`                             | Azure tenant ID.               |
| `AZURE_SUBSCRIPTION_ID`                       | Azure subscription ID.         |
| `AZURE_CODE_SIGNING_ACCOUNT_NAME`             | Artifact Signing account name. |
| `AZURE_CODE_SIGNING_CERTIFICATE_PROFILE_NAME` | Certificate profile name.      |
| `AZURE_CODE_SIGNING_ENDPOINT`                 | Regional endpoint URL.         |

## Notes

The macOS build includes a synchronous notarisation step that normally completes in 2-5 minutes, but Apple's notarisation service occasionally experiences delays. If the `build` job times out, the macOS artifact will not be uploaded and the draft release will remain unpublished. Check the **Check macOS submission history** step logs to see the status of recent submissions - once the latest shows `Accepted`, use **Re-run failed jobs** on the workflow run in GitHub Actions to re-run only the macOS leg. This will re-build, notarise, and upload the artifact, after which the `publish` job will run automatically and finalise the release. If a submission shows `Invalid`, run `xcrun notarytool log <submission-id>` locally for the rejection reason.
