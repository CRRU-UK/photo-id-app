import type { z } from "zod";

import type Collection from "@/models/Collection";
import type Photo from "@/models/Photo";
import type {
  analysisMatchResponseSchema,
  analysisMatchSchema,
  analysisProviderDraftSchema,
  analysisProviderSchema,
  collectionBodySchema,
  matchedBodySchema,
  photoBodySchema,
  photoEditsSchema,
  projectBodySchema,
  settingsDataSchema,
  telemetrySchema,
  themeModeSchema,
  tokenEntrySchema,
  tokenStoreSchema,
} from "@/schemas";

export type Directory = string; // NOSONAR

export type FileName = string; // NOSONAR

export type Match = {
  id: number;
  left: Collection;
  right: Collection;
};

export type Matches = Match[];

export type PhotoEdits = z.infer<typeof photoEditsSchema>;

export type PhotoBody = z.infer<typeof photoBodySchema>;

export type CollectionBody = z.infer<typeof collectionBodySchema>;

export type MatchedBody = z.infer<typeof matchedBodySchema>;

export type ProjectBody = z.infer<typeof projectBodySchema>;

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
  progressValue?: number | null;
  progressText?: string;
};

export type EditorNavigation = "prev" | "next";

export type ExternalLinks =
  | "website"
  | "user-guide"
  | "user-guide-analysis"
  | "user-guide-analysis-tokens"
  | "changelog"
  | "privacy";

export type EdgeDetectionData = { enabled: false } | { enabled: true; value: number };

export type ImageFilters = {
  brightness: number;
  contrast: number;
  saturate: number;
  edgeDetection: EdgeDetectionData;
};

export type ImageTransformations = {
  zoom: number;
  pan: { x: number; y: number };
};

export type ThemeMode = z.infer<typeof themeModeSchema>;

export type Telemetry = z.infer<typeof telemetrySchema>;

export type AnalysisProvider = z.infer<typeof analysisProviderSchema>;

export type AnalysisProviderDraft = z.infer<typeof analysisProviderDraftSchema>;

export type TokenEntry = z.infer<typeof tokenEntrySchema>;

export type TokenStore = z.infer<typeof tokenStoreSchema>;

export type AnalysisMatch = z.infer<typeof analysisMatchSchema>;

export type AnalysisMatchResponse = z.infer<typeof analysisMatchResponseSchema>;

export type SettingsData = z.infer<typeof settingsDataSchema>;

export type ExportTypes = "edited" | "csv";
