import type { Directory, FileName } from "../helpers/types";

class Photo {
  private readonly fileName;
  private readonly filePath;

  constructor(fileName: FileName, filePath: Directory) {
    this.fileName = fileName;
    this.filePath = filePath;
  }

  public getFullPath() {
    return ["file://", this.filePath, this.fileName].join("/");
  }

  public getFileName() {
    return this.fileName;
  }
}

export default Photo;
