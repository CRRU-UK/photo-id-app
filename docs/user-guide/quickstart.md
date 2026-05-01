---
title: Quickstart
description: A five-minute walkthrough of the Photo ID app.
---

This is a five-minute walkthrough that takes you from a folder of photos to a set of exported matches. For a more detailed reference, see the [usage guide](./usage.md).

!!! note

    This guide assumes you have already [installed the app](./installation.md).

## 1. Prepare your photos

Put all the photos you want to work with in a single folder. The app supports `.jpg`, `.jpeg`, and `.png`.

!!! tip

    The app will _never_ modify your original photos. Edits and exports are written into separate files inside the project folder. Even so, always keep a backup of your original photos.

## 2. Create a project

Open the app and select ==:octicons-file-directory-16: Start New Project==, then choose the folder you prepared. The app will generate thumbnails and open the project. This may take a moment for larger folders.

You will end up with two new items inside that folder:

- `project.photoid` — the project file.
- `thumbnails/` — auto-generated thumbnails.

## 3. Sort photos into stacks

You will see three areas:

- **Unassigned** (top-left): every photo starts here
- **Discarded** (bottom-left): for photos that are not usable
- **Matches** (main area): pairs of stacks for matched left/right sides

Drag photos from **Unassigned** into a matched pair (or into **Discarded** if unusable). Use the arrow buttons under each stack to flip through photos, or the [keyboard shortcuts](./keyboard-shortcuts.md).

## 4. Edit a photo

Photos can be edited to focus on the identification markings and make them more visible.

Double-click a photo, or use the ==:octicons-pencil-16: Edit Photo== button, to open the editor in a new window. From here you can:

- Adjust brightness, contrast, and saturation
- Zoom and pan to crop
- Toggle edge detection (==:octicons-eye-16:==) to make marks easier to spot
- Toggle the loupe (==:octicons-codescan-16:==) to magnify under your cursor

Press ==Save== to keep your edits, ==Reset== to revert to defaults, or close the window to discard unsaved edits.

## 5. Export

Open the ==:octicons-three-bars-16: Actions== menu (bottom-left of the project screen) and choose:

- ==:octicons-file-diff-16: Export Matches== writes all matched photos (with edits applied) into a `matched/` folder, renamed by their match ID.
- ==:octicons-database-16: Export CSV== writes a `matches.csv` to the project's `data/` folder, mapping each photo to its match ID.

You can use the exported files in your downstream cataloguing tool of choice.

---

For an in-depth walkthrough of all the features in the app, see the full [usage guide](./usage.md), or jump to the [glossary](../glossary.md) if any term is unfamiliar.
