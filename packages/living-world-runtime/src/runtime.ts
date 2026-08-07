import { InvalidWorldTransitionError, WorldNotEnteredError } from "./errors.ts";
import { calculateProgress } from "./progress.ts";
import type { WorldStateRepository } from "./repository.ts";
import type {
  LocationId,
  Timestamp,
  UserId,
  WorldActivity,
  WorldDefinition,
  WorldHistory,
  WorldId,
  WorldLocation,
  WorldProgress,
  WorldState,
} from "./types.ts";
import { findDefinition, findLocation } from "./definitions.ts";

export const RECENT_VISITS_LIMIT = 20;

export interface WorldRuntime {
  /** Enters a world: reactivates it and records a visit at the entry (first time) or current (returning) location. */
  enterWorld(userId: UserId, worldId: WorldId): Promise<WorldState>;
  /** Reactivates an already-entered world exactly where it was left, recording no new visit. Throws if never entered. */
  resumeWorld(userId: UserId, worldId: WorldId): Promise<WorldState>;
  /** Marks the world inactive and closes the open visit, if any. Throws if never entered. */
  leaveWorld(userId: UserId, worldId: WorldId): Promise<WorldState>;
  /** Moves to and records a visit to `locationId`. Throws InvalidWorldTransitionError if it isn't unlocked. */
  visitLocation(userId: UserId, worldId: WorldId, locationId: LocationId): Promise<WorldState>;
  /** Unlocks `locationId` once its prerequisites (if any) have been visited. */
  unlockLocation(userId: UserId, worldId: WorldId, locationId: LocationId): Promise<WorldState>;
  /** Moves the current-location pointer without recording a visit. Still requires the location be unlocked. */
  setCurrentLocation(userId: UserId, worldId: WorldId, locationId: LocationId): Promise<WorldState>;
  /** Appends a visit record for `locationId` without moving the current-location pointer. */
  recordVisit(userId: UserId, worldId: WorldId, locationId: LocationId): Promise<WorldState>;
  /** Raw current state, or null if this user has never entered the world. Fabricates nothing. */
  getState(userId: UserId, worldId: WorldId): Promise<WorldState | null>;
  getProgress(userId: UserId, worldId: WorldId): Promise<WorldProgress>;
  getHistory(userId: UserId, worldId: WorldId): Promise<WorldHistory>;
  getAvailableActivities(userId: UserId, worldId: WorldId): Promise<WorldActivity[]>;
  getNextSuggestedActivity(userId: UserId, worldId: WorldId): Promise<WorldActivity | null>;
}

export interface CreateWorldRuntimeOptions {
  definitions: WorldDefinition[];
  repository: WorldStateRepository;
  /** Injectable clock, for deterministic tests. Defaults to the real wall clock. */
  now?: () => Timestamp;
}

export function createWorldRuntime(options: CreateWorldRuntimeOptions): WorldRuntime {
  const { definitions, repository } = options;
  const now = options.now ?? (() => new Date().toISOString());

  function createInitialState(userId: UserId, definition: WorldDefinition, at: Timestamp): WorldState {
    return {
      userId,
      worldId: definition.id,
      active: true,
      currentLocationId: definition.entryLocationId,
      visitedLocationIds: [],
      unlockedLocationIds: [definition.entryLocationId],
      currentActivityId: null,
      currentPracticeRef: null,
      currentReflectionRef: null,
      recentVisits: [],
      artifacts: [],
      createdAt: at,
      updatedAt: at,
      lastVisitAt: null,
    };
  }

  function applyVisit(state: WorldState, locationId: LocationId, at: Timestamp): void {
    if (state.recentVisits.length > 0 && !state.recentVisits[0].leftAt) {
      state.recentVisits[0] = { ...state.recentVisits[0], leftAt: at };
    }
    state.recentVisits.unshift({ locationId, enteredAt: at });
    if (state.recentVisits.length > RECENT_VISITS_LIMIT) state.recentVisits.length = RECENT_VISITS_LIMIT;
    if (!state.visitedLocationIds.includes(locationId)) state.visitedLocationIds.push(locationId);
    state.lastVisitAt = at;
    state.updatedAt = at;
  }

  async function requireEntered(userId: UserId, worldId: WorldId): Promise<WorldState> {
    const state = await repository.get(userId, worldId);
    if (!state) throw new WorldNotEnteredError(worldId, userId);
    return state;
  }

  async function enterWorld(userId: UserId, worldId: WorldId): Promise<WorldState> {
    const definition = findDefinition(definitions, worldId);
    const at = now();
    const existing = await repository.get(userId, worldId);
    const state = existing ?? createInitialState(userId, definition, at);
    const targetLocationId = existing?.currentLocationId ?? definition.entryLocationId;
    findLocation(definition, targetLocationId);
    const from = existing?.currentLocationId ?? null;

    state.active = true;
    state.currentLocationId = targetLocationId;
    if (!state.unlockedLocationIds.includes(targetLocationId)) state.unlockedLocationIds.push(targetLocationId);
    applyVisit(state, targetLocationId, at);

    await repository.appendTransition(userId, worldId, { from, to: targetLocationId, at, allowed: true });
    await repository.save(state);
    return state;
  }

  async function resumeWorld(userId: UserId, worldId: WorldId): Promise<WorldState> {
    findDefinition(definitions, worldId);
    const existing = await requireEntered(userId, worldId);
    const at = now();
    const state: WorldState = { ...existing, active: true, updatedAt: at };
    await repository.save(state);
    return state;
  }

  async function leaveWorld(userId: UserId, worldId: WorldId): Promise<WorldState> {
    findDefinition(definitions, worldId);
    const existing = await requireEntered(userId, worldId);
    const at = now();
    const recentVisits = existing.recentVisits.map((visit, index) =>
      index === 0 && !visit.leftAt ? { ...visit, leftAt: at } : visit
    );
    const state: WorldState = { ...existing, active: false, recentVisits, updatedAt: at };
    await repository.save(state);
    return state;
  }

  async function ensureLocationUnlocked(
    state: WorldState,
    worldId: WorldId,
    userId: UserId,
    locationId: LocationId,
    at: Timestamp
  ): Promise<void> {
    if (state.unlockedLocationIds.includes(locationId)) return;
    const reason = `location ${locationId} is not unlocked`;
    await repository.appendTransition(userId, worldId, {
      from: state.currentLocationId,
      to: locationId,
      at,
      allowed: false,
      reason,
    });
    throw new InvalidWorldTransitionError(worldId, userId, locationId, reason);
  }

  async function visitLocation(userId: UserId, worldId: WorldId, locationId: LocationId): Promise<WorldState> {
    const definition = findDefinition(definitions, worldId);
    findLocation(definition, locationId);
    const at = now();
    const existing = await repository.get(userId, worldId);
    const state = existing ?? createInitialState(userId, definition, at);

    await ensureLocationUnlocked(state, worldId, userId, locationId, at);

    const from = state.currentLocationId;
    state.active = true;
    state.currentLocationId = locationId;
    applyVisit(state, locationId, at);

    await repository.appendTransition(userId, worldId, { from, to: locationId, at, allowed: true });
    await repository.save(state);
    return state;
  }

  async function unlockLocation(userId: UserId, worldId: WorldId, locationId: LocationId): Promise<WorldState> {
    const definition = findDefinition(definitions, worldId);
    const location: WorldLocation = findLocation(definition, locationId);
    const at = now();
    const existing = await repository.get(userId, worldId);
    const state = existing ?? createInitialState(userId, definition, at);

    const requires = location.requiresLocationIds ?? [];
    const missing = requires.filter((id) => !state.visitedLocationIds.includes(id));
    if (missing.length > 0) {
      throw new InvalidWorldTransitionError(
        worldId,
        userId,
        locationId,
        `missing prerequisite location(s): ${missing.join(", ")}`
      );
    }

    if (!state.unlockedLocationIds.includes(locationId)) state.unlockedLocationIds.push(locationId);
    state.updatedAt = at;
    await repository.save(state);
    return state;
  }

  async function setCurrentLocation(userId: UserId, worldId: WorldId, locationId: LocationId): Promise<WorldState> {
    const definition = findDefinition(definitions, worldId);
    findLocation(definition, locationId);
    const at = now();
    const existing = await repository.get(userId, worldId);
    const state = existing ?? createInitialState(userId, definition, at);

    await ensureLocationUnlocked(state, worldId, userId, locationId, at);

    const from = state.currentLocationId;
    state.currentLocationId = locationId;
    state.updatedAt = at;
    await repository.appendTransition(userId, worldId, { from, to: locationId, at, allowed: true, reason: "pointer-only" });
    await repository.save(state);
    return state;
  }

  async function recordVisit(userId: UserId, worldId: WorldId, locationId: LocationId): Promise<WorldState> {
    const definition = findDefinition(definitions, worldId);
    findLocation(definition, locationId);
    const at = now();
    const existing = await repository.get(userId, worldId);
    const state = existing ?? createInitialState(userId, definition, at);

    await ensureLocationUnlocked(state, worldId, userId, locationId, at);

    applyVisit(state, locationId, at);
    await repository.save(state);
    return state;
  }

  async function getState(userId: UserId, worldId: WorldId): Promise<WorldState | null> {
    findDefinition(definitions, worldId);
    return repository.get(userId, worldId);
  }

  async function getProgress(userId: UserId, worldId: WorldId): Promise<WorldProgress> {
    const definition = findDefinition(definitions, worldId);
    const state = await repository.get(userId, worldId);
    return calculateProgress(definition, state);
  }

  async function getHistory(userId: UserId, worldId: WorldId): Promise<WorldHistory> {
    findDefinition(definitions, worldId);
    const state = await repository.get(userId, worldId);
    const transitions = await repository.getTransitions(userId, worldId);
    return { worldId, userId, visits: state ? [...state.recentVisits] : [], transitions };
  }

  async function getAvailableActivities(userId: UserId, worldId: WorldId): Promise<WorldActivity[]> {
    const definition = findDefinition(definitions, worldId);
    const state = await repository.get(userId, worldId);
    if (!state) return [];
    return definition.activities.filter((activity) => state.unlockedLocationIds.includes(activity.locationId));
  }

  async function getNextSuggestedActivity(userId: UserId, worldId: WorldId): Promise<WorldActivity | null> {
    const available = await getAvailableActivities(userId, worldId);
    if (available.length === 0) return null;
    const state = await repository.get(userId, worldId);
    const currentLocationId = state?.currentLocationId ?? null;
    const atCurrentLocation = currentLocationId
      ? available.filter((activity) => activity.locationId === currentLocationId)
      : [];
    const pool = atCurrentLocation.length > 0 ? atCurrentLocation : available;
    const notCurrent = pool.filter((activity) => activity.id !== state?.currentActivityId);
    return notCurrent[0] ?? pool[0] ?? null;
  }

  return {
    enterWorld,
    resumeWorld,
    leaveWorld,
    visitLocation,
    unlockLocation,
    setCurrentLocation,
    recordVisit,
    getState,
    getProgress,
    getHistory,
    getAvailableActivities,
    getNextSuggestedActivity,
  };
}
