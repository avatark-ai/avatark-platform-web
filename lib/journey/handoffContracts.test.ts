import { test } from "node:test";
import assert from "node:assert/strict";
import { createJourneyManifest } from "./manifest.ts";
import {
  buildEchoToStreamKHandoff,
  buildStreamKToPrometheusHandoff,
  buildPrometheusToLivingEchoHandoff,
  buildLivingEchoToArenaHandoff,
} from "./handoffContracts.ts";

test("buildEchoToStreamKHandoff: projects watchFirstId/returnTo when both present", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "invitation",
    entryPoint: "enter",
    invitationId: "tok_1",
    watchFirstId: "story-1",
    returnTo: "/witness/the-promise-to-myself",
  });
  const handoff = buildEchoToStreamKHandoff(manifest);
  assert.deepEqual(handoff, {
    journeyId: "j1",
    invitationId: "tok_1",
    watchFirstId: "story-1",
    returnTo: "/witness/the-promise-to-myself",
  });
});

test("buildEchoToStreamKHandoff: null when there's no Watch First content to hand off", () => {
  const manifest = createJourneyManifest({ journeyId: "j1", source: "invitation", entryPoint: "enter" });
  assert.equal(buildEchoToStreamKHandoff(manifest), null);
});

test("buildStreamKToPrometheusHandoff: projects the same fields the real practiceHandoff/prometheusk mechanism uses", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "invitation",
    entryPoint: "witness",
    invitationId: "tok_1",
    practiceId: "the-promise-to-myself",
    cohortId: "c1",
    returnTo: "/continue",
  });
  const handoff = buildStreamKToPrometheusHandoff(manifest);
  assert.deepEqual(handoff, {
    journeyId: "j1",
    practiceId: "the-promise-to-myself",
    witness: "the-promise-to-myself",
    invitationId: "tok_1",
    cohortId: "c1",
    returnTo: "/continue",
  });
});

test("buildStreamKToPrometheusHandoff: null without a practiceId or returnTo", () => {
  const manifest = createJourneyManifest({ journeyId: "j1", source: "invitation", entryPoint: "witness" });
  assert.equal(buildStreamKToPrometheusHandoff(manifest), null);
});

test("buildPrometheusToLivingEchoHandoff: carries the verified completion timestamp through", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "invitation",
    entryPoint: "witness",
    practiceId: "the-promise-to-myself",
  });
  const handoff = buildPrometheusToLivingEchoHandoff(manifest, "2026-07-27T12:00:00.000Z");
  assert.deepEqual(handoff, {
    journeyId: "j1",
    practiceId: "the-promise-to-myself",
    completedAt: "2026-07-27T12:00:00.000Z",
  });
});

test("buildPrometheusToLivingEchoHandoff: null without a practiceId -- never guesses which practice completed", () => {
  const manifest = createJourneyManifest({ journeyId: "j1", source: "invitation", entryPoint: "witness" });
  assert.equal(buildPrometheusToLivingEchoHandoff(manifest, "2026-07-27T12:00:00.000Z"), null);
});

test("buildLivingEchoToArenaHandoff: carries the recommendation reason and returnTo through", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "resume",
    entryPoint: "journey",
    returnTo: "/journey/today",
  });
  const handoff = buildLivingEchoToArenaHandoff(manifest, "practice_completed");
  assert.deepEqual(handoff, { journeyId: "j1", recommendationReason: "practice_completed", returnTo: "/journey/today" });
});
