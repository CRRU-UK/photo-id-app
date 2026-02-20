---
title: Known Issues
description: Known issues and bugs in the app.
---

- On Windows, the app throws an error when trying initialise a project in a folder that includes a hidden file
- Projects created on Unix systems (macOS / Linux) are not compatible with Windows (and vice versa) due to how the paths are defined in the project data file
- On Windows, installing the app does not automatically associate `.photoid` files with the app (this requires the app to edit the registry, which is currently not feasible with Electron Forge / Squirrel)
