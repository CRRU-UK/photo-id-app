import { action, computed, makeObservable, observable } from "mobx";

import type Photo from "@/models/Photo";
import type Project from "@/models/Project";

interface CollectionOptions {
  name?: string;
  index: number;
  photos: Photo[];
}

class Collection {
  name?: string;
  index: number;
  photos: Photo[];
  private readonly project: Project;

  constructor({ name = undefined, index = 0, photos }: CollectionOptions, project: Project) {
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
    this.photos.push(photo);

    // Move stack to latest photo when adding
    this.index = this.photos.length - 1;

    this.project.save();
    return this;
  }

  removePhoto(photo: Photo): this {
    const photoIndex = this.photos.indexOf(photo);
    if (photoIndex !== -1) {
      this.photos.splice(photoIndex, 1);
    }

    if (this.index + 1 > this.photos.length) {
      this.index--;
    }

    return this;
  }

  hasPhoto(photo: Photo): boolean {
    return this.photos.includes(photo);
  }

  get currentPhoto(): Photo | null {
    if (this.photos.length === 0) {
      return null;
    }

    return this.photos[this.index];
  }

  setPreviousPhoto(): this {
    let newIndex = (this.index - 1) % this.photos.length;
    if (newIndex < 0) {
      newIndex = this.photos.length - 1;
    }
    this.index = newIndex;

    this.project.save();
    return this;
  }

  setNextPhoto(): this {
    this.index = (this.index + 1) % this.photos.length;

    this.project.save();
    return this;
  }

  setName(name: string): this {
    this.name = name;

    this.project.save();
    return this;
  }
}

export default Collection;
