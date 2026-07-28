import { test } from "node:test";
import assert from "node:assert/strict";
import { streamkAdapter } from "./streamkAdapter.ts";
import { prometheusAdapter } from "./prometheusAdapter.ts";
import { livingEchoAdapter } from "./livingEchoAdapter.ts";
import { arenaAdapter } from "./arenaAdapter.ts";

test("streamkAdapter: always not_implemented, never accepted, with or without a handoff", () => {
  const withHandoff = streamkAdapter.describeHandoff({
    journeyId: "j1",
    invitationId: "tok_1",
    watchFirstId: "story-1",
    returnTo: "/witness/the-promise-to-myself",
  });
  assert.equal(withHandoff.availability, "not_implemented");
  assert.equal(withHandoff.accepted, false);
  const withoutHandoff = streamkAdapter.describeHandoff(null);
  assert.equal(withoutHandoff.availability, "not_implemented");
  assert.equal(withoutHandoff.accepted, false);
});

test("prometheusAdapter: accepted reflects whether the named practice is actually mapped", () => {
  const mapped = prometheusAdapter.describeHandoff({
    journeyId: "j1",
    practiceId: "not-a-real-practice",
    witness: "not-a-real-practice",
    invitationId: null,
    cohortId: null,
    returnTo: "/continue",
  });
  assert.equal(mapped.availability, "available");
  assert.equal(mapped.accepted, false, "no practice is mapped in this repo today");
  assert.match(mapped.message, /no verified PrometheusK match/);
});

test("prometheusAdapter: null handoff reads as no practice named yet, not a crash", () => {
  const result = prometheusAdapter.describeHandoff(null);
  assert.equal(result.accepted, false);
  assert.equal(result.availability, "available");
});

test("livingEchoAdapter: accepted true given any handoff -- the receipt loop is real today", () => {
  const result = livingEchoAdapter.describeHandoff({
    journeyId: "j1",
    practiceId: "the-promise-to-myself",
    completedAt: "2026-07-28T00:00:00.000Z",
  });
  assert.equal(result.accepted, true);
  assert.equal(result.availability, "available");
});

test("livingEchoAdapter: null handoff reads as nothing to record yet", () => {
  const result = livingEchoAdapter.describeHandoff(null);
  assert.equal(result.accepted, false);
  assert.equal(result.availability, "available");
});

test("arenaAdapter: always not_implemented, never accepted", () => {
  const withHandoff = arenaAdapter.describeHandoff({
    journeyId: "j1",
    recommendationReason: "practice_completed",
    returnTo: "/journey/today",
  });
  assert.equal(withHandoff.availability, "not_implemented");
  assert.equal(withHandoff.accepted, false);
  const withoutHandoff = arenaAdapter.describeHandoff(null);
  assert.equal(withoutHandoff.availability, "not_implemented");
  assert.equal(withoutHandoff.accepted, false);
});

test("every adapter names the productId/displayName the mission asked for", () => {
  assert.equal(streamkAdapter.displayName, "StreamK");
  assert.equal(prometheusAdapter.displayName, "PrometheusK");
  assert.equal(livingEchoAdapter.displayName, "Living Echo");
  assert.equal(arenaAdapter.displayName, "Arena");
});
