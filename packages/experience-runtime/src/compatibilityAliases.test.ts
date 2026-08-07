import { test } from "node:test";
import assert from "node:assert/strict";
import { ExperienceRuntime, ExperienceRuntimeError } from "./index.ts";
import { JourneyRuntime, JourneyError } from "./index.ts";
import type { ExperienceDefinition, ExperienceState } from "./index.ts";
import { InMemoryJourneyRepository } from "./index.ts";

// Proves the Sprint 3 naming-cleanup compatibility aliases (see
// docs/RUNTIME_GLOSSARY.md Part 2, index.ts's own comment) are truly
// zero-behavior-difference re-exports -- not new classes, not copies --
// so either name is safe to use interchangeably today.

test("ExperienceRuntime is the exact same class as JourneyRuntime, not a copy", () => {
  assert.equal(ExperienceRuntime, JourneyRuntime);
});

test("ExperienceRuntimeError is the exact same class as JourneyError, not a copy", () => {
  assert.equal(ExperienceRuntimeError, JourneyError);
  assert.ok(new ExperienceRuntimeError("x") instanceof JourneyError);
});

test("ExperienceDefinition / ExperienceState type aliases are usable in place of JourneyDefinition / JourneyState", () => {
  const definition: ExperienceDefinition = {
    id: "alias-check",
    title: "Alias Check",
    episodes: [],
    livingWorlds: [],
    practices: [],
    reflections: [],
    milestones: [],
    completionCriteria: {},
  };
  const runtime = new ExperienceRuntime(definition, new InMemoryJourneyRepository());
  assert.ok(runtime instanceof JourneyRuntime);
});

test("ExperienceState satisfies the same shape JourneyState requires", async () => {
  const definition: ExperienceDefinition = {
    id: "alias-check-2",
    title: "Alias Check 2",
    episodes: [{ id: "ep1", title: "Episode 1", prerequisites: [] }],
    livingWorlds: [],
    practices: [],
    reflections: [],
    milestones: [],
    completionCriteria: { requiredEpisodeIds: ["ep1"] },
  };
  const runtime = new ExperienceRuntime(definition, new InMemoryJourneyRepository());
  const state: ExperienceState = await runtime.start("subject-1");
  assert.equal(state.status, "active");
});
