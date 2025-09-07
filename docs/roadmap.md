---
title: Roadmap
description: Roadmap for the Photo ID app.
---

There are a number of features planned for the future. Some of the larger, longer term ones are detailed below, however smaller changes in the near future may include:

- Continued performance optimisations, especially for large projects and extended use of the app
- User settings (light/dark theme control, column number and size, etc.)
- UI improvements (e.g. resizeable sidebar)
- End-to-end test coverage (multi-platform)
- Adding additional images to projects after creation
- Keyboard shortcuts
- Accessibility improvements

---

## Improved image editing

Currently the app uses a library for editing photos, however there are some limitations with this. The current plan is to build a custom photo editor with the following changes:

- Edits made to photos (brightness, cropping, drawings, etc.) will be saved as properties in the `data.json` file instead of copying the photo file and manipulating it directly, which will save disk space especially for large projects
- Temporary filters can be applied to the photos which can help identify marks, similar to some photo editing software

Edit properties would be applied only to thumbnail and export generations, leaving the original images unmodified. For example, image data may look like (in the `edits` property):

```json
{
  "directory": "/foo/bar",
  "name": "image_1.JPG",
  "thumbnail": ".thumbnails/image_1.JPG",
  "edits": {
    "brightness": 50,
    "contrast": 50,
    "crop": {
      "x": 200,
      "y": 500,
      // Or coordinates from and to
      "width": 1200,
      "height": 1000
    },
    "shapes": [
      // ...
    ]
  }
}
```

## Data thumbnails

Instead of saving thumbnails to `.thumbnails/`, they would be stored as base64 strings in `data.json`. The main issue with this is that there is a size limit in local storage which is currently used by the app, so this would need to be removed or reconfigured.

## Machine learning integration
