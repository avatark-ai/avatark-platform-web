// ============================================================
// @avatark/living-world-runtime -- Core Model
//
// This package EXECUTES Living Worlds. It does not author them: no world
// name, location, activity, practice, or reflection content is hardcoded
// here. A WorldDefinition is supplied by the host (or a fixture, in
// tests) and the runtime only ever operates on the generic shapes below.
// ============================================================

export type WorldId = string;
export type LocationId = string;
export type ActivityId = string;
export type UserId = string;

/** ISO-8601 timestamp string. */
export type Timestamp = string;

// ── Definition (authored elsewhere, consumed here) ───────────

export interface WorldLocation {
  id: LocationId;
  name: string;
  description?: string;
  /** Position within the world; used only as a default ordering hint. */
  order: number;
  /** Locations that must already be visited before this one can be unlocked. */
  requiresLocationIds?: LocationId[];
}

/** A pointer into a separate Practice system (e.g. PrometheusK). Opaque here. */
export interface WorldPracticeRef {
  practiceId: string;
  source: string;
}

/** A pointer into a separate Reflection system. Opaque here. */
export interface WorldReflectionRef {
  reflectionId: string;
  source: string;
}

export interface WorldActivity {
  id: ActivityId;
  locationId: LocationId;
  name: string;
  description?: string;
  practiceRef?: WorldPracticeRef;
  reflectionRef?: WorldReflectionRef;
}

export interface WorldDefinition {
  id: WorldId;
  name: string;
  description?: string;
  entryLocationId: LocationId;
  locations: WorldLocation[];
  activities: WorldActivity[];
}

// ── Runtime state (owned here) ────────────────────────────────

export interface WorldVisit {
  locationId: LocationId;
  enteredAt: Timestamp;
  leftAt?: Timestamp;
}

export interface WorldArtifact {
  id: string;
  worldId: WorldId;
  locationId?: LocationId;
  kind: string;
  createdAt: Timestamp;
  data?: Record<string, unknown>;
}

export interface WorldTransition {
  from: LocationId | null;
  to: LocationId;
  at: Timestamp;
  allowed: boolean;
  reason?: string;
}

export interface WorldProgress {
  visitedLocationCount: number;
  totalLocationCount: number;
  unlockedLocationCount: number;
  /** 0-100, rounded. 0 for a world with no locations. */
  percentComplete: number;
}

export interface WorldState {
  userId: UserId;
  worldId: WorldId;
  active: boolean;
  currentLocationId: LocationId | null;
  visitedLocationIds: LocationId[];
  unlockedLocationIds: LocationId[];
  currentActivityId: ActivityId | null;
  currentPracticeRef: WorldPracticeRef | null;
  currentReflectionRef: WorldReflectionRef | null;
  /** Most-recent-first, capped by the runtime (see RECENT_VISITS_LIMIT). */
  recentVisits: WorldVisit[];
  artifacts: WorldArtifact[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastVisitAt: Timestamp | null;
}

export interface WorldHistory {
  worldId: WorldId;
  userId: UserId;
  visits: WorldVisit[];
  transitions: WorldTransition[];
}
