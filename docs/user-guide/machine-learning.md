---
title: Machine Learning
description: How to add and use a machine learning model in the app.
---

A machine learning model can be integrated in the app which can be used to analyse photos.

!!! note

    You will need to provide your own model and API - we are currently working on our own and will be sharing this publicly in the future!

## Managing models

A model API will need to be provided according to the [OpenAPI specifications provided here](../assets/analysis-api-spec.yaml). This specification is the contract the app will use to send requests and expect responses from an API.

To add a model, open the app settings. Open the  ==:octicons-ai-model-16: Machine Learning== tab, and select the ==:octicons-plus-16: Add Model== button.

Enter a model label, your base API URL, and API key. Select the ==Save== button and the model will be added. You can view your models in the app settings. Models can be deleted by selecting the ==:octicons-trash-16: bin== icon in the model list.

!!! tip

    You can add multiple models and quickly swap between them, which is useful for testing different configurations, indexes, etc.

## Analysis

To choose a model to use for analysis, open the ==Select ML Model== dropdown in the project view sidebar. Here you can chose from the models you have added. Select on the model you want to use, and an ==:octicons-ai-model-16: analyse== button will appear below each stack.

You can deselect a model by simply selecting it again in the list, which will disable the analysis buttons until a model is selected again. Note that the unassigned and discarded stacks do not support analysis.

Analysis a stack will send _all_ photos in that stack to the API's `/match` endpoint. A table will be shown with the corresponding information:

- Match rank (ordered descending)
- Rating (e.g. confidence, similarity)
- Details (useful for debugging information)

Users can use this data to cross-check the animal with their catalogues, and if a match is found the respective ID can be entered into the ID field in the stack.
