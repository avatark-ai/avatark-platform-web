import { test } from "node:test";
import assert from "node:assert/strict";
import { createLocalInvitationResolver, type LocalTokenDecoder } from "./localResolver.ts";

const decode: LocalTokenDecoder = (token) => {
  if (token === "practice-token") return { destination: { type: "practice", practiceSlug: "the-promise-to-myself" } };
  if (token === "cohort-token") return { destination: { type: "cohort", cohortId: "builder-cohort-1" }, issuedBy: "arenak", maxUses: 10, useCount: 3 };
  if (token === "expiring-token")
    return { destination: { type: "echo", echoSlug: "the-returner" }, expiresAt: "2020-01-01T00:00:00.000Z" };
  return null;
};

test("resolves a known token to a typed Invitation", async () => {
  const resolver = createLocalInvitationResolver(decode);
  const invitation = await resolver.resolve("practice-token");
  assert.ok(invitation);
  assert.equal(invitation?.type, "practice");
  assert.deepEqual(invitation?.destination, { type: "practice", practiceSlug: "the-promise-to-myself" });
  assert.equal(invitation?.metadata.issuedBy, "arenak");
});

test("carries through issuer/usage metadata when the decoder supplies it", async () => {
  const resolver = createLocalInvitationResolver(decode);
  const invitation = await resolver.resolve("cohort-token");
  assert.equal(invitation?.metadata.maxUses, 10);
  assert.equal(invitation?.metadata.useCount, 3);
  assert.equal(invitation?.destination.type, "cohort");
});

test("carries through an expiresAt the decoder supplies", async () => {
  const resolver = createLocalInvitationResolver(decode);
  const invitation = await resolver.resolve("expiring-token");
  assert.equal(invitation?.metadata.expiresAt, "2020-01-01T00:00:00.000Z");
});

test("an unknown token resolves to null, never a fabricated invitation", async () => {
  const resolver = createLocalInvitationResolver(decode);
  const invitation = await resolver.resolve("not-a-real-token");
  assert.equal(invitation, null);
});

test("an empty token resolves to null without calling the decoder", async () => {
  let called = false;
  const resolver = createLocalInvitationResolver(() => {
    called = true;
    return null;
  });
  const invitation = await resolver.resolve("");
  assert.equal(invitation, null);
  assert.equal(called, false);
});
