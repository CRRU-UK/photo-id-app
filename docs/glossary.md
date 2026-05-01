---
title: Glossary
description: Definitions of terms used throughout the Photo ID app and documentation.
---

This is a quick reference for the terms used in the app's interface and throughout this documentation.

## Project

A self-contained working folder for one set of photos. Backed by a `project.photoid` file plus a `thumbnails/` folder, both stored alongside your photos.

## Stack

A collection of photos. Each stack shows one photo at a time, with arrow buttons to navigate. The total count of photos in the stack and the index of the currently displayed photo are shown in the bottom corners.

## Unassigned

The stack containing photos that have not yet been sorted. Every photo starts here when you create a new project. A progress bar shows how many photos are still waiting to be sorted.

## Discarded

The stack for photos that are not usable (poor quality, occluded subject, etc.). Photos in the **discarded** stack are not included in exports.

## Matched stacks

The pairs of stacks in the main area of the project screen, each pair representing one matched animal. Each pair has a **left** and a **right** side.

## Left and right

The two sides of a matched pair, corresponding to the two sides of the animal being matched. The convention reflects how dorsal-fin and similar mark-recapture studies record subjects.

## Page

A group of matched-stack pairs. By default there are eight pairs per page. Tabs at the top of the project screen switch between pages. Number keys jump directly to a specific page.

## Match ID

The label identifying a matched pair, used when exporting. By default this is a letter (`A`, `B`, `C`, etc.) derived from the pair's position. You can override it per side using the text field at the top of each stack. For example, entering `001` produces exports named `001L` and `001R` instead of `AL` and `AR`.

## Edits

Per-photo adjustments - brightness, contrast, saturation, zoom, and pan - applied in the editor. Edits are stored in the project file and applied when matched photos are exported. Original photos on disk are never modified.

## Loupe

A magnifying overlay in the editor that follows your cursor. Useful for inspecting fine detail (small notches, scars) without zooming the whole image.

## Edge detection

A temporary view filter in the editor that emphasises edges in the photo. Helpful for spotting subtle marks. Edge detection is _never_ baked into saved or exported images, and is a viewing aid only.

## Analysis provider

An external service (e.g. a machine-learning model) configured in the app's settings, used to compare photos against an existing catalogue. See the [analysis guide](./user-guide/analysis.md) for details.

## Export

The process of writing matched photos (and/or a CSV index) out to disk for use in another tool. Exports go into a `matched/` folder (photos) or a `data/matches.csv` file (CSV) inside the project folder.
