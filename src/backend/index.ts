import type { IpcMainEvent } from 'electron';

import { app, BrowserWindow } from 'electron';

const handleSetTitle = (
  event: IpcMainEvent,
  title: string,
) => {
  const webContents = event.sender;
  const window = BrowserWindow.fromWebContents(webContents);
  window.setTitle(title);
  app.dock.setBadge(title);
}

export {
  handleSetTitle,
}
