/**
 * Contract-only shared running-system types.
 *
 * This file is intentionally copied into each running app for Phase 1.
 * It is not imported by runtime code yet and should not change behavior.
 * A real shared package can be considered after JSON export/import flows are proven.
 */

export type RunSystemSourceApp = "StrideSync" | "GarminVault" | "Half_Ass_Training";

export type ActivityProvider = "strava" | "garmin" | "manual";

export type CanonicalActivityType =
  | "run"
  | "walk"
  | "hike"
  | "trail_run"
  | "ride"
  | "weight_training"
  | "workout"
  | "crossfit"
  | "pickleball"
  | "mindfulness"
  | "other";

export type CanonicalActivityImport = {
  id: string;
  source: ActivityProvider;
  providerActivityId?: string;
  sourceFile?: string;
  activityType: CanonicalActivityType;
  startTime: string;
  startTimeLocal?: string;
  distanceMiles?: number;
  distanceMeters?: number;
  durationMinutes?: number;
  durationSeconds?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  calories?: number;
  avgCadence?: number;
  totalAscentFeet?: number;
  totalAscentMeters?: number;
  name?: string;
  notes?: string;
  splits?: CanonicalSplit[];
  gpsTrack?: CanonicalTrackPoint[];
  rawPreview?: Record<string, unknown>;
};

export type CanonicalSplit = {
  index: number;
  distanceMiles?: number;
  distanceMeters?: number;
  durationSeconds?: number;
  paceSecondsPerMile?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  cadence?: number;
  elevationChangeFeet?: number;
  elevationChangeMeters?: number;
};

export type CanonicalTrackPoint = {
  timestamp?: string;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  heartRate?: number;
  cadence?: number;
  elevationMeters?: number;
};

export type GarminActivityExportV1 = {
  exportVersion: 1;
  generatedAt: string;
  sourceApp: "GarminVault";
  activities: CanonicalActivityImport[];
};

export type TrainingPlanExportV1 = {
  exportVersion: 1;
  generatedAt: string;
  sourceApp: "Half_Ass_Training";
  plan: TrainingPlanDefinition;
  settings: TrainingPlanSettings;
  progress?: PlannedWorkoutProgress[];
};

export type TrainingPlanDefinition = {
  id: string;
  name: string;
  sourceApp: "Half_Ass_Training";
  weeks: PlannedWorkoutWeek[];
};

export type TrainingPlanSettings = {
  week1Start?: string;
  raceDate?: string;
  timezone?: string;
};

export type PlannedWorkoutWeek = {
  week: number;
  phase: string;
  label?: string;
  days: PlannedWorkout[];
};

export type PlannedWorkout = {
  id: string;
  planId: string;
  week: number;
  day: number;
  dayName: string;
  plannedDate?: string;
  name: string;
  type: string;
  duration?: string;
  miles?: number;
  zone: string;
  targetBpm: string;
  targetPace: string;
  steps: string[];
  notes?: string;
};

export type PlannedWorkoutProgress = {
  plannedWorkoutId: string;
  status?: "completed" | "skipped" | "modified";
  note?: string;
  flags?: string[];
  actualActivityIds?: string[];
  updatedAt: string;
};

export type ActivityPlanLink = {
  plannedWorkoutId: string;
  actualActivityId: string;
  matchedBy: "manual" | "date_type_distance" | "import_source";
  confidence: number;
};
