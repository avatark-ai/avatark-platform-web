import { test } from "node:test";
import assert from "node:assert/strict";
import { invitationSignInReturnPath } from "./signInReturn.ts";

test("sign-in return path preserves the invitation token", () => {
  assert.equal(invitationSignInReturnPath("tok_abc123"), "/enter/tok_abc123");
});

test("sign-in return path URL-encodes a token with special characters", () => {
  assert.equal(invitationSignInReturnPath("tok/with slash"), "/enter/tok%2Fwith%20slash");
});
