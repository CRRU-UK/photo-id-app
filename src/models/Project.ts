import { PROJECT_STORAGE_NAME } from "@/constants";
import type { CollectionBody, Directory, Matches, ProjectBody } from "@/types";

import { makeObservable, observable } from "mobx";

import Collection from "./Collection";
import Photo from "./Photo";

class Project {
  version: string;
  id: string;
  directory: Directory;
  allPhotos: Set<Photo>;
  unassigned: Collection;
  discarded: Collection;
  matched: Matches;
  created: Date;
  lastModified: Date;

  constructor(data?: ProjectBody) {
    makeObservable(this, {
      allPhotos: observable,
      unassigned: observable,
      discarded: observable,
      matched: observable,
    });

    this.version = "v1";
    this.id = "";
    this.directory = "";
    this.allPhotos = new Set();
    this.unassigned = new Collection({ photos: new Set(), index: 0 }, this);
    this.discarded = new Collection({ photos: new Set(), index: 0 }, this);
    this.matched = new Set();
    this.created = new Date();
    this.lastModified = new Date();

    console.log("New project intalisized");
    console.log("data", data);

    if (data) {
      this.loadFromJSON(data);
    }
  }

  refreshThumbnail(name: string) {
    const photo = Array.from(this.allPhotos).find((photo) => photo.name === name);

    if (!photo) {
      return console.error("Unable to find photo with name:", name);
    }

    photo.refreshThumbnail();
  }

  private mapPhotoBodyToCollection(directory: Directory, collection: CollectionBody): Collection {
    const photos = collection.photos.map(({ name, edited, thumbnail }) => {
      const photo = new Photo(directory, name, edited, thumbnail);
      this.allPhotos.add(photo);
      return photo;
    });

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

    const { version, directory, unassigned, matched, discarded, created, lastModified } =
      data as ProjectBody;

    this.version = version;
    this.directory = directory;

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

    console.debug("load from json", this);
    return this;
  }

  private returnAsJSONString(): string {
    const data: ProjectBody = {
      version: this.version,
      id: this.id,
      directory: this.directory,
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

    const newPhoto = new Photo(result.directory, result.name, result.edited, result.thumbnail);

    to.addPhoto(newPhoto);
    this.allPhotos.add(newPhoto);

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
