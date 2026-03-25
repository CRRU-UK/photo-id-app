---
title: Installation
description: How to download and install the app.
---

## System requirements

|                | Minimum                                                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Windows**    | Windows 10 or later                                                                                                                                |
| **macOS**      | macOS 11 (Big Sur) or later                                                                                                                        |
| **Linux**      | Ubuntu 20.04+, Fedora 32+, Debian 10+, or equivalent                                                                                               |
| **RAM**        | 4 GB (8 GB recommended for large photo sets)                                                                                                       |
| **Disk space** | Depends on project size; thumbnails are generated alongside original photos and require additional disk space proportional to the number of photos |

!!! tip

    For best performance with large photo sets (500+ photos), 8 GB or more of RAM is recommended. The app stores thumbnails on disk rather than in memory to keep memory usage low.

## Download

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

1. Download the `Photo ID.dmg` file
2. Open the DMG file
3. In the window that opens, move the `Photo ID.app` file into your Applications folder
4. Open the _Photo ID_ app from your Applications folder

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
