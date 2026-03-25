import { action, makeObservable, observable, runInAction } from "mobx";

import { SAVE_PROJECT_DEBOUNCE_MS } from "@/constants";
import Collection from "@/models/Collection";
import Photo from "@/models/Photo";
import type {
  CollectionBody,
  Directory,
  ExportTypes,
  Matches,
  PhotoBody,
  ProjectBody,
} from "@/types";

class Project {
  version: ProjectBody["version"];
  id: ProjectBody["id"];
  directory: Directory;
  allPhotos: Map<string, Photo>;
  unassigned: Collection;
  discarded: Collection;
  matched: Matches;
  created: Date;
  lastModified: Date;

  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly SAVE_DEBOUNCE_MS = SAVE_PROJECT_DEBOUNCE_MS;

  constructor(data?: ProjectBody) {
    makeObservable(this, {
      allPhotos: observable,
      unassigned: observable,
      discarded: observable,
      matched: observable,
      loadFromJSON: action,
    });

    this.version = "v1";
    this.id = "";
    this.directory = "";
    this.allPhotos = new Map();
    this.unassigned = new Collection({ photos: [], index: 0 }, this);
    this.discarded = new Collection({ photos: [], index: 0 }, this);
    this.matched = [];
    this.created = new Date();
    this.lastModified = new Date();

    if (data) {
      console.log("Loading data from json:", data);
      this.loadFromJSON(data);
    }
  }

  updatePhoto(data: PhotoBody) {
    const photo = this.allPhotos.get(data.name);

    if (!photo) {
      return console.error("Unable to find photo with name:", data.name);
    }

    photo.updatePhoto(data);
  }

  private mapPhotoBodyToCollection(directory: Directory, collection: CollectionBody): Collection {
    const photos = collection.photos.map(({ name, thumbnail, edits }) => {
      const photo = new Photo({ directory, name, thumbnail, edits }, this);
      this.allPhotos.set(photo.fileName, photo);
      return photo;
    });

    return new Collection({ photos, index: collection.index, name: collection.name }, this);
  }

  private mapCollectionToBody(collection: Collection): CollectionBody {
    const photos: PhotoBody[] = collection.photos.map((photo) => photo.toBody());

    return { photos, index: collection.index, name: collection.name };
  }

  /**
   * Loads project state from JSON. `runInAction` batches all observable updates into a single
   * transaction so observers re-run once instead of on every property change.
   */
  public loadFromJSON(data: ProjectBody): this {
    const { id, version, directory, unassigned, matched, discarded, created, lastModified } = data;

    runInAction(() => {
      this.allPhotos.clear();

      this.id = id;
      this.version = version;
      this.directory = directory;
      this.unassigned = this.mapPhotoBodyToCollection(directory, unassigned);
      this.discarded = this.mapPhotoBodyToCollection(directory, discarded);

      this.matched = matched.map(({ id, left, right }) => ({
        id,
        left: this.mapPhotoBodyToCollection(directory, left),
        right: this.mapPhotoBodyToCollection(directory, right),
      }));

      this.created = new Date(created);
      this.lastModified = new Date(lastModified);
    });

    console.debug("Loaded project from data:", this);
    return this;
  }

  private serialize(): string {
    const data: ProjectBody = {
      version: this.version,
      id: this.id,
      directory: this.directory,
      unassigned: this.mapCollectionToBody(this.unassigned),
      discarded: this.mapCollectionToBody(this.discarded),
      matched: this.matched.map((item) => ({
        id: item.id,
        left: this.mapCollectionToBody(item.left),
        right: this.mapCollectionToBody(item.right),
      })),
      created: this.created.toISOString(),
      lastModified: this.lastModified.toISOString(),
    };

    return JSON.stringify(data);
  }

  public save() {
    this.lastModified = new Date();

    if (this.saveDebounceTimer !== null) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = setTimeout(() => {
      this.saveDebounceTimer = null;

      const data = this.serialize();
      void window.electronAPI.saveProject(data);
    }, Project.SAVE_DEBOUNCE_MS);
  }

  /**
   * Flushes any pending debounced save immediately using synchronous IPC. Called from
   * `beforeunload` to guarantee the write completes before the window/process exits.
   */
  public flushSave() {
    if (this.saveDebounceTimer === null) {
      return;
    }

    clearTimeout(this.saveDebounceTimer);
    this.saveDebounceTimer = null;

    const data = this.serialize();
    window.electronAPI.flushSaveProject(data);
  }

  public addPhotoToStack(from: Collection, to: Collection, photo: Photo): this {
    if (to.hasPhoto(photo)) {
      return this;
    }

    from.removePhoto(photo);
    to.addPhoto(photo);

    this.save();
    return this;
  }

  public async duplicatePhotoToStack(to: Collection, photo: Photo): Promise<this> {
    const result = await window.electronAPI.duplicatePhotoFile(photo.toBody());

    const newPhoto = new Photo(
      {
        directory: result.directory,
        name: result.name,
        thumbnail: result.thumbnail,
        edits: result.edits,
      },
      this,
    );

    to.addPhoto(newPhoto);
    this.allPhotos.set(newPhoto.fileName, newPhoto);

    this.save();

    return this;
  }

  public async exportMatches(type: ExportTypes): Promise<this> {
    const data = this.serialize();
    await window.electronAPI.exportMatches(data, type);

    return this;
  }
}

export default Project;
