import { z } from "zod";

export const photoEditsSchema = z.object({
  brightness: z.number(),
  contrast: z.number(),
  saturate: z.number(),
  zoom: z.number(),
  pan: z.object({ x: z.number(), y: z.number() }),
});

export const photoBodySchema = z.object({
  directory: z.string(),
  name: z.string(),
  thumbnail: z.string(),
  edits: photoEditsSchema,
  isEdited: z.boolean(),
});

export const collectionBodySchema = z.object({
  name: z.string().optional(),
  index: z.number(),
  photos: z.array(photoBodySchema),
});

export const matchedBodySchema = z.object({
  id: z.number(),
  left: collectionBodySchema,
  right: collectionBodySchema,
});

export const projectBodySchema = z.object({
  version: z.string(),
  id: z.string(),
  directory: z.string(),
  unassigned: collectionBodySchema,
  discarded: collectionBodySchema,
  matched: z.array(matchedBodySchema),
  created: z.string(),
  lastModified: z.string(),
});
