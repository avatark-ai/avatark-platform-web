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
import type { UserId, WorldDefinition, WorldId, WorldRuntime } from "@avatark/living-world-runtime";

export interface WorldAccountSummary {
  worldId: WorldId;
  name: string;
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
}

/** A user with no state for this world gets an honest empty summary -- never fabricated location/activity/progress. */
function emptySummary(definition: WorldDefinition, totalLocationCount: number): WorldAccountSummary {
  return {
    worldId: definition.id,
    name: definition.name,
    active: false,
    currentLocationId: null,
    currentLocationName: null,
    visitedLocationCount: 0,
    totalLocationCount,
    percentComplete: 0,
    lastVisitAt: null,
    recentActivityLabel: null,
    canContinue: false,
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
    active: state.active,
    currentLocationId: state.currentLocationId,
    currentLocationName,
    visitedLocationCount: progress.visitedLocationCount,
    totalLocationCount: progress.totalLocationCount,
    percentComplete: progress.percentComplete,
    lastVisitAt: state.lastVisitAt,
    recentActivityLabel,
    canContinue: true,
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
}

export interface AccountAdapterResult<T> {
  data?: T;
  error?: string;
}

export interface LivingWorldsAccountAdapter {
  list(): Promise<AccountAdapterResult<AccountLivingWorldSummary[]>>;
}

function toAccountSummary(summary: WorldAccountSummary): AccountLivingWorldSummary {
  const status = summary.active ? "Active" : "Not Active";
  const descriptionParts = [summary.canContinue ? "Continue available" : "Not yet started"];
  if (summary.currentLocationName) descriptionParts.push(`Current location: ${summary.currentLocationName}`);
  if (summary.lastVisitAt) descriptionParts.push(`Last visit: ${summary.lastVisitAt}`);
  if (summary.recentActivityLabel) descriptionParts.push(summary.recentActivityLabel);

  return {
    id: summary.worldId,
    name: summary.name,
    status,
    description: descriptionParts.join(" · "),
    progress: `${summary.percentComplete}% (${summary.visitedLocationCount}/${summary.totalLocationCount} locations)`,
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
  };
}
