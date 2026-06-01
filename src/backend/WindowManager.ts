import path from "node:path";
import { BrowserWindow } from "electron";

/**
 * Registry of open project windows and the edit windows linked to each.
 */
class WindowManager {
  private readonly projectDirectories = new Map<number, string | null>();
  private readonly projectWindowsById = new Map<number, BrowserWindow>();
  private readonly editWindowParents = new Map<number, number>();
  private readonly editWindowsById = new Map<number, BrowserWindow>();

  /**
   * Registers a project window. Auto-cleans state and closes child edit windows on `closed`.
   */
  registerProjectWindow(window: BrowserWindow): void {
    const id = window.id;
    this.projectWindowsById.set(id, window);
    this.projectDirectories.set(id, null);

    window.on("closed", () => {
      this.closeEditWindowsForProject(window);
      this.projectWindowsById.delete(id);
      this.projectDirectories.delete(id);
    });
  }

  /**
   * Assigns a directory to a registered window. No-op if the window isn't registered.
   */
  setProject(window: BrowserWindow, directory: string): void {
    if (!this.projectWindowsById.has(window.id)) {
      return;
    }

    this.projectDirectories.set(window.id, directory);
  }

  /**
   * Clears the project (and closes its edit windows) without closing the window itself. For
   * whole-window close, the registry cleans up automatically via the `closed` listener.
   */
  clearProject(window: BrowserWindow): void {
    this.closeEditWindowsForProject(window);

    if (this.projectWindowsById.has(window.id)) {
      this.projectDirectories.set(window.id, null);
    }
  }

  getDirectoryForWindow(window: BrowserWindow): string | null {
    return this.projectDirectories.get(window.id) ?? null;
  }

  /**
   * Resolves the directory for an IPC sender, handling both project and edit windows.
   */
  getDirectoryForSender(webContents: Electron.WebContents): string | null {
    const projectWindow = this.getProjectWindowForSender(webContents);
    if (!projectWindow) {
      return null;
    }

    return this.getDirectoryForWindow(projectWindow);
  }

  /**
   * Returns the project window for an IPC sender (parent of the sender if it's an edit window).
   */
  getProjectWindowForSender(webContents: Electron.WebContents): BrowserWindow | null {
    const window = BrowserWindow.fromWebContents(webContents);
    if (!window) {
      return null;
    }

    if (this.projectWindowsById.has(window.id)) {
      const tracked = this.projectWindowsById.get(window.id);
      return tracked && !tracked.isDestroyed() ? tracked : null;
    }

    const parentId = this.editWindowParents.get(window.id);
    if (parentId === undefined) {
      return null;
    }

    const parent = this.projectWindowsById.get(parentId);
    return parent && !parent.isDestroyed() ? parent : null;
  }

  /**
   * All currently-loaded project directories. Used by the `photo://` protocol handler.
   */
  getAllProjectDirectories(): Set<string> {
    const directories = new Set<string>();

    for (const directory of this.projectDirectories.values()) {
      if (directory !== null) {
        directories.add(directory);
      }
    }

    return directories;
  }

  /**
   * Returns the project window that has the given directory loaded, or null. Directories are
   * compared after `path.resolve()` normalisation (handles trailing separators, etc.) so a project
   * is never opened in more than one window at the same time.
   */
  findWindowForProject(directory: string): BrowserWindow | null {
    const target = path.resolve(directory);

    for (const [id, loadedDirectory] of this.projectDirectories) {
      if (loadedDirectory === null) {
        continue;
      }

      if (path.resolve(loadedDirectory) !== target) {
        continue;
      }

      const window = this.projectWindowsById.get(id);

      if (window && !window.isDestroyed()) {
        return window;
      }
    }

    return null;
  }

  /**
   * First registered window without a project, or null. Used to reuse an empty window on launch.
   */
  findIdleProjectWindow(): BrowserWindow | null {
    for (const [id, directory] of this.projectDirectories) {
      if (directory !== null) {
        continue;
      }

      const window = this.projectWindowsById.get(id);

      if (window && !window.isDestroyed()) {
        return window;
      }
    }

    return null;
  }

  hasOpenProjectWindows(): boolean {
    for (const window of this.projectWindowsById.values()) {
      if (!window.isDestroyed()) {
        return true;
      }
    }

    return false;
  }

  /**
   * Links an edit window to its parent. The link is removed automatically on `closed`.
   */
  addEditWindow(editWindow: BrowserWindow, parent: BrowserWindow): void {
    const editId = editWindow.id;
    this.editWindowsById.set(editId, editWindow);
    this.editWindowParents.set(editId, parent.id);

    editWindow.on("closed", () => {
      this.editWindowsById.delete(editId);
      this.editWindowParents.delete(editId);
    });
  }

  getParentProjectWindow(editWindow: BrowserWindow): BrowserWindow | null {
    const parentId = this.editWindowParents.get(editWindow.id);

    if (parentId === undefined) {
      return null;
    }

    const parent = this.projectWindowsById.get(parentId);
    return parent && !parent.isDestroyed() ? parent : null;
  }

  getEditWindowsForProject(projectWindow: BrowserWindow): BrowserWindow[] {
    const projectId = projectWindow.id;
    const result: BrowserWindow[] = [];

    for (const [editId, parentId] of this.editWindowParents) {
      if (parentId !== projectId) {
        continue;
      }

      const editWindow = this.editWindowsById.get(editId);
      if (editWindow) {
        result.push(editWindow);
      }
    }

    return result;
  }

  /**
   * Closes a project's edit windows. Iterates over a snapshot so `closed` listeners can safely
   * mutate the underlying maps.
   */
  closeEditWindowsForProject(projectWindow: BrowserWindow): void {
    const editWindows = this.getEditWindowsForProject(projectWindow);

    for (const editWindow of editWindows) {
      if (!editWindow.isDestroyed() && editWindow.closable) {
        editWindow.close();
      }
    }
  }
}

export const windowManager = new WindowManager();
