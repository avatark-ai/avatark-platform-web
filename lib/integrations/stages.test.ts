import { test } from "node:test";
import assert from "node:assert/strict";
import { JOURNEY_STEP_ORDER, createJourneyManifest } from "@avatark/journey";
import { productForStep, legalNextSteps, boundaryCrossing, INTEGRATION_STAGE_ORDER } from "./stages.ts";

test("INTEGRATION_STAGE_ORDER is the 5 stages in mission order", () => {
  assert.deepEqual(INTEGRATION_STAGE_ORDER, ["AvatarK", "StreamK", "Prometheus", "Living Echo", "Arena"]);
});

test("productForStep maps every one of the 9 steps to the documented stage", () => {
  const expected: Record<string, string> = {
    invitation_received: "AvatarK",
    invitation_accepted: "AvatarK",
    watch_first: "StreamK",
    practice_intro: "AvatarK",
    practice_runtime: "Prometheus",
    reflection: "Prometheus",
    living_echo: "Living Echo",
    recommendation: "Living Echo",
    arena: "Arena",
  };
  for (const step of JOURNEY_STEP_ORDER) {
    assert.equal(productForStep(step), expected[step], `unexpected product for ${step}`);
  }
});

test("legalNextSteps mirrors the state machine's own transition table", () => {
  assert.deepEqual(legalNextSteps("invitation_received"), ["invitation_accepted"]);
  assert.deepEqual(legalNextSteps("invitation_accepted"), ["watch_first", "practice_intro"]);
  assert.deepEqual(legalNextSteps("arena"), []);
});

test("exactly the 4 documented transitions cross a real product boundary", () => {
  assert.equal(boundaryCrossing("invitation_accepted", "watch_first")?.toProduct, "StreamK");
  assert.equal(boundaryCrossing("practice_intro", "practice_runtime")?.toProduct, "Prometheus");
  assert.equal(boundaryCrossing("reflection", "living_echo")?.toProduct, "Living Echo");
  assert.equal(boundaryCrossing("recommendation", "arena")?.toProduct, "Arena");
});

test("every other legal transition stays within one stage -- no boundary crossing", () => {
  assert.equal(boundaryCrossing("invitation_received", "invitation_accepted"), null);
  assert.equal(boundaryCrossing("invitation_accepted", "practice_intro"), null);
  assert.equal(boundaryCrossing("watch_first", "practice_intro"), null);
  assert.equal(boundaryCrossing("practice_runtime", "reflection"), null);
  assert.equal(boundaryCrossing("living_echo", "recommendation"), null);
});

test("boundaryCrossing's buildHandoff wires straight to the real handoffContracts.ts builder", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "invitation",
    entryPoint: "enter",
    invitationId: "tok_1",
    watchFirstId: "story-1",
    returnTo: "/witness/the-promise-to-myself",
  });
  const crossing = boundaryCrossing("invitation_accepted", "watch_first");
  const handoff = crossing!.buildHandoff(manifest) as { watchFirstId: string; returnTo: string } | null;
  assert.equal(handoff?.watchFirstId, "story-1");
  assert.equal(handoff?.returnTo, "/witness/the-promise-to-myself");
});

test("boundaryCrossing's describeWithAdapter routes to the matching adapter's honest result", () => {
  const crossing = boundaryCrossing("practice_intro", "practice_runtime")!;
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "direct",
    entryPoint: "witness",
    practiceId: "the-promise-to-myself",
    returnTo: "/continue",
  });
  const handoff = crossing.buildHandoff(manifest);
  const result = crossing.describeWithAdapter(handoff);
  assert.equal(result.availability, "available");
  assert.equal(result.accepted, false, "the-promise-to-myself has no verified PrometheusK match today");
});
