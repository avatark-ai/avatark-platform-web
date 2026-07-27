import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeEchoInvitationToken } from "./tokenFormat.ts";

test("echo: resolves a real Echo slug", () => {
  const payload = decodeEchoInvitationToken("echo:the-returner");
  assert.deepEqual(payload?.destination, { type: "echo", echoSlug: "the-returner" });
});

test("echo: an unknown Echo slug resolves to null, never a fabricated destination", () => {
  assert.equal(decodeEchoInvitationToken("echo:not-a-real-echo"), null);
});

test("practice: resolves a real practice slug", () => {
  const payload = decodeEchoInvitationToken("practice:the-promise-to-myself");
  assert.deepEqual(payload?.destination, { type: "practice", practiceSlug: "the-promise-to-myself" });
});

test("practice: an unknown practice slug resolves to null", () => {
  assert.equal(decodeEchoInvitationToken("practice:not-a-real-practice"), null);
});

test("echo_practice: resolves both a real Echo and a real practice", () => {
  const payload = decodeEchoInvitationToken("echo_practice:the-returner:the-promise-to-myself");
  assert.deepEqual(payload?.destination, { type: "echo_practice", echoSlug: "the-returner", practiceSlug: "the-promise-to-myself" });
});

test("echo_practice: an unknown practice slug invalidates the whole invitation", () => {
  assert.equal(decodeEchoInvitationToken("echo_practice:the-returner:not-a-real-practice"), null);
});

test("cohort: resolves without requiring a practice", () => {
  const payload = decodeEchoInvitationToken("cohort:builder-cohort-1");
  assert.deepEqual(payload?.destination, { type: "cohort", cohortId: "builder-cohort-1" });
});

test("cohort: resolves with a real associated practice", () => {
  const payload = decodeEchoInvitationToken("cohort:builder-cohort-1:the-promise-to-myself");
  assert.deepEqual(payload?.destination, { type: "cohort", cohortId: "builder-cohort-1", practiceSlug: "the-promise-to-myself" });
});

test("cohort: an unknown associated practice invalidates the invitation", () => {
  assert.equal(decodeEchoInvitationToken("cohort:builder-cohort-1:not-a-real-practice"), null);
});

test("event: resolves an event id", () => {
  const payload = decodeEchoInvitationToken("event:launch-2026");
  assert.deepEqual(payload?.destination, { type: "event", eventId: "launch-2026" });
});

test("story: an unknown story slug resolves to null (no story content exists yet)", () => {
  assert.equal(decodeEchoInvitationToken("story:some-story"), null);
});

test("episode: resolves an episode slug", () => {
  const payload = decodeEchoInvitationToken("episode:ep-01");
  assert.deepEqual(payload?.destination, { type: "episode", episodeSlug: "ep-01" });
});

test("a legacy/unstructured bare token falls back to the first Echo in the registry, matching pre-existing /enter/[token] behavior", () => {
  const payload = decodeEchoInvitationToken("revathi");
  assert.equal(payload?.destination.type, "echo");
});

test("an empty-part structured token (e.g. 'practice:') resolves to null, not the legacy fallback", () => {
  assert.equal(decodeEchoInvitationToken("practice:"), null);
});
