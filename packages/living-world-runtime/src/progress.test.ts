import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateProgress } from "./progress.ts";
import type { WorldDefinition, WorldState } from "./types.ts";

const DEFINITION: WorldDefinition = {
  id: "w1",
  name: "World One",
  entryLocationId: "a",
  locations: [
    { id: "a", name: "A", order: 0 },
    { id: "b", name: "B", order: 1 },
    { id: "c", name: "C", order: 2 },
  ],
  activities: [],
};

function baseState(overrides: Partial<WorldState> = {}): WorldState {
  return {
    userId: "u1",
    worldId: "w1",
    active: true,
    currentLocationId: "a",
    visitedLocationIds: [],
    unlockedLocationIds: [],
    currentActivityId: null,
    currentPracticeRef: null,
    currentReflectionRef: null,
    recentVisits: [],
    artifacts: [],
    createdAt: "t0",
    updatedAt: "t0",
    lastVisitAt: null,
    ...overrides,
  };
}

test("null state (never entered) yields all-zero progress", () => {
  assert.deepEqual(calculateProgress(DEFINITION, null), {
    visitedLocationCount: 0,
    totalLocationCount: 3,
    unlockedLocationCount: 0,
    percentComplete: 0,
  });
});

test("a world with zero locations never divides by zero", () => {
  const empty: WorldDefinition = { ...DEFINITION, locations: [] };
  const progress = calculateProgress(empty, baseState());
  assert.equal(progress.percentComplete, 0);
  assert.equal(progress.totalLocationCount, 0);
});

test("percentComplete rounds to the nearest whole number", () => {
  const progress = calculateProgress(DEFINITION, baseState({ visitedLocationIds: ["a"], unlockedLocationIds: ["a"] }));
  assert.equal(progress.percentComplete, 33);
});

test("fully visited world reports 100%", () => {
  const progress = calculateProgress(
    DEFINITION,
    baseState({ visitedLocationIds: ["a", "b", "c"], unlockedLocationIds: ["a", "b", "c"] })
  );
  assert.deepEqual(progress, { visitedLocationCount: 3, totalLocationCount: 3, unlockedLocationCount: 3, percentComplete: 100 });
});
