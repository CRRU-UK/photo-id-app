import type { DIRECTORY, MATCH, PROJECT_JSON } from "../helpers/types";

import Photo from "../models/Photo";

class Project {
  version?: string;
  directory?: DIRECTORY;
  totalPhotos?: number;
  photos?: Set<Photo>;
  matched?: MATCH[];
  discarded?: Set<Photo>;

  constructor(
    version?: "v1",
    directory?: "",
    totalPhotos?: 0,
    photos?: [],
    matched?: [],
    discarded?: [],
  ) {
    this.version = version;
    this.directory = directory;
    this.totalPhotos = totalPhotos;
    this.photos = new Set(photos);
    this.matched = matched;
    this.discarded = new Set(discarded);
  }

  public loadFromJSON(json: PROJECT_JSON | string): this {
    let data = json;

    if (typeof json === "string") {
      data = JSON.parse(json);
    }

    const { version, directory, totalPhotos, photos, matched, discarded } = data as PROJECT_JSON;

    this.version = version;
    this.directory = directory;
    this.totalPhotos = totalPhotos;

    const photosSet = photos.map((file) => new Photo(file, directory));
    this.photos = new Set(photosSet);

    const discardedSet = discarded.map((file) => new Photo(file, directory));
    this.discarded = new Set(discardedSet);

    this.matched = matched.map(({ id, left, right }) => ({
      id,
      left: left.map((file) => new Photo(file, directory)),
      right: right.map((file) => new Photo(file, directory)),
    }));

    return this;
  }

  public returnAsJSON(): string {
    const data = {
      version: this.version,
      directory: this.directory,
      photos: this.photos,
      matched: this.matched,
      discarded: this.discarded,
    };

    return JSON.stringify(data);
  }

  public addPhotoToSelection(photo: Photo): this {
    if (this.photos.has(photo)) {
      return this;
    }

    this.photos.add(photo);
    this.discarded.delete(photo);

    return this;
  }

  public addPhotoToDiscarded(photo: Photo): this {
    if (this.discarded.has(photo)) {
      return this;
    }

    this.photos.delete(photo);
    this.discarded.add(photo);

    return this;
  }
}

export default Project;
