import type { Directory, FileName } from "@/types";

import { action, computed, makeObservable, observable } from "mobx";

class Photo {
  readonly directory;
  readonly name;
  readonly edited: string;
  readonly thumbnail: string;
  version: number;

  foo: string;

  constructor(directory: Directory, name: FileName, edited: FileName, thumbnail: FileName) {
    makeObservable(this, {
      version: observable,
      getThumbnailFileName: observable,
      thumbnailFullPath: computed,
      refreshThumbnail: action,
      foo: observable,
    });

    this.directory = directory;
    this.name = name;
    this.edited = edited;
    this.thumbnail = thumbnail;

    this.version = 0;

    const path = [this.directory, this.thumbnail].join("/");
    this.foo = `${path}?${this.version}`;
  }

  public getFullPath() {
    return [this.directory, this.name].join("/");
  }

  public getFileName() {
    return this.name;
  }

  public getEditedFullPath(): string {
    return [this.directory, this.edited].join("/");
  }

  public getEditedFileName(): string {
    return this.edited;
  }

  get thumbnailFullPath(): string {
    const path = [this.directory, this.thumbnail].join("/");
    return `${path}?${this.version}`;
  }

  public getThumbnailFullPath(): string {
    const path = [this.directory, this.thumbnail].join("/");
    return `${path}?${this.version}`;
  }

  public getThumbnailFileName(): string {
    return this.thumbnail;
  }

  public refreshThumbnail(): void {
    console.log("updating thumbnail");
    this.version++;
  }
}

export default Photo;
