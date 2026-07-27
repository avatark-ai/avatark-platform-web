import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldSkipInvitationAcceptance } from "./invitationAcceptance.ts";
import type { JourneyContext } from "./state.ts";

const EMPTY: JourneyContext = {
  intention: null,
  witness: null,
  startedAt: null,
  lastSeenAt: null,
  practiceCompletedAt: null,
  invitationId: null,
  invitationAcceptedAt: null,
};

test("a first-time acceptance is never skipped", () => {
  assert.equal(shouldSkipInvitationAcceptance(EMPTY, "tok_1"), false);
});

test("re-accepting the same invitation is skipped -- no duplicate event", () => {
  const alreadyAccepted: JourneyContext = { ...EMPTY, invitationId: "tok_1", invitationAcceptedAt: "2026-07-20T00:00:00.000Z" };
  assert.equal(shouldSkipInvitationAcceptance(alreadyAccepted, "tok_1"), true);
});

test("accepting a DIFFERENT invitation after one was already accepted is not skipped", () => {
  const alreadyAccepted: JourneyContext = { ...EMPTY, invitationId: "tok_1", invitationAcceptedAt: "2026-07-20T00:00:00.000Z" };
  assert.equal(shouldSkipInvitationAcceptance(alreadyAccepted, "tok_2"), false);
});

test("a matching invitationId with no recorded acceptedAt yet is not skipped (defensive: half-written state)", () => {
  const partial: JourneyContext = { ...EMPTY, invitationId: "tok_1", invitationAcceptedAt: null };
  assert.equal(shouldSkipInvitationAcceptance(partial, "tok_1"), false);
});
