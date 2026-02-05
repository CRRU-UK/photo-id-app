import { PROJECT_STORAGE_NAME } from "@/constants";
import type { CollectionBody, Directory, Matches, PhotoBody, ProjectBody } from "@/types";

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

    if (data) {
      console.log("Loading data from json:", data);
      this.loadFromJSON(data);
    }
  }

  updatePhoto(data: PhotoBody) {
    const photo = Array.from(this.allPhotos).find((photo) => photo.fileName === data.name);

    if (!photo) {
      return console.error("Unable to find photo with name:", data.name);
    }

    photo.updatePhoto(data);
  }

  private mapPhotoBodyToCollection(directory: Directory, collection: CollectionBody): Collection {
    const photos = collection.photos.map(({ name, thumbnail, edits }) => {
      const photo = new Photo({ directory, name, thumbnail, edits }, this);
      this.allPhotos.add(photo);
      return photo;
    });

    return new Collection(
      { photos: new Set(photos), index: collection.index, name: collection.name },
      this,
    );
  }

  private mapCollectionToBody(collection: Collection): CollectionBody {
    const photos: PhotoBody[] = Array.from(collection.photos).map((photo) => photo.toBody());

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

    console.debug("Loaded project from data:", this);
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
      name: photo.fileName,
      thumbnail: photo.thumbnailFileName,
      edits: photo.editsData,
      isEdited: photo.isEdited,
    });

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
