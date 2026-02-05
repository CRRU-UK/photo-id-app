import type Project from "@/models/Project";
import type { Directory, FileName, PhotoBody, PhotoEdits } from "@/types";

import { computeIsEdited } from "@/helpers";
import { action, computed, makeObservable, observable } from "mobx";

interface PhotoOptions {
  directory: Directory;
  name: FileName;
  thumbnail: FileName;
  edits: PhotoEdits;
}

class Photo {
  readonly directory;
  private readonly name: string;
  thumbnail: string;
  private readonly project: Project;
  version: number;
  edits: PhotoEdits;

  constructor({ directory, name, thumbnail, edits }: PhotoOptions, project: Project) {
    makeObservable(this, {
      edits: observable,
      fileName: computed,
      thumbnail: observable,
      thumbnailFileName: computed,
      thumbnailFullPath: computed,
      isEdited: computed,
      updatePhoto: action,
      version: observable,
    });

    this.directory = directory;
    this.name = name;
    this.thumbnail = thumbnail;
    this.version = 1;
    this.edits = { ...edits, pan: { ...edits.pan } };

    this.project = project;
  }

  get isEdited(): boolean {
    return computeIsEdited(this.edits);
  }

  get fileName() {
    return this.name;
  }

  get thumbnailFileName(): string {
    return this.thumbnail;
  }

  get thumbnailFullPath(): string {
    const path = [this.directory, this.thumbnail].join("/");
    return `${path}?${this.version}`;
  }

  toBody(): PhotoBody {
    return {
      directory: this.directory,
      name: this.fileName,
      thumbnail: this.thumbnailFileName,
      edits: { ...this.edits, pan: { ...this.edits.pan } },
      isEdited: this.isEdited,
    };
  }

  public updatePhoto(data: PhotoBody): this {
    this.edits = { ...data.edits, pan: { ...data.edits.pan } };
    this.thumbnail = data.thumbnail;
    this.version++;

    this.project.save();

    return this;
  }
}

export default Photo;
