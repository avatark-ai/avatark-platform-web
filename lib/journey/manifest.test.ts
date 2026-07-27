import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createJourneyManifest,
  manifestFromInvitation,
  manifestFromGuestContext,
  mergeManifestMetadata,
} from "./manifest.ts";
import type { GuestJourneyContext } from "./guestContext.ts";
import type { Invitation, InvitationDestination, InvitationMetadata } from "@avatark/invitations";

function invitation(destination: InvitationDestination, metadata: Partial<InvitationMetadata> = {}): Invitation {
  return {
    token: "tok_1",
    type: destination.type,
    destination,
    status: "pending",
    metadata: {
      issuedBy: "arenak",
      createdAt: "2026-01-01T00:00:00.000Z",
      expiresAt: null,
      maxUses: null,
      useCount: 0,
      ...metadata,
    },
  };
}

function guestContext(patch: Partial<GuestJourneyContext> = {}): GuestJourneyContext {
  return {
    schemaVersion: 1,
    invitationToken: null,
    witness: null,
    intendedPracticeId: null,
    watchFirstContentId: null,
    step: null,
    intendedReturnRoute: null,
    acceptedAt: null,
    claimed: false,
    ...patch,
  };
}

test("createJourneyManifest: defaults an unspecified journey to invitation_received with no history", () => {
  const manifest = createJourneyManifest({ journeyId: "j1", source: "direct", entryPoint: "enter" });
  assert.equal(manifest.nextStep, "invitation_received");
  assert.deepEqual(manifest.completedSteps, []);
  assert.deepEqual(manifest.metadata, {});
  assert.equal(manifest.invitationId, null);
});

test("manifestFromInvitation: bridges a practice destination's practiceSlug into practiceId", () => {
  const destination: InvitationDestination = { type: "practice", practiceSlug: "the-promise-to-myself" };
  const inv = invitation(destination);
  const manifest = manifestFromInvitation("j1", inv, destination, { title: "t", body: "b", available: false });
  assert.equal(manifest.invitationId, "tok_1");
  assert.equal(manifest.practiceId, "the-promise-to-myself");
  assert.equal(manifest.cohortId, null);
  assert.equal(manifest.source, "invitation");
  assert.equal(manifest.entryPoint, "enter");
  assert.equal(manifest.metadata.destinationType, "practice");
  assert.equal(manifest.metadata.destinationAvailable, "false");
});

test("manifestFromInvitation: bridges a cohort destination's cohortId, with no practiceId", () => {
  const destination: InvitationDestination = { type: "cohort", cohortId: "c1" };
  const inv = invitation(destination);
  const manifest = manifestFromInvitation("j1", inv, destination, { title: "t", body: "b", available: false });
  assert.equal(manifest.cohortId, "c1");
  assert.equal(manifest.practiceId, null);
});

test("manifestFromGuestContext: an unstepped guest context resumes at invitation_accepted", () => {
  const guest = guestContext({ invitationToken: "tok_1" });
  const manifest = manifestFromGuestContext("j1", guest);
  assert.equal(manifest.nextStep, "invitation_accepted");
  assert.equal(manifest.source, "resume");
  assert.equal(manifest.entryPoint, "enter");
  assert.deepEqual(manifest.completedSteps, ["invitation_received"]);
});

test("manifestFromGuestContext: normalizes guest field spellings into the manifest's own", () => {
  const guest = guestContext({
    invitationToken: "tok_1",
    intendedPracticeId: "the-promise-to-myself",
    watchFirstContentId: "story-1",
    intendedReturnRoute: "/witness/the-promise-to-myself",
    step: "watch_first",
  });
  const manifest = manifestFromGuestContext("j1", guest);
  assert.equal(manifest.invitationId, "tok_1");
  assert.equal(manifest.practiceId, "the-promise-to-myself");
  assert.equal(manifest.watchFirstId, "story-1");
  assert.equal(manifest.returnTo, "/witness/the-promise-to-myself");
  assert.equal(manifest.nextStep, "practice_intro");
  assert.equal(manifest.entryPoint, "witness");
  assert.deepEqual(manifest.completedSteps, ["invitation_received", "invitation_accepted", "watch_first"]);
});

test("manifestFromGuestContext: a practice_intro step resumes at practice_runtime", () => {
  const guest = guestContext({ step: "practice_intro" });
  const manifest = manifestFromGuestContext("j1", guest);
  assert.equal(manifest.nextStep, "practice_runtime");
  assert.deepEqual(manifest.completedSteps, [
    "invitation_received",
    "invitation_accepted",
    "watch_first",
    "practice_intro",
  ]);
});

test("mergeManifestMetadata: patches additively, leaving untouched keys alone", () => {
  const manifest = createJourneyManifest({
    journeyId: "j1",
    source: "direct",
    entryPoint: "enter",
    metadata: { intention: "calm" },
  });
  const merged = mergeManifestMetadata(manifest, { witness: "the-promise-to-myself" });
  assert.equal(merged.metadata.intention, "calm");
  assert.equal(merged.metadata.witness, "the-promise-to-myself");
});
