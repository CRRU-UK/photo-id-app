import type { Directory, FileName } from "@/types";

import File from "./File";

class Photo extends File {
  readonly thumbnail: string;

  constructor(directory: Directory, name: FileName, thumbnail: FileName) {
    super(directory, name);

    this.thumbnail = thumbnail;
  }

  public getThumbnailFullPath() {
    return [this.directory, this.thumbnail].join("/");
  }

  public getThumbnailFileName() {
    return this.thumbnail;
  }
}

export default Photo;
