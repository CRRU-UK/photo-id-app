---
title: Machine Learning
description: How to add and use a machine learning model in the app.
---

A machine learning model can be integrated in the app which can be used to analyse photos and display a list of closest matches.

![Analysis results](../assets/images/analysis-model-results.png?v1){ width="700" }

!!! note

    You will need to provide your own model and API - we are currently working on our own and will be sharing this publicly in the future!

## Managing models

A model API will need to be provided according to the [OpenAPI specifications provided here](../assets/analysis-api-spec.yaml). This specification is the contract the app will use to send requests and expect responses from an API.

<!-- markdownlint-disable MD033 -->
<div class="grid cards" markdown>
- ![Model list in settings](../assets/images/analysis-model-list.png?v1){ width="700" }
- ![Adding a model](../assets/images/analysis-model-add.png?v1){ width="700" }
</div>
<!-- markdownlint-enable MD033 -->

To add a model, open the app settings. Open the ==:octicons-ai-model-16: Machine Learning== tab, and select the ==:octicons-plus-16: Add Model== button.

Enter a model label, your base API URL, and token. Tokens cannot be viewed after saving. Select the ==Save== button and the model will be added. You can view your models in the app settings. Models can be edited by selecting the ==:octicons-pencil-16: edit== icon, or deleted by selecting the ==:octicons-trash-16: bin== icon in the model list.

!!! tip

    You can add multiple models and quickly swap between them, which is useful for testing different configurations, indexes, etc.

## Analysis

To choose a model to use for analysis, open the ==Select ML Model== dropdown in the project view sidebar. Here you can choose from the models you have added. Select the model you want to use, and an ==:octicons-ai-model-16: analyse== button will appear below each stack.

![Selecting a model](../assets/images/analysis-model-select.png?v1){ width="300" }

You can deselect a model by simply selecting it again in the list, which will disable the analysis buttons until a model is selected again. Note that the unassigned and discarded stacks do not support analysis.

To analyse a stack, select the ==:octicons-ai-model-16: Analyse photos== button below the photo. Analysing a stack will send _all_ photos in that stack to the API's `/match` endpoint. Photos are sent resized at 1000px longest edge and with 85% JPEG quality, with any edits applied (size and quality may be configurable in the future).

A table will be shown with the corresponding information:

- Match rank (ordered by best match first)
- Rating (e.g. confidence, similarity)
- Details (useful for debugging information)

Results are paginated if there are many matches. You can cancel an in-progress analysis using the ==Cancel== button in the overlay.

Users can use this data to cross-check the animal with their catalogues, and if a match is found the respective ID can be entered into the ID field in the stack.

## Notes

### API Tokens

API tokens are encrypted and decrypted using your operating system's secure storage:

- **Windows:** [DPAPI](https://support.apple.com/en-ca/guide/keychain-access/kyca1083/mac)
- **macOS:** [Keychain Access](https://support.apple.com/en-ca/guide/keychain-access/kyca1083/mac)
- **Linux:** Various ([more information](https://www.electronjs.org/docs/latest/api/safe-storage))

On systems where secure storage is not available, you will still be able to add and use models, however **tokens will be stored without encryption in plaintext**. Note that tokens are stored in the app settings and not in project data files.

Contact your system administrator if encounter issues with your system's secure storage.
