import { test } from "node:test";
import assert from "node:assert/strict";
import { invitationContinueHref, previewInvitationDestination } from "./destination.ts";
import type { InvitationDestination } from "@avatark/invitations";

test("practice destination previews real content but is honestly unavailable when the PrometheusK handoff isn't (never substitutes another practice)", () => {
  // "the-promise-to-myself" is Echo's one real seed practice, and its
  // PrometheusK handoff is deliberately unmapped (see
  // lib/onboarding/practiceHandoff.ts) -- this must read as an honest
  // unavailable state, not a broken "available" promise.
  const destination: InvitationDestination = { type: "practice", practiceSlug: "the-promise-to-myself" };
  const preview = previewInvitationDestination(destination);
  assert.equal(preview.available, false);
  assert.equal(preview.title, "The Two-Minute Check-In");
  assert.match(preview.body, /isn't available to begin on PrometheusK/);
  assert.equal(invitationContinueHref(destination, "tok_1"), null);
});

test("echo destination previews with real content and continues to the guide page (no PrometheusK handoff involved)", () => {
  const destination: InvitationDestination = { type: "echo", echoSlug: "the-returner" };
  const preview = previewInvitationDestination(destination);
  assert.equal(preview.available, true);
  assert.equal(preview.title, "The Returner");
  assert.equal(invitationContinueHref(destination, "tok_1"), "/guide/the-returner?invitation=tok_1");
});

test("echo_practice destination is honestly unavailable for the same reason a bare practice destination is", () => {
  const destination: InvitationDestination = { type: "echo_practice", echoSlug: "the-returner", practiceSlug: "the-promise-to-myself" };
  const preview = previewInvitationDestination(destination);
  assert.equal(preview.available, false);
  assert.match(preview.body, /The Returner/);
  assert.match(preview.body, /isn't available to begin on PrometheusK/);
  assert.equal(invitationContinueHref(destination, "tok_1"), null);
});

test("an unresolvable practice destination is unavailable, never a fabricated preview", () => {
  const destination: InvitationDestination = { type: "practice", practiceSlug: "not-a-real-practice" };
  const preview = previewInvitationDestination(destination);
  assert.equal(preview.available, false);
  assert.equal(invitationContinueHref(destination, "tok_1"), null);
});

test("cohort destinations are honestly unavailable -- no cohort content model exists", () => {
  const destination: InvitationDestination = { type: "cohort", cohortId: "builder-cohort-1" };
  const preview = previewInvitationDestination(destination);
  assert.equal(preview.available, false);
  assert.equal(invitationContinueHref(destination, "tok_1"), null);
});

test("event destinations are honestly unavailable", () => {
  const destination: InvitationDestination = { type: "event", eventId: "launch-2026" };
  assert.equal(previewInvitationDestination(destination).available, false);
  assert.equal(invitationContinueHref(destination, "tok_1"), null);
});

test("episode destinations are honestly unavailable", () => {
  const destination: InvitationDestination = { type: "episode", episodeSlug: "ep-01" };
  assert.equal(previewInvitationDestination(destination).available, false);
  assert.equal(invitationContinueHref(destination, "tok_1"), null);
});

test("story destinations are honestly unavailable even when the slug doesn't resolve", () => {
  const destination: InvitationDestination = { type: "story", storySlug: "not-a-real-story" };
  const preview = previewInvitationDestination(destination);
  assert.equal(preview.available, false);
  assert.equal(invitationContinueHref(destination, "tok_1"), null);
});
