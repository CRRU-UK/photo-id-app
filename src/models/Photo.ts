import type { Directory, FileName } from "@/types";

import File from "./File";

class Photo extends File {
  edited: string;
  thumbnail: string;

  constructor(directory: Directory, name: FileName, edited: FileName, thumbnail: string) {
    super(directory, name);

    this.edited = edited;
    this.thumbnail = thumbnail;
  }

  public getEditedFullPath() {
    return [this.directory, this.edited].join("/");
  }

  public getEditedFileName() {
    return this.edited;
  }

  public getThumbnailData() {
    return this.thumbnail;
  }

  public setThumbnailData(thumbnail: string) {
    this.thumbnail = thumbnail;
    return this;
  }
}

export default Photo;
