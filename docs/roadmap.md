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

## Machine learning integration

The ability match a photograph against a machine learning model would greatly help with the efficiency of matching photographs[^1]. The general idea would be to send a request to an API with the photo(s) which would query the model and return potential matches and its confidence for each. It would not match any photos automatically, instead only give suggestions on its confidence which the user could then action if necessary.

API contracts would be provided and an endpoint and secret key could be entered into the app preference to enable this integration.

[^1]: [Thompson et al. (2022), finFindR: Automated recognition and identification of marine mammal dorsal fins using residual convolutional neural networks, Mar. Mam. Sci., 38 (1) (2022), pp. 139-150](https://onlinelibrary.wiley.com/doi/epdf/10.1111/mms.12849)

## Loupe

Allowing the user to toggle a loupe they can use to more closely inspect marks on a photo without having to zoom and pan the photo.
