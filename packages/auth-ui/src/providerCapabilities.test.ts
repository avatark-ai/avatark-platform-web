import { test } from "node:test"
import assert from "node:assert/strict"
import { shouldShowGoogleButton } from "./types.ts"

test("Google button shows only when status is enabled and google is true", () => {
  assert.equal(shouldShowGoogleButton({ google: true, status: "enabled" }), true)
})

test("Google button hidden when status is disabled even if google were somehow true", () => {
  assert.equal(shouldShowGoogleButton({ google: true, status: "disabled" }), false)
})

test("Google button hidden when the capability check was unavailable/inconclusive", () => {
  assert.equal(shouldShowGoogleButton({ google: true, status: "unavailable" }), false)
  assert.equal(shouldShowGoogleButton({ google: false, status: "unavailable" }), false)
})

test("Google button hidden when enabled status but google flag false", () => {
  assert.equal(shouldShowGoogleButton({ google: false, status: "enabled" }), false)
})
