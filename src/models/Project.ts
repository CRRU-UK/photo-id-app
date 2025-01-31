import type { Directory, Match, ProjectBody } from "../types";

import Photo from "../models/Photo";

class Project {
  version?: string;
  id?: string;
  directory?: Directory;
  totalPhotos?: number;
  photos?: Set<Photo>;
  matched?: Match[];
  discarded?: Set<Photo>;
  created?: Date;
  lastModified?: Date;

  constructor(
    version?: "v1",
    id?: "",
    directory?: "",
    totalPhotos?: 0,
    photos?: [],
    matched?: [],
    discarded?: [],
    created = new Date().toISOString(),
    lastModified = new Date().toISOString(),
  ) {
    this.version = version;
    this.id = id;
    this.directory = directory;
    this.totalPhotos = totalPhotos;
    this.photos = new Set(photos);
    this.matched = matched;
    this.discarded = new Set(discarded);
    this.created = new Date(created);
    this.lastModified = new Date(lastModified);
  }

  public loadFromJSON(json: ProjectBody | string): this {
    let data = json;

    if (typeof json === "string") {
      data = JSON.parse(json);
    }

    const { version, directory, totalPhotos, photos, matched, discarded, created, lastModified } =
      data as ProjectBody;

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

    this.created = new Date(created);
    this.lastModified = new Date(lastModified);

    return this;
  }

  private returnAsJSONString(): string {
    const data: ProjectBody = {
      version: this.version,
      id: this.id,
      directory: this.directory,
      totalPhotos: this.totalPhotos,
      photos: Array.from(this.photos).map((item) => item.getFileName()),
      matched: [], // Temporary
      discarded: Array.from(this.discarded).map((item) => item.getFileName()),
      created: this.created.toISOString(),
      lastModified: this.lastModified.toISOString(),
    };

    // Format JSON to make debugging easier
    return JSON.stringify(data, null, 2);
  }

  public save() {
    this.lastModified = new Date();
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
