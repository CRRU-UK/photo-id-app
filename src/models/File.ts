import type { Directory, FileName } from "@/types";

class File {
  readonly directory;
  readonly name;

  constructor(directory: Directory, name: FileName) {
    this.directory = directory;
    this.name = name;
  }

  public getFullPath() {
    return ["file://", this.directory, this.name].join("/");
  }

  public getFileName() {
    return this.name;
  }
}

export default File;
