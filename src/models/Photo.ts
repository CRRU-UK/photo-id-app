import type Project from "@/models/Project";
import type { Directory, FileName, PhotoBody, PhotoEdits } from "@/types";

import { action, computed, makeObservable, observable } from "mobx";

interface PhotoOptions {
  directory: Directory;
  name: FileName;
  edited?: FileName | null;
  thumbnail: FileName;
  edits: PhotoEdits;
}

class Photo {
  readonly directory;
  private readonly name: string;
  private edited?: string | null;
  private readonly thumbnail: string;
  private readonly project: Project;
  version: number;
  private edits: PhotoEdits;

  constructor(
    { directory, name, edited = null, thumbnail, edits }: PhotoOptions,
    project: Project,
  ) {
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
    this.edits = { ...edits, pan: { ...edits.pan } };

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

  get editsData(): PhotoEdits {
    return { ...this.edits, pan: { ...this.edits.pan } };
  }

  toBody(): PhotoBody {
    return {
      directory: this.directory,
      name: this.fileName,
      edited: this.editedFileName,
      thumbnail: this.thumbnailFileName,
      edits: this.editsData,
    };
  }

  public updatePhoto(data: PhotoBody): this {
    this.edited = data.edited;
    this.edits = { ...data.edits, pan: { ...data.edits.pan } };
    this.version++;

    this.project.save();

    return this;
  }
}

export default Photo;
