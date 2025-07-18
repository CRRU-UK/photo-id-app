import type { Directory, FileName } from "@/types";

import { action, computed, makeObservable, observable } from "mobx";

class Photo {
  readonly directory;
  private readonly name: string;
  private readonly edited?: string;
  private readonly thumbnail: string;
  version: number;

  constructor(directory: Directory, name: FileName, edited: FileName, thumbnail: FileName) {
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

  public refreshThumbnail(): void {
    this.version++;
  }
}

export default Photo;
