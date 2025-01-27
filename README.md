> [!IMPORTANT]  
> This project is under initial development and is a work-in-progress.
> 
> A roadmap of the project is available [here](https://github.com/orgs/CRRU-UK/projects/3).

---

# CRRU Photo ID App

[![Test](https://github.com/CRRU-UK/photo-id-app/actions/workflows/main.yaml/badge.svg?branch=main)](https://github.com/CRRU-UK/photo-id-app/actions/workflows/main.yaml)

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=CRRU-UK_photo-id-app&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=CRRU-UK_photo-id-app)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=CRRU-UK_photo-id-app&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=CRRU-UK_photo-id-app)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=CRRU-UK_photo-id-app&metric=bugs)](https://sonarcloud.io/summary/new_code?id=CRRU-UK_photo-id-app)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=CRRU-UK_photo-id-app&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=CRRU-UK_photo-id-app)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=CRRU-UK_photo-id-app&metric=vulnerabilities)](https://sonarcloud.io/summary/new_code?id=CRRU-UK_photo-id-app)

1. [Introduction](#introduction)
2. [Overview](#overview)
3. [Installation](#installation)
4. [Development](#development)

## Introduction

Source code for the CRRU Photo ID App. The app is a research tool used in photo-identification methodologies for longitudinal mark-recapture studies. It allows for the organisation, categorisation, and matching of photographs containing unique identification markings (e.g. cetacean dorsal fins). It also includes tools for editing and visually filtering photographs to improve marking identification confidence.

The app is built in Electron, TypeScript, Jest, React, and [Primer](https://primer.style).

## Overview

The app is made up of the following parts:

- [`src/`](src/) contains the main app code
  - [`src/assets`](src/assets) contains app assets (e.g. icons)
  - [`src/backend`](src/backend) contains backend (_main_) controllers
  - [`src/frontend`](src/frontend) contains frontend (_renderer_) views
    - [`src/frontend/components`](src/frontend/components) contains reusable UI components
    - [`src/frontend/modules`](src/frontend/modules) contains UI sections and pages
  - [`src/helpers`](src/helpers) contains common helpers, utility functions, constants, and types
  - [`src/models`](src/models) contains classes
- [`app.ts`](app.ts) contains the app entry-point
- [`preload.ts`](preload.ts) contains preloaded app methods

## Installation

1. Clone the repository
2. Ensure you are using Node version >= 22 (`nvm install 22` / `nvm use 22`)
3. Install the dependencies by running [`npm ci`](https://docs.npmjs.com/cli/ci.html)
4. If using VS Code install the [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint), [Stylelint](https://marketplace.visualstudio.com/items?itemName=stylelint.vscode-stylelint), and [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) extensions

## Development

Below are the NPM commands that can be used for development:

| Command      | Description                                      |
| ------------ | ------------------------------------------------ |
| `start`      | Starts the app in development mode.              |
| `package`    | Builds and packages the app.                     |
| `make`       | Builds app distributables.                       |
| `publish`    | Publishes the app.                               |
| `lint`       | Runs ESLint and Prettier tests.                  |
| `test`       | Runs unit tests and generates a coverage report. |
| `test:watch` | Same as `test:jest` but runs it in watch mode.   |
