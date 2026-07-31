import { test } from "node:test";
import assert from "node:assert/strict";
import { createInvitationContext } from "./types.ts";
import type { Invitation } from "./types.ts";

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

test("createInvitationContext defaults every optional field to its honest 'not yet known' null", () => {
  const context = createInvitationContext(makeInvitation(), "prometheusk");
  assert.equal(context.targetProduct, "prometheusk");
  assert.equal(context.entryDoor, null);
  assert.equal(context.campaign, null);
  assert.equal(context.returnProduct, null);
  assert.equal(context.membershipPlan, null);
  assert.equal(context.organizationId, null);
  assert.equal(context.journeyId, null);
  assert.equal(context.invitation.token, "tok_123");
});

test("createInvitationContext only overrides the fields a caller actually passes", () => {
  const context = createInvitationContext(makeInvitation(), "prometheusk", {
    entryDoor: "qr_code",
    returnProduct: "avatark",
    journeyId: "journey_abc",
  });
  assert.equal(context.entryDoor, "qr_code");
  assert.equal(context.returnProduct, "avatark");
  assert.equal(context.journeyId, "journey_abc");
  // Untouched fields still fall back to null, not undefined.
  assert.equal(context.campaign, null);
  assert.equal(context.membershipPlan, null);
});

test("createInvitationContext with a real campaign preserves its shape untouched", () => {
  const campaign = { id: "camp_1", name: "Launch Week", ownedBy: "arenak", startsAt: null, endsAt: null };
  const context = createInvitationContext(makeInvitation(), "arenak", { campaign });
  assert.deepEqual(context.campaign, campaign);
});
