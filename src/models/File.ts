import type { DIRECTORY, FILE_NAME } from "../helpers/types";

class Photo {
  readonly id;
  readonly fileName;
  readonly filePath;

  constructor(fileName: FILE_NAME, filePath: DIRECTORY) {
    this.fileName = fileName;
    this.filePath = filePath;

    this.id = btoa(this.getFullPath());
  }

  public getFullPath() {
    return ["file://", this.filePath, this.fileName].join("/");
  }
}

export default Photo;
