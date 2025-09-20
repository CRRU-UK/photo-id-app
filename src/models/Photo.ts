import type Project from "@/models/Project";
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
  private readonly project: Project;
  version: number;

  constructor({ directory, name, edited = null, thumbnail }: PhotoOptions, project: Project) {
    makeObservable(this, {
      fileName: computed,
      editedFileName: computed,
      thumbnailFileName: computed,
      thumbnailFullPath: computed,
      updatePhoto: action,
      version: observable,
    });

    this.directory = directory;
    this.name = name;
    this.edited = edited;
    this.thumbnail = thumbnail;
    this.version = 1;

    this.project = project;
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

  public updatePhoto(data: PhotoBody): this {
    this.edited = data.edited;
    this.version++;

    this.project.save();

    return this;
  }
}

export default Photo;
