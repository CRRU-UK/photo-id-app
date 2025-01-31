import type Photo from "../models/Photo";

export type Directory = string;

export type FileName = string;

export type PhotoStack = Set<Photo>;

export type Match = {
  id: string;
  left: Photo[];
  right: Photo[];
};

export type ProjectJSONBody = {
  version: string;
  directory: Directory;
  totalPhotos: number;
  photos: string[];
  matched: { id: string; left: string[]; right: string[] }[];
  discarded: string[];
};
