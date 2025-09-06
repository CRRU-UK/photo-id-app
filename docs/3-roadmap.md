---
title: Roadmap
description: Roadmap for the Photo ID app.
---

There are a number of features planned in the future:

## Improved image editing

Currently the app uses a library for editing photos, however there are some limitations with this.
The current plan is to build a custom photo editor with the following improvements:

- Edits made to photos (brightness, cropping, drawings, etc.) will be saved in the `data.json` file
  instead of copying the photo file and applying the changes directly, which will save disk space
  especially for large projects
- Temporary filters can be applied to the photos which can help identify marks
