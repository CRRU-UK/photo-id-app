import type Photo from "@/models/Photo";

export type Directory = string;

export type FileName = string;

export type PhotoStack = Set<Photo>;

export type Match = {
  id: number;
  left: {
    name: string;
    photos: PhotoStack;
  };
  right: {
    name: string;
    photos: PhotoStack;
  };
};

export type Matches = Set<Match>;

export type ProjectBody = {
  version: string;
  id: string;
  directory: Directory;
  totalPhotos: number;
  photos: string[];
  matched: {
    id: number;
    left: {
      photos: string[];
      name: string;
    };
    right: {
      photos: string[];
      name: string;
    };
  }[];
  discarded: string[];
  created: string;
  lastModified: string;
};

export type RecentProject = {
  name: string;
  path: string;
  lastOpened: string;
};

export type DraggableStartData = {
  stack: PhotoStack;
  currentFile: Photo;
};

export type DraggableEndData = {
  photos: PhotoStack;
};
