import { PhotoSet } from "@/types";

import type Photo from "@/models/Photo";
import type Project from "@/models/Project";

interface StackOptions {
  name?: string;
  index: number;
  photos: PhotoSet;
}

class Stack {
  name?: string;
  index: number;
  photos: PhotoSet;
  project: Project;

  constructor({ name = undefined, index = 0, photos }: StackOptions, project: Project) {
    this.name = name;
    this.index = index;
    this.photos = photos;

    this.project = project;
  }

  addPhoto(photo: Photo): this {
    this.photos.add(photo);
    // this.project.save();
    return this;
  }

  removePhoto(photo: Photo): this {
    this.photos.delete(photo);
    // this.project.save();
    return this;
  }

  hasPhoto(photo: Photo): boolean {
    return this.photos.has(photo);
  }

  getCurrentPhoto(): Photo | undefined {
    return Array.from(this.photos)[this.index];
  }

  increaseIndex(): this {
    this.index = (this.index + 1) % this.photos.size;
    // this.project.save();
    return this;
  }

  decreaseIndex(): this {
    this.index = (this.index - 1) % this.photos.size;
    // this.project.save();
    return this;
  }
}

export default Stack;
