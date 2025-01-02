import type { PHOTO_DATA } from '../helpers/types';

import fs from 'fs';
import path from 'path';
import { dialog } from 'electron';

import {
  DEFAULT_WINDOW_TITLE,
  PHOTO_FILE_EXTENSIONS,
  EXISTING_DATA_MESSAGE,
  EXISTING_DATA_BUTTONS,
} from '../helpers/constants';

/**
 * Handles opening, filtering, and processing a photo folder.
 */
const handleOpenFolder = async (
  mainWindow: Electron.BrowserWindow,
) => {
  const event = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  
  if (event.canceled) {
    return;
  }

  console.log('event', event);

  const [directory] = event.filePaths;

  let files = fs.readdirSync(directory);

  console.log('files', files);

  if (files.includes('data.json')) {
    console.log('uh oh');

    const { response } = await dialog.showMessageBox({
      message: EXISTING_DATA_MESSAGE,
      type: 'question',
      buttons: EXISTING_DATA_BUTTONS,
    });

    if (response === 0) {
      console.debug('cancelled');
      return;
    }

    if (response === 1) {
      console.debug('open existing, return existing data');
      return;
    }
  }

  files = files.filter((fileName) => {
    // Filter directories
    if (!fs.lstatSync(path.join(directory, fileName)).isFile()) {
      return false;
    }

    // Filter non-images based on file extension
    if (!PHOTO_FILE_EXTENSIONS.some((extension) => extension === path.extname(fileName))) {
      return false;
    }

    return true;
  });

  const data: PHOTO_DATA = {
    version: '1',
    directory,
    files,
    matches: [],
    unused: [],
  };

  console.debug('filtered files', files);

  fs.writeFileSync(path.join(directory, 'data.json'), JSON.stringify(data), 'utf8');

  console.debug('created data.json, sending to renderer');

  mainWindow.setTitle(`${DEFAULT_WINDOW_TITLE} - ${directory}`);
  mainWindow.webContents.send('load-data', data);
}

export default handleOpenFolder;
