import { action, computed, makeObservable, observable } from "mobx";

import type Photo from "@/models/Photo";
import type Project from "@/models/Project";

interface CollectionOptions {
  index: number;
  name?: string;
  photos: Photo[];
}

class Collection {
  name?: string;
  index: number;
  photos: Photo[];
  private readonly project: Project;

  constructor({ name = undefined, index = 0, photos }: CollectionOptions, project: Project) {
    makeObservable(this, {
      name: observable,
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

  addPhoto(photo: Photo): void {
    this.photos.push(photo);

    // Move stack to latest photo when adding
    this.index = this.photos.length - 1;

    this.project.save();
  }

  removePhoto(photo: Photo): void {
    const photoIndex = this.photos.indexOf(photo);
    if (photoIndex !== -1) {
      this.photos.splice(photoIndex, 1);
    }

    if (this.index + 1 > this.photos.length) {
      this.index--;
    }

    this.project.save();
  }

  hasPhoto(photo: Photo): boolean {
    return this.photos.includes(photo);
  }

  get currentPhoto(): Photo | null {
    if (this.photos.length === 0 || this.index < 0 || this.index >= this.photos.length) {
      return null;
    }

    return this.photos[this.index];
  }

  setPreviousPhoto(): void {
    if (this.photos.length === 0) {
      return;
    }

    let newIndex = (this.index - 1) % this.photos.length;
    if (newIndex < 0) {
      newIndex = this.photos.length - 1;
    }
    this.index = newIndex;

    this.project.save();
  }

  setNextPhoto(): void {
    if (this.photos.length === 0) {
      return;
    }

    this.index = (this.index + 1) % this.photos.length;

    this.project.save();
  }

  setName(name: string): void {
    this.name = name;

    this.project.save();
  }
}

export default Collection;
