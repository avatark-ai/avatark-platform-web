import { test } from "node:test"
import assert from "node:assert/strict"
import returnFixture from "../test/fixtures/r07-living-vrindavan-return-visit-2.json" with { type: "json" }
import firstEntryFixture from "../test/fixtures/r07-living-vrindavan-first-entry.json" with { type: "json" }
import { visitContextFromCanonical } from "./translation/visitContextFromCanonical.ts"
import type { CanonicalVisitTransition } from "./canonicalNarrativeIR.ts"

// R07 -- Return/Revisit Continuity Bridge. Proves item 1 of the mission's
// Required Proofs ("canonical VisitTransition can cross the application
// boundary") at the translation layer: a real canonical-shaped
// VisitTransition document (hand-authored against
// schemas/ir/v0/visit-transition.schema.json, IR 0.3.0) becomes a
// runtime-neutral VisitContext, with no world-memory-runtime import anywhere
// in this file or its dependency (guarded project-wide by
// dependencyBoundary.test.ts).

test("R07-A: canonical FIRST_ENTRY VisitTransition translates to a first_entry VisitContext with no visitOrdinal", () => {
  const transition = firstEntryFixture.documents["visit-transition/living-vrindavan-first-entry"] as CanonicalVisitTransition
  const context = visitContextFromCanonical(transition)
  assert.deepStrictEqual(context, { kind: "first_entry", visitOrdinal: null, relationshipDepth: null })
})

test("R07-B: canonical RETURN VisitTransition (visitOrdinal 2) translates to a return VisitContext carrying visitOrdinal and relationshipDepth verbatim", () => {
  const transition = returnFixture.documents["visit-transition/living-vrindavan-return-2"] as CanonicalVisitTransition
  const context = visitContextFromCanonical(transition)
  assert.deepStrictEqual(context, { kind: "return", visitOrdinal: 2, relationshipDepth: 1 })
})

// Schema note: "Must be able to exceed 2 -- an architecture that only
// accepts 2 is a defect (EV-017)." Proven directly, not merely typed.
test("R07-C: visitOrdinal is not special-cased at exactly 2 -- a real third-or-later visit translates correctly", () => {
  const context = visitContextFromCanonical({ kind: "RETURN", visitOrdinal: 7, relationshipDepth: 4 })
  assert.deepStrictEqual(context, { kind: "return", visitOrdinal: 7, relationshipDepth: 4 })
})

test("R07-D: RETURN without visitOrdinal is rejected (schema: visitOrdinal required iff kind === RETURN)", () => {
  assert.throws(() => visitContextFromCanonical({ kind: "RETURN" }), /requires visitOrdinal/)
})

test("R07-E: RETURN with visitOrdinal below 2 is rejected (schema: minimum 2)", () => {
  assert.throws(() => visitContextFromCanonical({ kind: "RETURN", visitOrdinal: 1 }), /must be >= 2/)
})

test("R07-F: FIRST_ENTRY carrying visitOrdinal is rejected (schema: visitOrdinal forbidden when kind !== RETURN)", () => {
  assert.throws(() => visitContextFromCanonical({ kind: "FIRST_ENTRY", visitOrdinal: 2 }), /must not carry visitOrdinal/)
})

test("R07-G: relationshipDepth is optional and defaults to null when absent, for both kinds", () => {
  assert.deepStrictEqual(visitContextFromCanonical({ kind: "FIRST_ENTRY" }), { kind: "first_entry", visitOrdinal: null, relationshipDepth: null })
  assert.deepStrictEqual(visitContextFromCanonical({ kind: "RETURN", visitOrdinal: 2 }), { kind: "return", visitOrdinal: 2, relationshipDepth: null })
})

// Determinism (Required Proofs item 8, at the translation layer): the same
// canonical input always produces the same VisitContext.
test("R07-H: translation is deterministic for identical canonical input", () => {
  const a = visitContextFromCanonical({ kind: "RETURN", visitOrdinal: 5, relationshipDepth: 3 })
  const b = visitContextFromCanonical({ kind: "RETURN", visitOrdinal: 5, relationshipDepth: 3 })
  assert.deepStrictEqual(a, b)
})
