export type DIRECTORY = string;

export type FILE = string;

export type MATCH = {
  left: FILE[],
  right: FILE[],
}

export type PHOTO_DATA = {
  version: string,
  directory: DIRECTORY,
  files: FILE[],
  matches: MATCH[],
  unused: FILE[],
};
