import type Collection from "@/models/Collection";
import type Photo from "@/models/Photo";

export type Directory = string;

export type FileName = string;

export type PhotoSet = Set<Photo>;

export type Match = {
  id: number;
  left: Collection;
  right: Collection;
};

export type Matches = Set<Match>;

export type PhotoBody = {
  directory: Directory;
  name: FileName;
  edited: FileName | null;
  thumbnail: FileName;
};

export type CollectionBody = {
  name?: string;
  index: number;
  photos: PhotoBody[];
};

export type ProjectBody = {
  version: string;
  id: string;
  directory: Directory;
  unassigned: CollectionBody;
  discarded: CollectionBody;
  matched: {
    id: number;
    left: CollectionBody;
    right: CollectionBody;
  }[];
  created: string;
  lastModified: string;
};

export type RecentProject = {
  name: string;
  path: string;
  lastOpened: string;
};

export type DraggableStartData = {
  collection: Collection;
  currentPhoto: Photo;
};

export type DraggableEndData = {
  collection: Collection;
};

export type LoadingData = {
  show: boolean;
  text?: string;
  progress?: number | false;
};
