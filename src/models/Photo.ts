import type { Directory, FileName, PhotoBody } from "@/types";

import { action, computed, makeObservable, observable } from "mobx";

interface PhotoOptions {
  directory: Directory;
  name: FileName;
  edited?: FileName | null;
  thumbnail: FileName;
}

class Photo {
  readonly directory;
  private readonly name: string;
  private edited?: string | null;
  private readonly thumbnail: string;
  version: number;

  constructor({ directory, name, edited = null, thumbnail }: PhotoOptions) {
    makeObservable(this, {
      fileName: computed,
      editedFileName: computed,
      thumbnailFileName: computed,
      thumbnailFullPath: computed,
      refreshThumbnail: action,
      version: observable,
    });

    this.directory = directory;
    this.name = name;
    this.edited = edited;
    this.thumbnail = thumbnail;

    this.version = 0;
  }

  get fileName() {
    return this.name;
  }

  get editedFileName(): string | null {
    return this.edited || null;
  }

  get thumbnailFileName(): string {
    return this.thumbnail;
  }

  get thumbnailFullPath(): string {
    const path = [this.directory, this.thumbnail].join("/");
    return `${path}?${this.version}`;
  }

  public refreshThumbnail(data: PhotoBody): void {
    this.version++;
    this.edited = data.edited;
  }
}

export default Photo;
