import type { JourneyDefinition } from "./types.ts";

/** Shared fixture for progress.test.ts and runtime.test.ts. Deliberately generic --
 * no product is named -- to exercise every node kind, a reflection, a milestone,
 * and completion criteria without pretending to be a real product's content. */
export const FIXTURE_DEFINITION: JourneyDefinition = {
  id: "fixture-journey",
  title: "Fixture Journey",
  episodes: [
    { id: "ep1", title: "Arrival", prerequisites: [], reflectionIds: ["ref1"] },
    { id: "ep2", title: "Descent", prerequisites: ["ep1"] },
  ],
  livingWorlds: [{ id: "world1", title: "The Grove", prerequisites: ["ep1"] }],
  practices: [
    { id: "practice1", kind: "practice", title: "Morning Stillness", prerequisites: [] },
    { id: "challenge1", kind: "challenge", title: "Night Trial", prerequisites: ["world1"] },
  ],
  reflections: [{ id: "ref1", episodeId: "ep1", prompt: "What did arrival feel like?" }],
  milestones: [
    { id: "milestone1", title: "First Steps", criteria: { requiredEpisodeIds: ["ep1"] } },
  ],
  completionCriteria: {
    requiredEpisodeIds: ["ep1", "ep2"],
    requiredWorldIds: ["world1"],
  },
};
