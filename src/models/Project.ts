import type { DIRECTORY, MATCH, PROJECT_JSON_BODY } from "../helpers/types";

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

  public loadFromJSON(json: PROJECT_JSON_BODY | string): this {
    let data = json;

    if (typeof json === "string") {
      data = JSON.parse(json);
    }

    const { version, directory, totalPhotos, photos, matched, discarded } =
      data as PROJECT_JSON_BODY;

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

  private returnAsJSONString(): string {
    const data: PROJECT_JSON_BODY = {
      version: this.version,
      directory: this.directory,
      totalPhotos: this.totalPhotos,
      photos: Array.from(this.photos).map((item) => item.getFileName()),
      matched: [], // Temporary
      discarded: Array.from(this.discarded).map((item) => item.getFileName()),
    };

    // Format JSON to make debugging easier
    return JSON.stringify(data, null, 2);
  }

  public save() {
    window.electronAPI.saveProject(this.returnAsJSONString());
  }

  public addPhotoToSelection(photo: Photo): this {
    if (this.photos.has(photo)) {
      return this;
    }

    this.photos.add(photo);
    this.discarded.delete(photo);

    this.save();
    return this;
  }

  public addPhotoToDiscarded(photo: Photo): this {
    if (this.discarded.has(photo)) {
      return this;
    }

    this.photos.delete(photo);
    this.discarded.add(photo);

    this.save();
    return this;
  }
}

export default Project;
