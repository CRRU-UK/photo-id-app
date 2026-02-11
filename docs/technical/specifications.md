---
title: Specifications
description: Specifications for user journeys and flows.
---

The following describes the specifications of user journeys and flows, and is intended for end-to-end tests and coding agent context.

## Windows

- There can only be ONE main window, which is created when the app starts
- The main window should ONLY show the index (`/`) or project (`/project`) views
- The main window should show the window menu
- Edit windows should ONLY show the edit view (`/edit`)
- Edit windows are ONLY created from the main window
- Edit windows do NOT show the window menu
- There can be multiple edit windows
- Edit windows should NEVER show the project or index views
- The main window should NEVER be able to navigate to the photo editor view, and the edit windows should NEVER be able to navigate to the index or project view
- If a photo cannot be loaded in an edit window, it should show the error message and NOT redirect anywhere else
- Edit windows can be closed
- When closing the project view with the keyboard shortcut, it should navigate to the index view instead of closing the window
- When closing the index view with the keyboard shortcut, it should close the window and application

## Views

### Index view

The index view is the default view when opening the app. It allows the user to:

- Start a new project in a folder
  - If a project file is already present, then it asks the user if they want to use it or overwrite it (reset it)
- Open an existing project file
- Open a project from recent projects
- Open the user guide documentation or changelog (based on the current tag) in an external browser
- Open the settings

#### Recent projects

- This shows a list of recent projects by last-opened date descending
- Recent projects can be removed with the delete button - this only removes the project from the list, not the project file from disk
- If there are no recent projects, the list is not shown

#### Settings

- The settings overlay can be opened by clicking the settings button, with the keyboard shortcut, or from the window menu
- The settings overlay can also be opened from the project view with the keyboard shortcut or window menu
- It allows you to modify the application theme and to toggle telemetry
- Changing a field value should automatically update the settings in both the frontend and backend, unless otherwise stated
- Settings should used default values on new installations
- Settings should persist between sessions

## Project View

The project view is accessed when opening a project. It allows the user to:

- Organise photos into various stacks
- Open a photo in the photo editor
- Export matches
- Change number of columns
  - The value is retained in state and not intended to be saved as a session
- Close the project (and navigate back to the index view)

### Stacks

- Stacks contain one or more photographs
- Photos can be navigated between with the previous and next buttons
- A photo edit window can be opened with a button using the currently shown photo or by double clicking on the thumbnail
- Photos are moved between stacks by clicking and dragging a photo from one stack to another
- Photos can be duplicated by clicking and dragging the photo to another stack while pressing the keyboard shortcut
- There are three main stacks in a project, described below

#### Unassigned

- In new projects all photos are added to this stack
- The user can then move photos from the unassigned stack to others
- A progress bar below this stack shows how many photos have yet to be assigned
- Photos in the unassigned stack are never exported

### Discarded

- Photos can moved into the discarded stack if they are not going to be used (i.e. have no identifiable marks or are of low quality)
- Photos in the discarded stack are never exported

### Matched

- Photos can be moved into matched stacks when they contain identifiable marks
- Matched stacks contain a pair of stacks, one for the left (L) and right (R) side of the animal
- These sides can contain multiple photos of the same side of the animal
- An optional ID can be added that is used when exporting the images
- All images in matched stacks are exported

## Edit View

- The edit view allows users to view full-sized photos in a new window
- The user can make a variety of edits to the photo:
  - Brightness, contrast, saturation can be adjusted using the sliders
  - Zooming (which also crops the photo) can be done using the buttons, mousewheel, or keyboard shortcuts
  - Panning the image can be done using the buttons, clicking and dragging, or keyboard shortcuts
- These edits can be saved to a photo by using the save button or shortcut
- Saving a photo generates a new thumbnail that updates in the project view, and updates the edit data in the project
- Edit values are used when exporting images
- Edits can be reset by using the reset button or shortcut
