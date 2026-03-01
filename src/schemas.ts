import { z } from "zod";

export const themeModeSchema = z.enum(["light", "dark", "auto"]);

export const telemetrySchema = z.enum(["enabled", "disabled"]);

export const mlModelSchema = z.object({
  id: z.string(),
  name: z.string().default(""),
  endpoint: z.string().default(""),
  apiKey: z.string().default(""),
  createdAt: z.string(),
});

export const settingsDataSchema = z.object({
  themeMode: themeModeSchema.default("dark"),
  telemetry: telemetrySchema.default("disabled"),
  mlModels: z.array(mlModelSchema).default([]),
  selectedModelId: z.string().nullable().default(null),
});

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
  version: z.enum(["v1"]),
  id: z.uuid(),
  directory: z.string(),
  unassigned: collectionBodySchema,
  discarded: collectionBodySchema,
  matched: z.array(matchedBodySchema),
  created: z.iso.datetime(),
  lastModified: z.iso.datetime(),
});
