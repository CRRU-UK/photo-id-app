import type { Directory, PhotoStack, Matches, ProjectBody } from "@/types";

import Photo from "./Photo";

class Project {
  version: string;
  id: string;
  directory: Directory;
  totalPhotos: number;
  photos: PhotoStack;
  matched: Matches;
  discarded: PhotoStack;
  created: Date;
  lastModified: Date;

  constructor(
    version = "v1",
    id = "",
    directory = "",
    totalPhotos = 0,
    photos: PhotoStack = new Set(),
    matched: Matches = new Set(),
    discarded: PhotoStack = new Set(),
    created: string = new Date().toISOString(),
    lastModified: string = new Date().toISOString(),
  ) {
    this.version = version;
    this.id = id;
    this.directory = directory;
    this.totalPhotos = totalPhotos;
    this.photos = new Set(photos);
    this.matched = new Set(matched);
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

    const matchedSets = matched.map(({ id, left, right }) => ({
      id,
      left: {
        name: left.name,
        photos: new Set(left.photos.map((file) => new Photo(file, directory))),
      },
      right: {
        name: right.name,
        photos: new Set(right.photos.map((file) => new Photo(file, directory))),
      },
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
      photos: Array.from(this.photos).map((item) => item.getFileName()),
      matched: Array.from(this.matched).map((item) => ({
        id: item.id,
        left: {
          photos: Array.from(item.left.photos).map((item) => item.getFileName()),
          name: item.left.name,
        },
        right: {
          photos: Array.from(item.right.photos).map((item) => item.getFileName()),
          name: item.right.name,
        },
      })),
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

  public addPhotoToStack(from: PhotoStack, to: PhotoStack, photo: Photo): this {
    if (to.has(photo)) {
      return this;
    }

    from.delete(photo);
    to.add(photo);

    this.save();
    return this;
  }
}

export default Project;
