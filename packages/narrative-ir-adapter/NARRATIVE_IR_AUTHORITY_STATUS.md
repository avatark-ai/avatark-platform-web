# Narrative IR Authority Status

This package's translation layer (`artifactReference.ts`,
`runtimeCapabilities.ts`, `actionOpportunity.ts`,
`expectationReference.ts`, `expectedAbsenceFact.ts`,
`deriveNonActionQualification.ts`, `expectationEvaluation.ts`) currently
reads its shape and vocabulary from `studiok-specifications`'s
`STK-SPEC-007` (`narrative-ir.schema.json`).

As of 2026-08-29, `studiok-platform`'s `PLT-ADR-007` (Narrative IR
authority reconciliation, governed by `STK-WO-007`) ratifies
`studiok-living-symphony-compiler`
(`avatark-ai/studiok-living-world-compiler`, `main`,
`3653b20c515f550186fc2805e17e633340574201`) as the canonical Narrative IR
specification-and-compiler authority. `STK-SPEC-007` remains
non-authoritative but **not retired** — this package continues to
correctly read from it today; nothing in this package is broken or
stale by this finding.

**No code in this package was changed by that reconciliation gate.** A
future, separately-authorized migration gate (`R05` in
`studiok-living-symphony-compiler`'s
`LW_COMPILER_R01_MIGRATION_ROADMAP.md`) will re-point this package's
translation/reference-construction layer at the authoritative schema
(`Action(kind: NON_ACTION)` for `ActionOpportunity`/
`NonActionQualification`; `ExpectedPatternState`/`confirmationSequence`
for `ExpectationReference`/`ExpectationEvaluationContext`;
`VisitTransition` for whatever feeds `computeReturnRecognition()`). This
package's own certified pure evaluators
(`deriveNonActionQualification()`, `evaluateExpectation()`) are expected
to be preserved unchanged by that future migration — only their
translation/input-construction layer is expected to change.

See `studiok-platform/adr/0007-narrative-ir-authority-reconciliation.md`
and its crosswalk JSON for the full concept-by-concept mapping.
