# Photo ID App

![Screenshots of the Photo ID app.](./docs/assets/images/banner.png?v2)

[![Test](https://github.com/CRRU-UK/photo-id-app/actions/workflows/main.yaml/badge.svg?branch=main)](https://github.com/CRRU-UK/photo-id-app/actions/workflows/main.yaml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=CRRU-UK_photo-id-app&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=CRRU-UK_photo-id-app)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=CRRU-UK_photo-id-app&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=CRRU-UK_photo-id-app)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=CRRU-UK_photo-id-app&metric=bugs)](https://sonarcloud.io/summary/new_code?id=CRRU-UK_photo-id-app)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=CRRU-UK_photo-id-app&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=CRRU-UK_photo-id-app)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=CRRU-UK_photo-id-app&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=CRRU-UK_photo-id-app)

- [Introduction](#introduction)
- [Development](#development)
  - [Debugging](#debugging)
  - [Error Tracking](#error-tracking)

## Introduction

The Photo ID app is a multi-platform research tool that can be used for photo-identification methodologies such as in longitudinal mark-recapture studies. It allows for the grouping of photographs containing unique identification markings (such as the dorsal fins of cetaceans), and includes tools for editing and visually filtering photographs to help with identification of marks, and exporting matches.

It supports Windows, macOS, and Linux.

> [!TIP]
> 📚 [Check out the documentation](https://photoidapp.crru.org.uk) for guides on how to install and use the app!

## Development

1. Clone the repository
2. Ensure you are using Node version >= 24 (`nvm install 24` / `nvm use 24`)
3. Install the dependencies by running [`npm ci`](https://docs.npmjs.com/cli/ci.html)
4. If using VS Code install the [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) and [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) extensions

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
| `test:linting`       | Runs ESLint and Prettier tests.                                  |
| `test:types`         | Runs TypeScript tests.                                           |
| `test:unit`          | Runs unit tests and generates a coverage report.                 |
| `test:unit:watch`    | Same as `test:unit` but runs it in watch mode.                   |
| `docs`               | Builds and serves documentation locally. <sup>1</sup>            |

<sup>1</sup> Requires [Material for MKDocs](https://squidfunk.github.io/mkdocs-material/).

### Debugging

Using VSCode, a debugger can be attached to the main process in Electron by running "Debug main process" in the _Run and Debug_ view.

### Error Tracking

The app uses [Sentry](https://sentry.io) to track errors and logs for debugging in published production builds. To enable this locally, add an `.env` file to the root of the repository using the variables defined in [`.env.example`](.env.example). This file also needs to be created when publishing to ensure the values are included in the production build.
