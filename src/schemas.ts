import { z } from "zod";

import { DEFAULT_SETTINGS } from "@/constants";

export const recentProjectSchema = z.object({
  name: z.string(),
  path: z.string(),
  lastOpened: z.string(),
});

export const themeModeSchema = z.enum(["light", "dark", "auto"]);

export const telemetrySchema = z.enum(["enabled", "disabled"]);

export const mlModelSchema = z.object({
  id: z.string(),
  name: z.string().nonempty("Name is required"),
  endpoint: z.string().nonempty("Endpoint is required"),
});

export const mlModelDraftSchema = z.object({
  id: z.string().optional(),
  name: z.string().nonempty("Name is required"),
  endpoint: z.string().nonempty("Endpoint is required"),
  token: z.string().optional(),
});

export const tokenEntrySchema = z.object({
  value: z.string(),
  encrypted: z.boolean(),
});

export const tokenStoreSchema = z.object({
  tokens: z.record(z.string(), tokenEntrySchema),
});

export const settingsDataSchema = z.object({
  version: z.literal("v1"),
  themeMode: themeModeSchema.default(DEFAULT_SETTINGS.themeMode as z.infer<typeof themeModeSchema>),
  telemetry: telemetrySchema.default(DEFAULT_SETTINGS.telemetry as z.infer<typeof telemetrySchema>),
  mlModels: z.array(mlModelSchema).default(DEFAULT_SETTINGS.mlModels),
  selectedModelId: z.string().nullable().default(DEFAULT_SETTINGS.selectedModelId),
  isTokenEncryptionAvailable: z.boolean().default(true),
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
