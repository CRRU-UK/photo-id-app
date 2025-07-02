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

export type PhotoBody = {
  directory: Directory;
  name: FileName;
  edited: FileName;
  thumbnail: FileName;
};

export type EditData = {
  directory: Directory;
  name: FileName;
  edited: FileName;
};

export type ProjectBody = {
  version: string;
  id: string;
  directory: Directory;
  totalPhotos: number;
  photos: PhotoBody[];
  matched: {
    id: number;
    left: {
      photos: PhotoBody[];
      name: string;
    };
    right: {
      photos: PhotoBody[];
      name: string;
    };
  }[];
  discarded: PhotoBody[];
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

export type LoadingData = {
  show: boolean;
  text?: string;
};
