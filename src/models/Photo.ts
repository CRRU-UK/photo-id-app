import type { Directory, FileName } from "@/types";

import File from "./File";

class Photo extends File {
  readonly thumbnail: string;

  constructor(directory: Directory, file: FileName, thumbnail: FileName) {
    super(directory, file);

    this.thumbnail = thumbnail;
  }

  public getThumbnailFullPath() {
    return ["file://", this.directory, this.thumbnail].join("/");
  }

  public getThumbnailFileName() {
    return this.thumbnail;
  }
}

export default Photo;
