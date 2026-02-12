---
title: Usage
description: How to use the Photo ID app.
---

## Creating your first project

![Home screen of the app](../assets/images/index.png?v1){ width="700" }

When you first open the app you will see the home screen. To start a new project, select ==:octicons-file-directory-16: Start New Project==. Projects can be created in folders containing image files (JPG/JPEG or PNG). Choose the folder you want to create a project in and the app will begin to initialize the project.

Once the project has been created, you may notice two files have been added in the folder you selected:

- `data.json` - project data (don't edit this manually!)
- `./thumbnails` - hidden folder containing thumbnails for the photos used in the project

!!! note

    You cannot add or remove photos from a project after creation, and the app does not support sub-folders. This may change in the future.

The project can be opened again on the home screen from either the recent projects list or by selecting ==:octicons-file-16: Open Project File== and selecting the `data.json` file in your project folder.

Projects can be removed from the recent projects list by clicking the button with the ==:octicons-trash-16: bin icon==. Note that this does not remove the project file, thumbnails, or any exported photos from the project folder.

## Sorting and matching photos

![Project screen of the app](../assets/images/project.png?v1){ width="700" }

Once you have created a project or opened an existing one, you will see the project screen. Here you can start to sort and match photos. This can be done by clicking and dragging a photo from one 'stack' onto another, which will move it from the original stack onto the targeted one. The targeted stack will be highlighted when dragging a photo over it.

A stack is a collection of photos, and can contain any amount of photos - the ==:octicons-chevron-left-16: :octicons-chevron-right-16: arrow buttons== in the bottom-right can be used to navigate between photos in that stack. An indicator on the bottom-left shows the total number of photos in a stack and which photo is currently displayed.

There are three stacks in the project view:

### Stacks

#### Unassigned

When creating a new project, all photos are automatically assigned to the 'unassigned' stack. A progress bar below this stack shows how many photos have yet to be assigned.

#### Discarded

Below the unassigned stack is the 'discarded' stack. This is for photos that are not usable (such as poor photo quality) and are not intended to be used in the project.

#### Matches

In the main area of the screen there are several pairs of 'matched' stacks, grouped by one stack for each side of the animal (left and right).

When exporting photos (see [exporting](#exporting)) the letter in the matched stacks is used when generating file names, such as `AL`, `AR`, `BL`, `BR`, etc. These can be overridden by using the custom ID text field for each stack, which will be used in place of the letter. For example, entering `001` into the text field in the `AL` stack will result in the photo being exported as `001L` instead of `AL`.

By default there are eight pairs of matched stacks per page. Pages can be navigated by clicking the tabs on the top of the page, or by using the number keys indicated next to the page name.

On the top-right of the page there is a toggle for viewing matched stacks by two or one columns.

!!! note

    There is a set total of 52 matched stacks which cannot be increased or decreased. This will change in the future.

### Duplication

Photos can be duplicated by holding the ++ctrl++/++cmd++ key while dragging-and-dropping. The photo will be duplicated onto the target stack, with the original remaining where it was dragged from. Edits and other changes made to the duplicated photo are not reflected onto the original.

### Exporting

Once photos have been sorted and matched, these matches can be exported by opening the ==:octicons-three-bars-16: Actions== menu in the bottom-left and selecting ==:octicons-file-moved-16: Export matches==.

Exporting a project creates a new folder `matched/` in the project folder which contains all photos that were placed in matched stacks. The stack letter (or custom ID) are _appended_ to the original file name. For example, if a photo with the name `photo_1.jpg` was added to the `AL` stack, it will be exported as `AL_photo_1.jpg`.

Edits made to photos (see [edits](#editing-photos)) are applied to the exported photos. Edits can also be reverted by opening the drop-down menu and selecting ==:octicons-undo-16: Revert to original==.

Only photos in matched stacks are exported - photos in the unassigned or discarded stack are not used in the export. Once finished exporting, the exported folder will automatically open.

!!! warning

    Exporting photos will overwrite any previously exported photos, so any previous exported photos may be lost.

## Editing photos

![Edit screen of the app](../assets/images/edit.png?v1){ width="700" }

Photos can be edited to help identify marks. The photo editor can be opened by selecting the ==:octicons-pencil-16: Edit Photo== button below the photo in the project screen or by double-clicking the photo. The photo editor will open in a new window.

There are several options that can be used to edit photos in the toolbar on the bottom of the screen:

- **:material-contrast-circle: Brightness, contrast, and saturation** can be controlled with the sliders in the left of the toolbar
- **:material-magnify: Zooming** can be done by using the mousewheel on the photo (or the ==:octicons-zoom-in-16: :octicons-zoom-out-16:== buttons in the toolbar)
- **:material-cursor-move: Panning** can be done by clicking and dragging the photo (or the ==:octicons-arrow-left-16: :octicons-arrow-up-16: :octicons-arrow-down-16: :octicons-arrow-right-16:== buttons in the toolbar)
- **:material-crop: Cropping** is based on the zoom and pan of the photo - what you see in the photo editor is how the photo will be cropped

!!! note

    Original photos in your project are NEVER edited or modified in any way. Edits made to photos are only visible in the app and are used when generating matched images when exporting a project.

Edits to a photo can be saved using the ==Save== button. Edits can be reset back to their defaults by using the ==Reset== button. Closing the editor window without saving changes will be discarded. Opening a photo that has been previously edited will restore the original edit values.

You can load the previous or next photo in the stack the current photo is in using the ==:octicons-chevron-left-16: :octicons-chevron-right-16: arrow buttons==. Moving the current photo to a different stack while it is open in an editor screen will load the previous and next photos in the new stack once clicked.

Multiple photo editor windows can be open at the same time so you can compare photos side-by-side.

### Edge detection

![Edit screen of the app with edge detection enabled](../assets/images/edit-edge-detection.png?v1){ width="700" }

Edge detection can be enabled to more easily identify marks in photos.

This can be toggled by clicking the ==:octicons-eye-16: Toggle Edge Detection== button on the bottom-left of the screen above the toolbar. When enabled, a slider will appear that can be used to adjust the intensity of the filter.

Note that the edge detection filter is not used when saving or exporting images, and is purely used as a temporary filter.

## Settings

The settings menu can be opened clicking the ==:octicons-gear-16: Settings== button on the home page, using the [keyboard shortcut](#keyboard-shortcuts), or by using the menu bar option.

These settings are global (i.e. the same for all projects) and per-user on your system.

## Notes

Original photos are never modified in any way, and every effort has been made to be sure the app never unintentionally affects your original photos. However, please ensure you always have backups of your original photos regardless!

## Keyboard shortcuts

Keyboard shortcuts can be used for many functions in the app:

| Function              | Shortcut (Windows / Linux) | Shortcut (macOS) |
| --------------------- | -------------------------- | ---------------- |
| **Home screen**       |                            |                  |
| Start new project     | ++ctrl+o++                 | ++cmd+o++        |
| Open project file     | ++ctrl+shift+o++           | ++cmd+shift+o++  |
| Open settings         | ++ctrl+comma++             | ++cmd+comma++    |
| Close app             | ++ctrl+w++                 | ++cmd+w++        |
| **Project screen**    |                            |                  |
| Select page           | ++1++ - ++7++              | ++1++ - ++7++    |
| Open settings         | ++ctrl+comma++             | ++cmd+comma++    |
| Close project         | ++ctrl+w++                 | ++cmd+w++        |
| **Photo editor**      |                            |                  |
| Zoom photo in         | ++ctrl+plus++              | ++cmd+plus++     |
| Zoom photo out        | ++ctrl+minus++             | ++cmd+minus++    |
| Pan photo left        | ++arrow-left++             | ++arrow-left++   |
| Pan photo right       | ++arrow-right++            | ++arrow-right++  |
| Pan photo up          | ++arrow-up++               | ++arrow-up++     |
| Pan photo down        | ++arrow-down++             | ++arrow-down++   |
| Toggle edge detection | ++e++                      | ++e++            |
| Previous photo        | ++p++                      | ++p++            |
| Next photo            | ++n++                      | ++n++            |
| Reset photo edits     | ++ctrl+r++                 | ++cmd+r++        |
| Save photo edits      | ++ctrl+s++                 | ++cmd+s++        |
