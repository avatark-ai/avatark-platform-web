import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyInvitationStatus, isInvitationUsable } from "./validation.ts";
import type { Invitation } from "./types.ts";

const NOW = new Date("2026-07-27T00:00:00.000Z");

function makeInvitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    token: "tok_123",
    type: "practice",
    destination: { type: "practice", practiceSlug: "the-promise-to-myself" },
    status: "pending",
    metadata: {
      issuedBy: "arenak",
      createdAt: "2026-07-01T00:00:00.000Z",
      expiresAt: null,
      maxUses: null,
      useCount: 0,
    },
    ...overrides,
  };
}

test("a fresh, unlimited-use invitation is pending and usable", () => {
  const invitation = makeInvitation();
  assert.equal(classifyInvitationStatus(invitation, NOW), "pending");
  assert.equal(isInvitationUsable(invitation, NOW), true);
});

test("an invitation past its expiresAt is expired, even if status still says pending", () => {
  const invitation = makeInvitation({
    metadata: { issuedBy: "arenak", createdAt: "2026-07-01T00:00:00.000Z", expiresAt: "2026-07-20T00:00:00.000Z", maxUses: null, useCount: 0 },
  });
  assert.equal(classifyInvitationStatus(invitation, NOW), "expired");
  assert.equal(isInvitationUsable(invitation, NOW), false);
});

test("an invitation not yet past expiresAt is still pending", () => {
  const invitation = makeInvitation({
    metadata: { issuedBy: "arenak", createdAt: "2026-07-01T00:00:00.000Z", expiresAt: "2026-08-01T00:00:00.000Z", maxUses: null, useCount: 0 },
  });
  assert.equal(classifyInvitationStatus(invitation, NOW), "pending");
});

test("an invitation at its use limit is exhausted", () => {
  const invitation = makeInvitation({
    metadata: { issuedBy: "arenak", createdAt: "2026-07-01T00:00:00.000Z", expiresAt: null, maxUses: 5, useCount: 5 },
  });
  assert.equal(classifyInvitationStatus(invitation, NOW), "exhausted");
  assert.equal(isInvitationUsable(invitation, NOW), false);
});

test("an invitation under its use limit is still pending", () => {
  const invitation = makeInvitation({
    metadata: { issuedBy: "arenak", createdAt: "2026-07-01T00:00:00.000Z", expiresAt: null, maxUses: 5, useCount: 4 },
  });
  assert.equal(classifyInvitationStatus(invitation, NOW), "pending");
});

test("a revoked invitation is always revoked, regardless of expiry/usage", () => {
  const invitation = makeInvitation({ status: "revoked" });
  assert.equal(classifyInvitationStatus(invitation, NOW), "revoked");
  assert.equal(isInvitationUsable(invitation, NOW), false);
});

test("an already-accepted invitation stays accepted", () => {
  const invitation = makeInvitation({ status: "accepted" });
  assert.equal(classifyInvitationStatus(invitation, NOW), "accepted");
  assert.equal(isInvitationUsable(invitation, NOW), false);
});

test("an invalid invitation is always invalid", () => {
  const invitation = makeInvitation({ status: "invalid" });
  assert.equal(classifyInvitationStatus(invitation, NOW), "invalid");
  assert.equal(isInvitationUsable(invitation, NOW), false);
});
