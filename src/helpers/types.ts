import type Photo from "../models/Photo";

export type DIRECTORY = string;

export type FILE_NAME = string;

export type PHOTO_STACK = Set<Photo>;

export type MATCH = {
  id: string;
  left: Photo[];
  right: Photo[];
};

export type PROJECT_JSON = {
  version: string;
  directory: DIRECTORY;
  totalPhotos: number;
  photos: string[];
  matched: { id: string; left: string[]; right: string[] }[];
  discarded: string[];
};
