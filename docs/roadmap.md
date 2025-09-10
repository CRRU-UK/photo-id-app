---
title: Roadmap
description: Roadmap for the Photo ID app.
---

There are a number of features planned for the app. Smaller changes in the near future may include:

- Continued performance optimisations, especially for large projects and extended use of the app
- User settings (light/dark theme control, column number and size, etc.)
- Exporting CSV data for matches
- UI improvements (e.g. resizeable sidebar)
- Multi-platform automated end-to-end test coverage
- Adding additional images to projects after creation
- Keyboard shortcuts
- Accessibility improvements

Some of the potential longer-term features are detailed below:

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

The ability match a photograph against a machine learning model would greatly help with the efficiency of matching photographs[^1]. The general idea would be to send a request to an API with the photo(s) which would query the model and return potential matches and its confidence for each. It would not match any photos automatically, instead only give suggestions on its confidence which the user could then action if necessary.

API contracts would be provided and an endpoint and secret key could be entered into the app preference to enable this integration.

[^1]: [Thompson et al. (2022), finFindR: Automated recognition and identification of marine mammal dorsal fins using residual convolutional neural networks, Mar. Mam. Sci., 38 (1) (2022), pp. 139-150](https://onlinelibrary.wiley.com/doi/epdf/10.1111/mms.12849)
