import { z } from "zod";

import { DEFAULT_SETTINGS } from "@/constants";

export const themeModeSchema = z.enum(["light", "dark", "auto"]);

export const telemetrySchema = z.enum(["enabled", "disabled"]);

export const settingsDataSchema = z.object({
  themeMode: themeModeSchema.default(DEFAULT_SETTINGS.themeMode),
  telemetry: telemetrySchema.default(DEFAULT_SETTINGS.telemetry),
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
