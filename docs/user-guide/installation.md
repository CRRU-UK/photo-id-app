---
title: Installation
description: How to download and install the app.
---

To download and install the app, go to the latest release on the app's GitHub page:

[github.com/CRRU-UK/photo-id-app/releases/latest](https://github.com/CRRU-UK/photo-id-app/releases/latest)

Then, depending on your platform, download the appropriate file from the release page "Assets" section:

## Platforms

### Windows

1. Download the `Photo.ID-{version}.Setup.exe` file
2. Open and run the executable to install the app
3. The app will open automatically after being installed - otherwise it can be opened from the Start menu

!!! warning

    When opening the setup executable Windows will show a "Windows protected your PC" warning. Click on "More info" and then click on "Run anyway".

### macOS

1. Download the `Photo.ID-darwin-arm64-{version}.zip` file
2. Extract the archive
3. Move the `Photo ID.app` file into your Applications folder and open it

!!! warning

    The app is currently not signed and will throw an error on opening - this will be fixed soon.

### Linux

1. Download the `Photo.ID-{version}.deb` file (Debian/Ubuntu) or the `Photo.ID-{version}.rpm` file (Fedora/RHEL)
2. Install using your package manager:
     - **Debian/Ubuntu**: `sudo dpkg -i Photo.ID-{version}.deb`
     - **Fedora/RHEL**: `sudo rpm -i Photo.ID-{version}.rpm`
3. Launch the app from your application menu or by running `photo-id` in the terminal

!!! note

    Auto-updates are not currently supported on Linux. To upgrade, download and install the new package manually from the [releases page](https://github.com/CRRU-UK/photo-id-app/releases).

## Auto updates

The app will auto-update when there are new releases, so there is no need to download and install newer versions.

Should you wish to manually upgrade or install an older version of the app, previous releases are available on the [releases page on GitHub](https://github.com/CRRU-UK/photo-id-app/releases).
