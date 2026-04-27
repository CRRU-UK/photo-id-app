---
title: Analysis
description: How to add and use an analysis provider in the app.
---

An analysis provider (such as a machine learning model) can be integrated in the app that can be used to analyse photos and display a list of closest matches.

![Analysis results](../assets/images/analysis-match-results.png?v1){ width="700" }

## Managing providers

A provider API will need to be provided according to the [OpenAPI specifications provided here](../assets/analysis-api-spec.yaml). This specification is the contract the app will use to send requests and expect responses from an API.

<!-- markdownlint-disable MD033 -->
<div class="grid cards" markdown>
- ![Provider list in settings](../assets/images/analysis-provider-list.png?v1){ width="700" }
- ![Adding a provider](../assets/images/analysis-provider-add.png?v1){ width="700" }
</div>
<!-- markdownlint-enable MD033 -->

To add a provider, open the app settings. In the ==:octicons-ai-model-16: Analysis== tab, select the ==:octicons-plus-16: Add Provider== button.

Enter a provider label, your base API URL, and token. Tokens cannot be viewed after saving. Select the ==Save== button and the provider will be added. You can view your providers in the app settings. Providers can be edited by selecting the ==:octicons-pencil-16: edit== icon or deleted by selecting the ==:octicons-trash-16: bin== icon in the provider list.

!!! tip

    You can add multiple providers and quickly swap between them, which is useful for testing different configurations, indexes, etc.

## Analysis

To choose a provider to use for analysis, open the ==Analysis Provider== dropdown in the project view sidebar. Here you can choose from the providers you have added. Select the provider you want to use, and an ==:octicons-ai-model-16: Analyse Photos== button will appear below each stack and in the image editor.

![Selecting a provider](../assets/images/analysis-provider-select.png?v1){ width="300" }

You can unselect a provider by selecting it again in the list, which will disable the analysis buttons until a provider is selected again. Note that the unassigned and discarded stacks do not support analysis.

To analyse a stack, select the ==:octicons-ai-model-16: Analyse Photos== button below the photo in the project view, or in the toolbar in the image editor view. Analysing a stack will analyse _all_ photos in that stack, and analysing an image in the image editor will analyse only that image (with any pending edits applied).

!!! info

    Photos are sent resized at 1000px longest edge and with 85% JPEG quality, with any edits applied - size and quality may be configurable in the future.

A table will be shown with the corresponding information:

- Match rank (ordered by best match first)
- Rating (e.g. confidence, similarity)
- Details (useful for debugging information)

Selecting the ==:octicons-copy-16: Copy details to clipboard== button will copy the details of the selected row to your clipboard. Results are paginated for every 10 matches.

You can cancel in-progress analysis using the ==Cancel== button in the overlay.

## Notes

### API Tokens

API tokens are encrypted and decrypted using your operating system's secure storage:

- **Windows:** [DPAPI](https://learn.microsoft.com/en-us/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata)
- **macOS:** [Keychain Access](https://support.apple.com/en-ca/guide/keychain-access/kyca1083/mac)
- **Linux:** Various ([more information](https://www.electronjs.org/docs/latest/api/safe-storage))

On systems where secure storage is not available, you will still be able to add and use providers, however **tokens will be stored in plaintext and _without_ encryption**. Note that tokens are stored in the app settings and not in project data files.

Contact your system administrator if encounter issues with your system's secure storage.
