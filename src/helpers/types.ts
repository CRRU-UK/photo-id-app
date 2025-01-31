import type Photo from "../models/Photo";

export type DIRECTORY = string;

export type FILE_NAME = string;

export type PHOTO_STACK = Set<Photo>;

export type MATCH = {
  id: string;
  left: Photo[];
  right: Photo[];
};

export type PROJECT_JSON_BODY = {
  version: string;
  id: string;
  directory: DIRECTORY;
  totalPhotos: number;
  photos: string[];
  matched: { id: string; left: string[]; right: string[] }[];
  discarded: string[];
  created: string;
  lastModified: string;
};

export type RECENT_PROJECTS = {
  path: string;
  lastOpened: string;
}[];
