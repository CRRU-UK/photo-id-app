import type { DIRECTORY, PHOTO_STACK, MATCH, PROJECT_JSON } from "../helpers/types";

import Photo from "../models/Photo";

class Project {
  version?: string;
  directory?: DIRECTORY;
  photos?: PHOTO_STACK;
  matched?: MATCH[];
  discarded?: PHOTO_STACK;

  constructor(
    version = "v1",
    directory: DIRECTORY = "",
    photos: PHOTO_STACK = [],
    matched: MATCH[] = [],
    discarded: PHOTO_STACK = [],
  ) {
    this.version = version;
    this.directory = directory;
    this.photos = photos;
    this.matched = matched;
    this.discarded = discarded;
  }

  public loadFromJSON(json: PROJECT_JSON | string): this {
    let data = json;

    if (typeof json === "string") {
      data = JSON.parse(json);
    }

    const { version, directory, photos, matched, discarded } = data as PROJECT_JSON;

    this.version = version;
    this.directory = directory;
    this.photos = photos.map((file) => new Photo(file, directory));
    this.discarded = discarded.map((file) => new Photo(file, directory));

    this.matched = matched.map(({ id, left, right }) => ({
      id,
      left: left.map((file) => new Photo(file, directory)),
      right: right.map((file) => new Photo(file, directory)),
    }));

    return this;
  }

  public saveAsJSON(): string {
    const data = {
      version: this.version,
      directory: this.directory,
      photos: this.photos,
      matched: this.matched,
      discarded: this.discarded,
    };

    return JSON.stringify(data);
  }
}

export default Project;
