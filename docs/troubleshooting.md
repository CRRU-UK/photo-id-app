---
title: Troubleshooting
description: Common problems and how to resolve them.
---

This page lists issues that occasionally come up using the app and what you can do about them. For known platform-specific limitations, see the [known issues](./known-issues.md) page.

## The app will not open

If the app crashes immediately on launch:

- Make sure you are using a recent release. Check [the releases page](https://github.com/CRRU-UK/photo-id-app/releases) for the latest version
- On macOS, the app must be in the `Applications` folder, and if it is somewhere else the app will offer to move itself there on first launch
- On Windows, antivirus software (including Windows Defender) sometimes flags new releases until the signature is recognised more widely - the recommended fix is to add an exception for the app's install location

If the problem persists, please [open a bug report](https://github.com/CRRU-UK/photo-id-app/issues/new?template=bug_report.yaml) with details - log files (see below) are very helpful.

## Settings have been reset to defaults

The app validates its settings file on every load. If the file is missing or corrupted (for example, because it was edited by hand or another tool), the app falls back to safe defaults and continues running. Your project data is unaffected.

If this happens, simply re-apply your preferences in the settings menu.

## Auto-update did not pick up a new version

The app checks for updates in the background after launch. Occasionally a new release is published but the auto-updater takes a few minutes to notice it.

- Restart the app and wait a minute or two
- If still nothing, download the latest release manually from [GitHub Releases](https://github.com/CRRU-UK/photo-id-app/releases)

## Where the app stores its data

The app does not write to system log files, but it does keep a small amount of per-user state outside your project folders, such as settings, recently-opened projects, and (if configured) encrypted analysis-provider tokens. This lives in the per-user data folder:

| Platform | User data folder                          |
| -------- | ----------------------------------------- |
| macOS    | `~/Library/Application Support/Photo ID/` |
| Windows  | `%APPDATA%\Photo ID\`                     |
| Linux    | `~/.config/Photo ID/`                     |

Project files (`project.photoid`, thumbnails, exports) always live next to your photos, never in the user data folder.

If telemetry is enabled, error reports are sent automatically to our error tracker. See the [privacy policy](./privacy.md) for details on what is and is not collected. Otherwise, attaching reproduction steps and any error messages to a [bug report](https://github.com/CRRU-UK/photo-id-app/issues/new?template=bug_report.yaml) is the most useful thing you can do.

## Building the app from source

If you are a contributor and run into issues running the app locally:

- Make sure you are on **Node.js 24 or newer** (`node --version`), older versions are not supported
- If `npm install` fails on `@napi-rs/canvas`, ensure you have the platform's standard build toolchain installed - most users get prebuilt binaries automatically, but a build-from-source fallback may need [native build tools](https://github.com/nodejs/node-gyp#installation)
- For more contributor-facing setup notes, see [CONTRIBUTING.md](https://github.com/CRRU-UK/photo-id-app/blob/main/CONTRIBUTING.md)
