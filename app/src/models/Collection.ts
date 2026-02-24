import { PhotoSet } from "@/types";

import { action, computed, makeObservable, observable } from "mobx";

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
  private readonly project: Project;

  constructor({ name = undefined, index = 0, photos }: StackOptions, project: Project) {
    makeObservable(this, {
      index: observable,
      photos: observable,
      addPhoto: action,
      removePhoto: action,
      currentPhoto: computed,
      setPreviousPhoto: action,
      setNextPhoto: action,
      setName: action,
    });

    this.name = name;
    this.index = index;
    this.photos = photos;
    this.project = project;
  }

  addPhoto(photo: Photo): this {
    this.photos.add(photo);

    // Move stack to latest photo when adding
    this.index = this.photos.size - 1;

    this.project.save();
    return this;
  }

  removePhoto(photo: Photo): this {
    this.photos.delete(photo);

    if (this.index + 1 > this.photos.size) {
      this.index--;
    }

    return this;
  }

  hasPhoto(photo: Photo): boolean {
    return this.photos.has(photo);
  }

  get currentPhoto(): Photo | null {
    if (this.photos.size === 0) {
      return null;
    }

    return Array.from(this.photos)[this.index];
  }

  setPreviousPhoto(): this {
    let newIndex = (this.index - 1) % this.photos.size;
    if (newIndex < 0) {
      newIndex = this.photos.size - 1;
    }
    this.index = newIndex;

    this.project.save();
    return this;
  }

  setNextPhoto(): this {
    this.index = (this.index + 1) % this.photos.size;

    this.project.save();
    return this;
  }

  setName(name: string): this {
    this.name = name;

    this.project.save();
    return this;
  }
}

export default Stack;
