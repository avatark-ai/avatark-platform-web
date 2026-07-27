import { test } from "node:test";
import assert from "node:assert/strict";
import { describeInvitation } from "./metadata.ts";
import { previewInvitationDestination } from "./destination.ts";
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

function answer(answers: ReturnType<typeof describeInvitation>, label: string): string {
  const match = answers.find((a) => a.label === label);
  assert.ok(match, `expected an answer for "${label}"`);
  return match!.value;
}

test("describeInvitation: names the issuing product honestly, never a fabricated person", () => {
  const destination: InvitationDestination = { type: "echo", echoSlug: "the-returner" };
  const inv = invitation(destination);
  const answers = describeInvitation(inv, previewInvitationDestination(destination));
  assert.equal(answer(answers, "Who invited me?"), "Sent via ArenaK");
});

test("describeInvitation: falls back to a title-cased raw issuer id when unmapped", () => {
  const destination: InvitationDestination = { type: "echo", echoSlug: "the-returner" };
  const inv = invitation(destination, { issuedBy: "somenewproduct" });
  const answers = describeInvitation(inv, previewInvitationDestination(destination));
  assert.equal(answer(answers, "Who invited me?"), "Sent via Somenewproduct");
});

test("describeInvitation: how long reflects no expiration and unlimited uses honestly", () => {
  const destination: InvitationDestination = { type: "echo", echoSlug: "the-returner" };
  const inv = invitation(destination);
  const answers = describeInvitation(inv, previewInvitationDestination(destination));
  assert.equal(answer(answers, "How long?"), "No expiration set");
});

test("describeInvitation: how long reports a formatted expiry and uses remaining when set", () => {
  const destination: InvitationDestination = { type: "echo", echoSlug: "the-returner" };
  const inv = invitation(destination, { expiresAt: "2026-12-31T00:00:00.000Z", maxUses: 5, useCount: 2 });
  const answers = describeInvitation(inv, previewInvitationDestination(destination));
  assert.equal(answer(answers, "How long?"), "Open until December 31, 2026 · 3 uses left");
});

test("describeInvitation: practice destination surfaces the real practice's why-it-mattered and title", () => {
  const destination: InvitationDestination = { type: "practice", practiceSlug: "the-promise-to-myself" };
  const inv = invitation(destination);
  const answers = describeInvitation(inv, previewInvitationDestination(destination));
  assert.match(answer(answers, "Why?"), /fade from disuse/);
  assert.equal(answer(answers, "What practice?"), "The Two-Minute Check-In");
  assert.match(answer(answers, "What happens after?"), /isn't ready to begin yet/);
});

test("describeInvitation: echo destination has no specific practice yet", () => {
  const destination: InvitationDestination = { type: "echo", echoSlug: "the-returner" };
  const inv = invitation(destination);
  const answers = describeInvitation(inv, previewInvitationDestination(destination));
  assert.equal(answer(answers, "What practice?"), "No specific practice yet — you'll choose one inside.");
  assert.match(answer(answers, "What happens after?"), /hands off to PrometheusK/);
});

test("describeInvitation: cohort/event destinations are honest about having no specific practice", () => {
  const destination: InvitationDestination = { type: "cohort", cohortId: "c1" };
  const inv = invitation(destination);
  const answers = describeInvitation(inv, previewInvitationDestination(destination));
  assert.equal(answer(answers, "What practice?"), "Not tied to a specific practice.");
  assert.equal(answer(answers, "Why?"), "Someone thought this was worth your time.");
});
