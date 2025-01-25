import type Photo from "../models/Photo";

export type DIRECTORY = string;

export type FILE_NAME = string;

export type PHOTO_STACK = Photo[];

export type MATCH = {
  id: string;
  left: PHOTO_STACK;
  right: PHOTO_STACK;
};

export type PHOTO_DATA = {
  version: string;
  directory: DIRECTORY;
  files: PHOTO_STACK;
  matched: MATCH[];
  discarded: PHOTO_STACK;
};

export type PROJECT_JSON = {
  version: string;
  directory: DIRECTORY;
  photos: string[];
  matched: { id: string; left: string[]; right: string[] }[];
  discarded: string[];
};
