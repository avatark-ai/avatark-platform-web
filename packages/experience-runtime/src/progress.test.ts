import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXTURE_DEFINITION } from "./journeyFixtures.ts";
import {
  computeProgress,
  criteriaSatisfied,
  isUnlocked,
  newlySatisfiedMilestoneIds,
  nextEpisode,
  nextLivingWorld,
  nextPractice,
  pendingReflectionIds,
} from "./progress.ts";
import type { JourneyState } from "./types.ts";

function freshState(overrides: Partial<JourneyState> = {}): JourneyState {
  return {
    journeyId: FIXTURE_DEFINITION.id,
    subjectId: "subject-1",
    status: "active",
    currentEpisodeId: "ep1",
    currentWorldId: null,
    activePracticeId: null,
    completedEpisodeIds: [],
    visitedWorldIds: [],
    completedPracticeIds: [],
    completedReflectionIds: [],
    completedMilestoneIds: [],
    startedAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

test("isUnlocked: a node with no prerequisites is always unlocked", () => {
  const [ep1] = FIXTURE_DEFINITION.episodes;
  assert.equal(isUnlocked(ep1, freshState()), true);
});

test("isUnlocked: a node is locked until its prerequisites are completed", () => {
  const world1 = FIXTURE_DEFINITION.livingWorlds[0];
  assert.equal(isUnlocked(world1, freshState()), false);
  assert.equal(isUnlocked(world1, freshState({ completedEpisodeIds: ["ep1"] })), true);
});

test("nextEpisode / nextLivingWorld / nextPractice skip completed and locked nodes", () => {
  const state = freshState();
  assert.equal(nextEpisode(FIXTURE_DEFINITION, state)?.id, "ep1");
  assert.equal(nextLivingWorld(FIXTURE_DEFINITION, state), null);
  assert.equal(nextPractice(FIXTURE_DEFINITION, state)?.id, "practice1");

  const afterEp1: JourneyState = { ...state, completedEpisodeIds: ["ep1"] };
  assert.equal(nextEpisode(FIXTURE_DEFINITION, afterEp1)?.id, "ep2");
  assert.equal(nextLivingWorld(FIXTURE_DEFINITION, afterEp1)?.id, "world1");
});

test("criteriaSatisfied checks every listed requirement across kinds", () => {
  const criteria = { requiredEpisodeIds: ["ep1"], requiredWorldIds: ["world1"] };
  assert.equal(criteriaSatisfied(criteria, freshState()), false);
  assert.equal(
    criteriaSatisfied(criteria, freshState({ completedEpisodeIds: ["ep1"], visitedWorldIds: ["world1"] })),
    true,
  );
});

test("newlySatisfiedMilestoneIds only returns milestones not already recorded", () => {
  const satisfied = newlySatisfiedMilestoneIds(
    FIXTURE_DEFINITION,
    freshState({ completedEpisodeIds: ["ep1"] }),
  );
  assert.deepEqual(satisfied, ["milestone1"]);

  const alreadyRecorded = newlySatisfiedMilestoneIds(
    FIXTURE_DEFINITION,
    freshState({ completedEpisodeIds: ["ep1"], completedMilestoneIds: ["milestone1"] }),
  );
  assert.deepEqual(alreadyRecorded, []);
});

test("pendingReflectionIds surfaces a reflection once its episode is complete, until acknowledged", () => {
  assert.deepEqual(pendingReflectionIds(FIXTURE_DEFINITION, freshState()), []);
  assert.deepEqual(
    pendingReflectionIds(FIXTURE_DEFINITION, freshState({ completedEpisodeIds: ["ep1"] })),
    ["ref1"],
  );
  assert.deepEqual(
    pendingReflectionIds(
      FIXTURE_DEFINITION,
      freshState({ completedEpisodeIds: ["ep1"], completedReflectionIds: ["ref1"] }),
    ),
    [],
  );
});

test("computeProgress reports percentComplete against required episodes/worlds/practices only", () => {
  const empty = computeProgress(FIXTURE_DEFINITION, freshState());
  assert.equal(empty.percentComplete, 0);

  const halfway = computeProgress(
    FIXTURE_DEFINITION,
    freshState({ completedEpisodeIds: ["ep1"], completedPracticeIds: ["practice1"] }),
  );
  // required set = 2 episodes + 1 world + 1 required practice = 4; 2 done (ep1, practice1)
  assert.equal(halfway.percentComplete, 50);
  assert.deepEqual(halfway.completedPracticeIds, ["practice1"]);
  assert.deepEqual(halfway.completedChallengeIds, []);

  const full = computeProgress(
    FIXTURE_DEFINITION,
    freshState({
      status: "completed",
      completedEpisodeIds: ["ep1", "ep2"],
      visitedWorldIds: ["world1"],
      completedPracticeIds: ["practice1"],
    }),
  );
  assert.equal(full.percentComplete, 100);
  assert.equal(full.isComplete, true);
});
