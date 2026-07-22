import fs from "node:fs";
import path from "node:path";
import { app, BrowserWindow } from "electron";

/**
 * Normalises a directory path for comparison: resolves `..`/trailing separators and symlinks so
 * the same project opened via a symlink and its real path is recognised as one project, and on
 * Windows lower-cases the result (NTFS is case-insensitive by default, so `C:\Foo` and `c:\foo`
 * refer to the same location). POSIX paths are case-sensitive and returned as-is.
 */
const normaliseDirectory = (directory: string): string => {
  let resolved = path.resolve(directory);

  try {
    // Resolve symlinks so `~/Dropbox/whales` and the recents-list real path dedupe to one window
    resolved = fs.realpathSync.native(resolved);
  } catch {
    // Path may not exist yet (e.g. a directory reserved mid-load), fall back to the resolved path
  }

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
  private readonly editCloseResolvers = new Map<number, (closed: boolean) => void>();
  private readonly editClosePromises = new Map<number, Promise<boolean>>();
  private readonly loadingWindowIds = new Set<number>();
  private readonly closingProjectIds = new Set<number>();
  private isQuitting = false;

  constructor() {
    /**
     * Track whether an `app.quit()` is in progress so the cascade can re-fire `app.quit()` after
     * closing edit windows. `event.preventDefault()` on the parent's close cancels the original
     * quit, and there is no other path that would restart it once the edit windows are clean.
     */
    app.on("before-quit", () => {
      this.isQuitting = true;
    });
  }

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

      /**
       * Capture the quit state at close-event time. When multiple project windows are closed by the
       * same `app.quit()`, a concurrent cascade resetting `isQuitting=false` (because the user
       * cancelled its prompt) correctly cancels the re-fire for any cascade that hasn't reached its
       * check yet. In practice the unsaved-edits prompts are sync (`showMessageBoxSync`) so they
       * serialise, the cancelled cascade resets the flag before any sibling's success path checks
       * it.
       */
      const wasQuitting = this.isQuitting;

      void this.closeAllWindows(window, editWindows, wasQuitting);
    });

    window.on("closed", () => {
      // Fallback for force-destroy (which bypasses the `close` event). In the normal flow the
      // edit windows have already been closed in the `close` handler above.
      this.closeEditWindowsForProject(window);
      this.projectWindowsById.delete(id);
      this.projectDirectories.delete(id);
      this.loadingWindowIds.delete(id);
      this.closingProjectIds.delete(id);
    });
  }

  /**
   * Closes a parent's edit windows sequentially, then closes the parent. If any edit window's
   * unsaved-edits prompt is cancelled by the user, the parent is left open so the user can
   * resolve the prompt before retrying the close, and if the close was triggered by `app.quit()`,
   * the quit is treated as cancelled too (the original quit was already aborted by the parent's
   * `event.preventDefault()`). On the success path, re-fire `app.quit()` so the quit resumes,
   * otherwise the deferred close would leave the app running with no windows.
   */
  private readonly closeAllWindows = async (
    parentWindow: BrowserWindow,
    editWindows: BrowserWindow[],
    wasQuitting: boolean,
  ): Promise<void> => {
    this.closingProjectIds.add(parentWindow.id);

    try {
      for (const editWindow of editWindows) {
        const closed = await this.tryCloseEditWindow(editWindow);
        if (!closed) {
          // Tell any concurrent cascades that the quit has been vetoed by the user
          this.isQuitting = false;
          return;
        }
      }

      if (!parentWindow.isDestroyed()) {
        parentWindow.close();
      }

      /**
       * Only re-fire `app.quit()` if this cascade started under a quit AND no concurrent cascade
       * has since cancelled it. Without the `isQuitting` recheck, a sibling cascade's cancel
       * wouldn't prevent us re-firing the quit, Electron would then re-trigger close events on the
       * vetoing window and prompt the user again.
       */
      if (wasQuitting && this.isQuitting) {
        this.isQuitting = false;
        app.quit();
      }
    } finally {
      this.closingProjectIds.delete(parentWindow.id);
    }
  };

  /**
   * Asks an edit window to close. Resolves true if it closed (no unsaved edits, or the user
   * chose Discard); false if the user cancelled the unsaved-edits prompt, signalled explicitly
   * by `editorHandlers` via `signalEditCancel`. The previous timeout-based inference fired the
   * cancel signal whenever `showMessageBoxSync` blocked the main thread longer than 250 ms
   * (i.e. on every realistic dialog interaction).
   *
   * Concurrent callers (the window-close cascade and the "close project" IPC can target the same
   * edit window) share one in-flight close via `editClosePromises`. Without this, the second
   * caller's resolver would overwrite the first's and strand the first promise unresolved.
   */
  private readonly tryCloseEditWindow = (editWindow: BrowserWindow): Promise<boolean> => {
    if (editWindow.isDestroyed()) {
      return Promise.resolve(true);
    }

    const id = editWindow.id;

    const inFlight = this.editClosePromises.get(id);
    if (inFlight) {
      return inFlight;
    }

    const promise = new Promise<boolean>((resolve) => {
      const onClosed = () => settle(true);

      const settle = (value: boolean) => {
        this.editCloseResolvers.delete(id);
        this.editClosePromises.delete(id);
        editWindow.off("closed", onClosed);
        resolve(value);
      };

      this.editCloseResolvers.set(id, settle);
      editWindow.once("closed", onClosed);
      editWindow.close();
    });

    this.editClosePromises.set(id, promise);
    return promise;
  };

  /**
   * Called by the edit window's `will-prevent-unload` handler when the user picks Cancel on the
   * unsaved-edits prompt. Resolves any pending `tryCloseEditWindow` for this window with `false`
   * (no-op if there isn't one — e.g. user closed the window directly without a cascade).
   */
  signalEditCancel(editWindow: BrowserWindow): void {
    this.editCloseResolvers.get(editWindow.id)?.(false);
  }

  /**
   * Reserves a directory for a window whose project is still loading (thumbnail generation, file
   * parse). The window matches `findWindowForProject` (so a concurrent open of the same folder
   * focuses this window instead of starting a second copy) but `isProjectLoading` stays true until
   * `setProject` commits the loaded project, so `handleGetCurrentProject` won't serve a stale or
   * not-yet-written `project.photoid`. No-op if the window isn't registered.
   */
  reserveProjectLoading(window: BrowserWindow, directory: string): void {
    if (!this.projectWindowsById.has(window.id)) {
      return;
    }

    this.projectDirectories.set(window.id, directory);
    this.loadingWindowIds.add(window.id);
  }

  /**
   * Commits a loaded project to a registered window. No-op if the window isn't registered.
   */
  setProject(window: BrowserWindow, directory: string): void {
    if (!this.projectWindowsById.has(window.id)) {
      return;
    }

    this.projectDirectories.set(window.id, directory);
    this.loadingWindowIds.delete(window.id);
  }

  isProjectLoading(window: BrowserWindow): boolean {
    return this.loadingWindowIds.has(window.id);
  }

  /**
   * True while a "close project" / window-close cascade is in flight for this project window, so
   * callers (e.g. opening an edit window) can refuse to start work that the cascade won't see.
   */
  isClosingProject(window: BrowserWindow): boolean {
    return this.closingProjectIds.has(window.id);
  }

  /**
   * Clears the project (and closes its edit windows) without closing the window itself. For
   * whole-window close, the registry cleans up automatically via the `closed` listener. This
   * fire-and-forget cascade is only safe when the edit windows have no unsaved edits — for the
   * user-initiated "close project" flow, use `closeProjectInWindow` instead.
   */
  clearProject(window: BrowserWindow): void {
    this.closeEditWindowsForProject(window);
    this.loadingWindowIds.delete(window.id);

    if (this.projectWindowsById.has(window.id)) {
      this.projectDirectories.set(window.id, null);
    }
  }

  /**
   * Closes the project's edit windows one at a time, surfacing each window's unsaved-edits prompt
   * before clearing the parent's project state. Returns false if any prompt is cancelled — in
   * which case the parent's directory is left intact so the user can resolve the prompt before
   * retrying. Use this from the "close project" IPC handler so the cascade matches the
   * window-close cascade in `registerProjectWindow`.
   */
  async closeProjectInWindow(window: BrowserWindow): Promise<boolean> {
    const editWindows = this.getEditWindowsForProject(window);
    this.closingProjectIds.add(window.id);

    try {
      for (const editWindow of editWindows) {
        const closed = await this.tryCloseEditWindow(editWindow);
        if (!closed) {
          return false;
        }
      }

      if (this.projectWindowsById.has(window.id)) {
        this.projectDirectories.set(window.id, null);
        this.loadingWindowIds.delete(window.id);
      }

      return true;
    } finally {
      this.closingProjectIds.delete(window.id);
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
