import type { DIRECTORY, FILE_NAME } from "../helpers/types";

class Photo {
  readonly directory;
  readonly fileName;

  constructor(directory: DIRECTORY, fileName: FILE_NAME) {
    this.directory = directory;
    this.fileName = fileName;
  }

  public getFullPath() {
    return ["file://", this.fileName, this.directory].join("/");
  }
}

export default Photo;
