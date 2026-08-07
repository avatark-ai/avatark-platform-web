import type { WorldDefinition, WorldProgress, WorldState } from "./types.ts";

export function calculateProgress(definition: WorldDefinition, state: WorldState | null): WorldProgress {
  const totalLocationCount = definition.locations.length;
  if (!state) {
    return { visitedLocationCount: 0, totalLocationCount, unlockedLocationCount: 0, percentComplete: 0 };
  }
  const visitedLocationCount = state.visitedLocationIds.length;
  const unlockedLocationCount = state.unlockedLocationIds.length;
  const percentComplete = totalLocationCount === 0 ? 0 : Math.round((visitedLocationCount / totalLocationCount) * 100);
  return { visitedLocationCount, totalLocationCount, unlockedLocationCount, percentComplete };
}
