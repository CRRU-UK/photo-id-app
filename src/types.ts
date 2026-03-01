import type { z } from "zod";

import type Collection from "@/models/Collection";
import type Photo from "@/models/Photo";
import type {
  collectionBodySchema,
  matchedBodySchema,
  mlModelSchema,
  photoBodySchema,
  photoEditsSchema,
  projectBodySchema,
  settingsDataSchema,
  telemetrySchema,
  themeModeSchema,
} from "@/schemas";

export type Directory = string;

export type FileName = string;

export type PhotoSet = Set<Photo>;

export type Match = {
  id: number;
  left: Collection;
  right: Collection;
};

export type Matches = Set<Match>;

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

export type ExternalLinks = "website" | "user-guide" | "user-guide-ml" | "changelog" | "privacy";

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

export type MLModel = z.infer<typeof mlModelSchema>;

/**
 * Always ensure this stays in sync with the OpenAPI specs.
 * @see {../docs/assets/model-api-spec.yaml}
 */
export type MLMatch = {
  rank: number;
  animal_id: string;
  confidence: number;
  source_path: string;
};

/**
 * Always ensure this stays in sync with the OpenAPI specs.
 * @see {../docs/assets/model-api-spec.yaml}
 */
export type MLMatchResponse = {
  matches: MLMatch[];
  query_image_count: number;
  model: string | null;
  heatmap: string | null;
};

export type SettingsData = z.infer<typeof settingsDataSchema>;
