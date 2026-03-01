---
title: Roadmap
description: Roadmap for the Photo ID app.
---

There are a number of features planned for the app. Smaller changes in the near future may include:

- Continued performance optimisations, especially for large projects and extended use of the app
- Exporting CSV data for matches
- UI improvements (e.g. resizable sidebar)
- Multi-platform automated end-to-end test coverage
- Adding additional images to projects after creation
- Accessibility improvements

Some of the potential longer-term features are detailed below:

## Data thumbnails

Instead of saving thumbnails to `.thumbnails/`, they would be stored as base64 strings in `data.json`. The main issue with this is that there is a size limit in local storage which is currently used by the app, so this would need to be removed or reconfigured.

## Loupe

Allowing the user to toggle a loupe they can use to more closely inspect marks on a photo without having to zoom and pan the photo.
