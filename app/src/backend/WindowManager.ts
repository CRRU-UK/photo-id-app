import type { BrowserWindow } from "electron";

/**
 * Encapsulates main and edit window references and their lifecycle.
 * Cleans up references when windows are closed to avoid stale references.
 */
class WindowManager {
  private mainWindow: BrowserWindow | null = null;
  private readonly editWindows = new Set<BrowserWindow>();

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;

    window.on("closed", () => {
      this.mainWindow = null;
    });
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow && !this.mainWindow.isDestroyed() ? this.mainWindow : null;
  }

  addEditWindow(window: BrowserWindow): void {
    this.editWindows.add(window);

    window.on("closed", () => {
      this.editWindows.delete(window);
    });
  }

  closeAllEditWindows(): void {
    for (const window of this.editWindows) {
      if (!window.isDestroyed() && window.closable) {
        window.close();
      }
    }

    this.editWindows.clear();
  }
}

export const windowManager = new WindowManager();
