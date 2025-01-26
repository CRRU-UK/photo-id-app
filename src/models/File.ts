import type { DIRECTORY, FILE_NAME } from "../helpers/types";

class Photo {
  private readonly id;
  private readonly fileName;
  private readonly filePath;

  constructor(fileName: FILE_NAME, filePath: DIRECTORY) {
    this.fileName = fileName;
    this.filePath = filePath;

    this.id = btoa(this.getFullPath());
  }

  public getFullPath() {
    return ["file://", this.filePath, this.fileName].join("/");
  }

  public getFileName() {
    return this.fileName;
  }
}

export default Photo;
