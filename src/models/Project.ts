import type { Directory, PhotoStack, Matches, ProjectBody, PhotoBody } from "@/types";

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

  private mapPhotosToSet(photos: PhotoBody[]) {
    const items = photos.map(({ photo, thumbnail }) => new Photo(this.directory, photo, thumbnail));
    return new Set(items);
  }

  private mapPhotoStackToBody(photos: PhotoStack) {
    return Array.from(photos).map((photo) => ({
      photo: photo.getFileName(),
      thumbnail: photo.thumbnail,
    }));
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

    this.photos = this.mapPhotosToSet(photos);

    this.discarded = this.mapPhotosToSet(discarded);

    const matchedSets = matched.map(({ id, left, right }) => ({
      id,
      left: {
        name: left.name,
        photos: this.mapPhotosToSet(left.photos),
      },
      right: {
        name: right.name,
        photos: this.mapPhotosToSet(right.photos),
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
      photos: this.mapPhotoStackToBody(this.photos),
      matched: Array.from(this.matched).map((item) => ({
        id: item.id,
        left: {
          photos: this.mapPhotoStackToBody(item.left.photos),
          name: item.left.name,
        },
        right: {
          photos: this.mapPhotoStackToBody(item.right.photos),
          name: item.right.name,
        },
      })),
      discarded: this.mapPhotoStackToBody(this.discarded),
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
