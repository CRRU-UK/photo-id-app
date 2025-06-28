import type { Directory, FileName } from "@/types";

import File from "./File";

class Photo extends File {
  readonly edited: string;
  readonly thumbnail: string;

  constructor(directory: Directory, name: FileName, edited: FileName, thumbnail: FileName) {
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

  public getThumbnailFullPath() {
    return [this.directory, this.thumbnail].join("/");
  }

  public getThumbnailFileName() {
    return this.thumbnail;
  }
}

export default Photo;
