import { PROJECT_STORAGE_NAME } from "@/constants";
import type { CollectionBody, Directory, Matches, ProjectBody } from "@/types";

import Collection from "./Collection";
import Photo from "./Photo";

class Project {
  version: string;
  id: string;
  directory: Directory;
  totalPhotos: number;
  unassigned: Collection;
  discarded: Collection;
  matched: Matches;
  created: Date;
  lastModified: Date;

  constructor(
    version = "v1",
    id = "",
    directory = "",
    totalPhotos = 0,
    unassigned = new Collection({ photos: new Set(), index: 0 }, this),
    discarded = new Collection({ photos: new Set(), index: 0 }, this),
    matched: Matches = new Set(),
    created: string = new Date().toISOString(),
    lastModified: string = new Date().toISOString(),
  ) {
    this.version = version;
    this.id = id;
    this.directory = directory;
    this.totalPhotos = totalPhotos;
    this.unassigned = unassigned;
    this.discarded = discarded;
    this.matched = new Set(matched);
    this.created = new Date(created);
    this.lastModified = new Date(lastModified);
  }

  private mapPhotoBodyToCollection(directory: Directory, collection: CollectionBody): Collection {
    const photos = collection.photos.map(
      ({ name, edited, thumbnail }) => new Photo(directory, name, edited, thumbnail),
    );

    return new Collection(
      { photos: new Set(photos), index: collection.index, name: collection.name },
      this,
    );
  }

  private mapCollectionToBody(collection: Collection): CollectionBody {
    const photos = Array.from(collection.photos).map((photo) => ({
      directory: photo.directory,
      name: photo.getFileName(),
      edited: photo.edited,
      thumbnail: photo.thumbnail,
    }));

    return { photos, index: collection.index, name: collection.name };
  }

  public loadFromJSON(json: ProjectBody | string): this {
    let data = json;

    if (typeof json === "string") {
      data = JSON.parse(json) as ProjectBody;
    }

    const {
      version,
      directory,
      totalPhotos,
      unassigned,
      matched,
      discarded,
      created,
      lastModified,
    } = data as ProjectBody;

    this.version = version;
    this.directory = directory;
    this.totalPhotos = totalPhotos;

    this.unassigned = this.mapPhotoBodyToCollection(directory, unassigned);
    this.discarded = this.mapPhotoBodyToCollection(directory, discarded);

    const matchedSets = matched.map(({ id, left, right }) => ({
      id,
      left: this.mapPhotoBodyToCollection(directory, left),
      right: this.mapPhotoBodyToCollection(directory, right),
    }));
    this.matched = new Set(matchedSets);

    this.created = new Date(created);
    this.lastModified = new Date(lastModified);

    console.debug(this);
    return this;
  }

  private returnAsJSONString(): string {
    const data: ProjectBody = {
      version: this.version,
      id: this.id,
      directory: this.directory,
      totalPhotos: this.totalPhotos,
      unassigned: this.mapCollectionToBody(this.unassigned),
      discarded: this.mapCollectionToBody(this.discarded),
      matched: Array.from(this.matched).map((item) => ({
        id: item.id,
        left: this.mapCollectionToBody(item.left),
        right: this.mapCollectionToBody(item.right),
      })),
      created: this.created.toISOString(),
      lastModified: this.lastModified.toISOString(),
    };

    // Format JSON to make debugging easier
    return JSON.stringify(data, null, 2);
  }

  public save() {
    this.lastModified = new Date();

    const data = this.returnAsJSONString();
    window.localStorage.setItem(PROJECT_STORAGE_NAME, data);
    window.electronAPI.saveProject(data);
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
    const result = await window.electronAPI.duplicatePhotoFile({
      directory: photo.directory,
      name: photo.getFileName(),
      edited: photo.getEditedFileName(),
      thumbnail: photo.getThumbnailFileName(),
    });

    to.addPhoto(new Photo(result.directory, result.name, result.edited, result.thumbnail));

    this.totalPhotos += 1;

    this.save();

    return this;
  }

  public async exportMatches(): Promise<this> {
    const data = this.returnAsJSONString();
    await window.electronAPI.exportMatches(data);

    return this;
  }
}

export default Project;
