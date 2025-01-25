import path from "path";
import { app, BrowserWindow, ipcMain, Menu } from "electron";
import started from "electron-squirrel-startup";

import handleOpenFolder from "./backend/openFolder";

if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      webSecurity: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  const menu = Menu.buildFromTemplate([
    {
      label: "File",
      submenu: [
        {
          label: "Open Folder",
          accelerator: "CmdOrCtrl+O",
          async click() {
            handleOpenFolder(mainWindow);
          },
        },
      ],
    },
  ]);

  Menu.setApplicationMenu(menu);

  mainWindow.webContents.openDevTools();
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  ipcMain.on("open-folder", (event) => {
    const webContents = event.sender;
    const window = BrowserWindow.fromWebContents(webContents);
    handleOpenFolder(window);
  });
});
