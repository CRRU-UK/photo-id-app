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
  id: z.uuid(),
  name: z.string().nonempty("Name is required"),
  endpoint: z.url("Must be a valid URL (e.g. http://localhost:8080)"),
});

export const mlModelDraftSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().nonempty("Name is required"),
  endpoint: z.url("Must be a valid URL (e.g. http://localhost:8080)"),
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

  /**
   * Not a persisted setting - always overridden by `getSettingsForRenderer()` with the live
   * `safeStorage.isEncryptionAvailable()` result before being sent to the renderer. The default
   * here only ensures the field is present and typed correctly on the disk schema.
   */
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

/**
 * Always ensure this stays in sync with the OpenAPI specs.
 * @see [analysis-api-spec.yaml](../docs/assets/analysis-api-spec.yaml)
 */
export const mlMatchSchema = z.object({
  rank: z.number(),
  id: z.string(),
  rating: z.number(),
  details: z.string(),
});

/**
 * Always ensure this stays in sync with the OpenAPI specs.
 * @see [analysis-api-spec.yaml](../docs/assets/analysis-api-spec.yaml)
 */
export const mlMatchResponseSchema = z.object({
  matches: z.array(mlMatchSchema),
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
