import { z } from "zod";

import { DEFAULT_SETTINGS, IMAGE_FILTERS } from "@/constants";

export const recentProjectSchema = z.object({
  name: z.string(),
  path: z.string(),
  lastOpened: z.string(),
});

export const themeModeSchema = z.enum(["light", "dark", "auto"]);

export const telemetrySchema = z.enum(["enabled", "disabled"]);

export const analysisProviderSchema = z.object({
  id: z.uuid(),
  name: z.string().nonempty("Name is required"),
  endpoint: z.url("Must be a valid URL (e.g. http://localhost:8080)"),
});

export const analysisProviderDraftSchema = z.object({
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
  analysisProviders: z.array(analysisProviderSchema).default(DEFAULT_SETTINGS.analysisProviders),
  selectedAnalysisProviderId: z
    .string()
    .nullable()
    .default(DEFAULT_SETTINGS.selectedAnalysisProviderId),
});

export const photoEditsSchema = z.object({
  brightness: z.number().min(IMAGE_FILTERS.BRIGHTNESS.MIN).max(IMAGE_FILTERS.BRIGHTNESS.MAX),
  contrast: z.number().min(IMAGE_FILTERS.CONTRAST.MIN).max(IMAGE_FILTERS.CONTRAST.MAX),
  saturate: z.number().min(IMAGE_FILTERS.SATURATE.MIN).max(IMAGE_FILTERS.SATURATE.MAX),
  zoom: z.number().min(0.01).max(100),
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
export const analysisMatchSchema = z.object({
  rank: z.number(),
  id: z.string(),
  rating: z.number(),
  details: z.string(),
});

/**
 * Always ensure this stays in sync with the OpenAPI specs.
 * @see [analysis-api-spec.yaml](../docs/assets/analysis-api-spec.yaml)
 */
export const analysisMatchResponseSchema = z.object({
  matches: z.array(analysisMatchSchema),
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
