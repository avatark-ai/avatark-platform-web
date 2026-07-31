import { test } from "node:test"
import assert from "node:assert/strict"
import {
  AUTH_EYEBROW,
  AUTH_HEADING,
  AUTH_IDENTITY_STATEMENT,
  AUTH_UNAVAILABLE_MESSAGE,
  PRODUCT_SIGN_IN_CONTEXT,
  FORBIDDEN_DIAGNOSTIC_PHRASES,
} from "./copy.ts"

test("base copy matches the frozen mission strings", () => {
  assert.equal(AUTH_EYEBROW, "AVATARK IDENTITY")
  assert.equal(AUTH_HEADING, "Sign in")
  assert.equal(AUTH_IDENTITY_STATEMENT, "One identity across the AvatarK ecosystem.")
})

test("unavailable message is the exact consumer-safe sentence", () => {
  assert.equal(AUTH_UNAVAILABLE_MESSAGE, "Sign-in is temporarily unavailable. Please try again later.")
})

test("all 8 named products have a return-context sentence", () => {
  const expected = ["gamek", "studiok", "streamk", "cinemak", "arenak", "prometheusk", "atlas", "setpointk"]
  for (const id of expected) {
    assert.ok(PRODUCT_SIGN_IN_CONTEXT[id as keyof typeof PRODUCT_SIGN_IN_CONTEXT], `missing sign-in context for ${id}`)
  }
  assert.equal(Object.keys(PRODUCT_SIGN_IN_CONTEXT).length, expected.length)
})

test("product context sentences match the mission spec verbatim", () => {
  assert.equal(PRODUCT_SIGN_IN_CONTEXT.gamek, "You will return to GameK when sign-in is complete.")
  assert.equal(PRODUCT_SIGN_IN_CONTEXT.setpointk, "You will return to SetpointK to continue with your authorized physiological data experience.")
  assert.equal(PRODUCT_SIGN_IN_CONTEXT.prometheusk, "You will return to PrometheusK, where your practices and Living Echo live.")
})

test("no product context sentence contains a forbidden diagnostic phrase", () => {
  for (const [id, sentence] of Object.entries(PRODUCT_SIGN_IN_CONTEXT)) {
    for (const phrase of FORBIDDEN_DIAGNOSTIC_PHRASES) {
      assert.ok(!sentence.toLowerCase().includes(phrase), `${id} sentence leaks "${phrase}"`)
    }
  }
})

test("unavailable message contains no forbidden diagnostic phrase", () => {
  for (const phrase of FORBIDDEN_DIAGNOSTIC_PHRASES) {
    assert.ok(!AUTH_UNAVAILABLE_MESSAGE.toLowerCase().includes(phrase))
  }
})
