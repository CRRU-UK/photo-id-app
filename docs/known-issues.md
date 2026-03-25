---
title: Known Issues
description: Known issues and bugs in the app.
---

- **Windows: error when initialising a project in a folder containing hidden files** - The app throws an error when trying to initialise a project in a folder that includes a hidden file (e.g. `.DS_Store`, `desktop.ini`).
    - _Workaround_: Remove or move any hidden files out of the folder before creating the project, or create the project in a new empty folder and move your photos in afterwards.
- **Cross-platform project incompatibility** - Projects created on Unix systems (macOS / Linux) are not compatible with Windows (and vice versa) due to how file paths are stored in the project data file.
    - _Workaround_: Create and use each project on the same operating system it was created on. Do not move a `.photoid` file between platforms.
- **Windows: `.photoid` files not associated with the app after installation** - Installing the app on Windows does not automatically associate `.photoid` files with the app (this would require editing the registry, which is not currently feasible with Electron Forge / Squirrel).
    - _Workaround_: Open project files from within the app using File > Open, or right-click the `.photoid` file, choose "Open with", and select "Photo ID".
