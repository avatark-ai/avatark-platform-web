// ============================================================
// Living Worlds account-surface integration.
//
// Moved here from packages/living-world-runtime/src/adapters/
// livingWorldsAccount.ts during the Runtime Kernel integration
// (Sprint 3), per the adapter-ownership fix docs/RUNTIME_KERNEL_ARCHITECTURE.md
// Part 1 identified: a Presentation-role adapter (reshapes a runtime's
// output to match @avatark/account's UI contract) belongs in the Host's
// lib/, never inside the runtime package itself -- @avatark/living-world-runtime
// stays a true leaf with zero knowledge of @avatark/account.
//
// The account UI's existing LivingWorldsTab (packages/account) already
// defines a generic LivingWorldsAdapter contract: `list(): Promise<{
// data?: { id, name, status, description, progress }[], error?: string
// }>`. This module implements an adapter shaped to match it -- it does
// not import @avatark/account (no stable public npm-style contract to
// depend on yet) and it does not duplicate any of that package's
// rendering code. A host wires `createLivingWorldsAccountAdapter(...)`
// directly onto its own `AccountAdapters.livingWorlds`.
// ============================================================

import { findLocation } from "@avatark/living-world-runtime";
import type { UserId, WorldDefinition, WorldId, WorldRuntime, WorldState } from "@avatark/living-world-runtime";

export interface WorldAccountSummary {
  worldId: WorldId;
  name: string;
  description: string;
  active: boolean;
  currentLocationId: string | null;
  currentLocationName: string | null;
  visitedLocationCount: number;
  totalLocationCount: number;
  percentComplete: number;
  lastVisitAt: string | null;
  recentActivityLabel: string | null;
  /** True once the user has entered at least once; false for untouched world state. */
  canContinue: boolean;
  /** Count of this world's own activities carrying a practiceRef -- honestly
   * 0 for definitions (like the shared SAMPLE_WORLD_DEFINITIONS fixtures)
   * that don't set one. Never inferred/fabricated beyond what the
   * definition's own data states. */
  upcomingPracticeCount: number;
  /** Same honesty rule, for activities carrying a reflectionRef. */
  reflectionCount: number;
  /** Locations whose authored requiresLocationIds are all satisfied by
   * this user's visitedLocationIds, excluding the current location --
   * i.e. legal next moves, derived entirely from the definition's own
   * graph (Sprint 5, Living Vrindavan). Empty for a world whose
   * definition has no such reachable location (or no state yet) -- never
   * hardcoded per-world/franchise. */
  nextLocations: { id: string; name: string }[];
  /** The authored reflection prompt (WorldActivity.description) for
   * whichever activity at the current location carries a reflectionRef,
   * if any. Null whenever no such activity exists -- never fabricated. */
  currentReflectionPrompt: string | null;
}

function countActivitiesWithRef(definition: WorldDefinition, refKey: "practiceRef" | "reflectionRef"): number {
  return definition.activities.filter((activity) => activity[refKey] != null).length;
}

function findReflectionPrompt(definition: WorldDefinition, currentLocationId: string | null): string | null {
  if (!currentLocationId) return null;
  const activity = definition.activities.find((a) => a.locationId === currentLocationId && a.reflectionRef != null);
  return activity?.description ?? null;
}

function findNextLocations(definition: WorldDefinition, state: WorldState | null): { id: string; name: string }[] {
  if (!state) return [];
  return definition.locations
    .filter((loc) => {
      if (loc.id === state.currentLocationId) return false;
      const requires = loc.requiresLocationIds ?? [];
      return requires.length > 0 && requires.every((id) => state.visitedLocationIds.includes(id));
    })
    .map((loc) => ({ id: loc.id, name: loc.name }));
}

/** A user with no state for this world gets an honest empty summary -- never fabricated location/activity/progress. */
function emptySummary(definition: WorldDefinition, totalLocationCount: number): WorldAccountSummary {
  return {
    worldId: definition.id,
    name: definition.name,
    description: definition.description ?? "",
    active: false,
    currentLocationId: null,
    currentLocationName: null,
    visitedLocationCount: 0,
    totalLocationCount,
    percentComplete: 0,
    lastVisitAt: null,
    recentActivityLabel: null,
    canContinue: false,
    upcomingPracticeCount: countActivitiesWithRef(definition, "practiceRef"),
    reflectionCount: countActivitiesWithRef(definition, "reflectionRef"),
    nextLocations: [],
    currentReflectionPrompt: null,
  };
}

export async function getWorldAccountSummary(
  runtime: WorldRuntime,
  definition: WorldDefinition,
  userId: UserId
): Promise<WorldAccountSummary> {
  const [state, progress] = await Promise.all([
    runtime.getState(userId, definition.id),
    runtime.getProgress(userId, definition.id),
  ]);

  if (!state) return emptySummary(definition, progress.totalLocationCount);

  const currentLocationName = state.currentLocationId
    ? findLocation(definition, state.currentLocationId).name
    : null;
  const mostRecentVisit = state.recentVisits[0] ?? null;
  const recentActivityLabel = mostRecentVisit
    ? `Visited ${findLocation(definition, mostRecentVisit.locationId).name}`
    : null;

  return {
    worldId: definition.id,
    name: definition.name,
    description: definition.description ?? "",
    active: state.active,
    currentLocationId: state.currentLocationId,
    currentLocationName,
    visitedLocationCount: progress.visitedLocationCount,
    totalLocationCount: progress.totalLocationCount,
    percentComplete: progress.percentComplete,
    lastVisitAt: state.lastVisitAt,
    recentActivityLabel,
    canContinue: true,
    upcomingPracticeCount: countActivitiesWithRef(definition, "practiceRef"),
    reflectionCount: countActivitiesWithRef(definition, "reflectionRef"),
    nextLocations: findNextLocations(definition, state),
    currentReflectionPrompt: findReflectionPrompt(definition, state.currentLocationId),
  };
}

export function getWorldAccountSummaries(
  runtime: WorldRuntime,
  definitions: WorldDefinition[],
  userId: UserId
): Promise<WorldAccountSummary[]> {
  return Promise.all(definitions.map((definition) => getWorldAccountSummary(runtime, definition, userId)));
}

// ── Shape matching @avatark/account's LivingWorldsAdapter, structurally ──

export interface AccountLivingWorldSummary {
  id: string;
  name: string;
  status: string;
  description: string;
  progress: string;
  currentLocation: string | null;
  currentLocationId: string | null;
  lastVisitAt: string | null;
  recentActivity: string | null;
  upcomingPracticeCount: number;
  reflectionCount: number;
  canContinue: boolean;
  nextLocations: { id: string; name: string }[];
  currentReflectionPrompt: string | null;
}

export interface AccountAdapterResult<T> {
  data?: T;
  error?: string;
}

export interface LivingWorldsAccountAdapter {
  list(): Promise<AccountAdapterResult<AccountLivingWorldSummary[]>>;
  /** Enters (or resumes) this world for the current user -- the account
   * surface's "Continue" action. Returns the updated summary. */
  enter(worldId: WorldId): Promise<AccountAdapterResult<AccountLivingWorldSummary>>;
}

// "Coming Soon" was a placeholder implying a feature doesn't exist yet.
// "Ready to Begin" says plainly what's actually true: the world exists and
// is playable, this user simply hasn't entered it -- never confused with a
// genuinely unfinished feature.
function toAccountSummary(summary: WorldAccountSummary): AccountLivingWorldSummary {
  const status = !summary.canContinue ? "Ready to Begin" : summary.active ? "Active" : "Not Active";

  return {
    id: summary.worldId,
    name: summary.name,
    status,
    description: summary.description,
    progress: `${summary.percentComplete}% (${summary.visitedLocationCount}/${summary.totalLocationCount} locations)`,
    currentLocation: summary.currentLocationName,
    currentLocationId: summary.currentLocationId,
    lastVisitAt: summary.lastVisitAt,
    recentActivity: summary.recentActivityLabel,
    upcomingPracticeCount: summary.upcomingPracticeCount,
    reflectionCount: summary.reflectionCount,
    canContinue: summary.canContinue,
    nextLocations: summary.nextLocations,
    currentReflectionPrompt: summary.currentReflectionPrompt,
  };
}

export function createLivingWorldsAccountAdapter(
  runtime: WorldRuntime,
  definitions: WorldDefinition[],
  userId: UserId
): LivingWorldsAccountAdapter {
  return {
    async list() {
      try {
        const summaries = await getWorldAccountSummaries(runtime, definitions, userId);
        return { data: summaries.map(toAccountSummary) };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
    async enter(worldId: WorldId) {
      try {
        const definition = definitions.find((d) => d.id === worldId);
        if (!definition) return { error: `Unknown Living World "${worldId}"` };
        await runtime.enterWorld(userId, worldId);
        const summary = await getWorldAccountSummary(runtime, definition, userId);
        return { data: toAccountSummary(summary) };
      } catch (err) {
        return { error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
