import path from "node:path";
import { BrowserWindow } from "electron";

/**
 * Normalises a directory path for comparison: resolves `..`/trailing separators, and on Windows
 * lower-cases the result (NTFS is case-insensitive by default, so `C:\Foo` and `c:\foo` refer to
 * the same location). POSIX paths are case-sensitive and returned as-is.
 */
const normaliseDirectory = (directory: string): string => {
  const resolved = path.resolve(directory);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
};

/**
 * Registry of open project windows and the edit windows linked to each.
 */
class WindowManager {
  private readonly projectDirectories = new Map<number, string | null>();
  private readonly projectWindowsById = new Map<number, BrowserWindow>();
  private readonly editWindowParents = new Map<number, number>();
  private readonly editWindowsById = new Map<number, BrowserWindow>();

  /**
   * Registers a project window. The `close` listener gives child edit windows a chance to prompt
   * the user for unsaved changes BEFORE the parent goes away; if any prompt is cancelled, the
   * parent stays open too. The `closed` listener cleans up registry state and acts as a fallback
   * for force-destroy paths (where `close` is bypassed).
   */
  registerProjectWindow(window: BrowserWindow): void {
    const id = window.id;
    this.projectWindowsById.set(id, window);
    this.projectDirectories.set(id, null);

    window.on("close", (event) => {
      const editWindows = this.getEditWindowsForProject(window);
      if (editWindows.length === 0) {
        return;
      }

      event.preventDefault();
      void this.closeAllWindows(window, editWindows);
    });

    window.on("closed", () => {
      // Fallback for force-destroy (which bypasses the `close` event). In the normal flow the
      // edit windows have already been closed in the `close` handler above.
      this.closeEditWindowsForProject(window);
      this.projectWindowsById.delete(id);
      this.projectDirectories.delete(id);
    });
  }

  /**
   * Closes a parent's edit windows sequentially, then closes the parent. If any edit window's
   * unsaved-edits prompt is cancelled by the user, the parent is left open so the user can
   * resolve the prompt before retrying the close.
   */
  private readonly closeAllWindows = async (
    parentWindow: BrowserWindow,
    editWindows: BrowserWindow[],
  ): Promise<void> => {
    for (const editWindow of editWindows) {
      const closed = await this.tryCloseEditWindow(editWindow);
      if (!closed) {
        return;
      }
    }

    if (!parentWindow.isDestroyed()) {
      parentWindow.close();
    }
  };

  /**
   * Asks an edit window to close. Resolves true if it closed (no unsaved edits, or the user
   * chose Discard); false if the close was cancelled by the user's prompt and the window is
   * still alive. Electron does not emit an event when a `will-prevent-unload` handler declines
   * to call `preventDefault`, so cancellation is inferred from a short timeout — comfortably
   * longer than the gap between `close()` and the `closed` event in the normal flow.
   */
  private readonly tryCloseEditWindow = (editWindow: BrowserWindow): Promise<boolean> => {
    return new Promise((resolve) => {
      if (editWindow.isDestroyed()) {
        resolve(true);
        return;
      }

      let settled = false;

      const onClosed = () => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(true);
      };

      editWindow.once("closed", onClosed);
      editWindow.close();

      setTimeout(() => {
        if (settled || editWindow.isDestroyed()) {
          return;
        }
        editWindow.off("closed", onClosed);
        settled = true;
        resolve(false);
      }, 250);
    });
  };

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
   * compared after `path.resolve()` normalisation (handles trailing separators, etc.) and, on
   * Windows where the filesystem is case-insensitive by default, after lower-casing, so opening
   * the same project via `C:\Whales` and `c:\whales` is recognised as the same project.
   */
  findWindowForProject(directory: string): BrowserWindow | null {
    const target = normaliseDirectory(directory);

    for (const [id, loadedDirectory] of this.projectDirectories) {
      if (loadedDirectory === null) {
        continue;
      }

      if (normaliseDirectory(loadedDirectory) !== target) {
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
