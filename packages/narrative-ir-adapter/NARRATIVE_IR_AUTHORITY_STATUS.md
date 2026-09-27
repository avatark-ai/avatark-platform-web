# Narrative IR Authority Status

**SOURCE AUTHORITY:** `avatark-ai/studiok-living-world-compiler`
(`studiok-living-symphony-compiler`, branch `main`)
**CANONICAL IR:** 0.3.0
**CANONICALIZATION:** 0.1.0
**Ratified by:** `PLT-ADR-007` / `NC-IR-RECONCILE-01`, governed by `STK-WO-007`

As of this gate (`R05` — Runtime Adapter Translation-Layer Migration), this
package's translation layer (`translation/evidenceActorFromCanonical.ts`,
`translation/artifactReferenceFromCanonical.ts`,
`translation/actionOpportunityFromCanonical.ts`,
`translation/expectationReferenceFromCanonical.ts`, and the mirrored
canonical shapes in `canonicalNarrativeIR.ts`) constructs its host contracts
(`ArtifactReference`, `ActionOpportunity`, `ExpectationReference`) from the
canonical Narrative IR authority above, rather than from
`studiok-specifications`'s `STK-SPEC-007`.

This package's certified pure evaluators — `deriveNonActionQualification()`,
`evaluateExpectation()`, `checkActivation()` — were **not modified** by this
migration. Only their input-construction layer changed; each evaluator
continues to consume the identical host-contract shape it always has, and
all 28 pre-migration tests still pass unmodified.

`STK-SPEC-007` remains **non-authoritative but not retired** (per
`PLT-ADR-007`) — its own retirement criteria remain unmet. The pre-migration
test fixtures derived from it (`test/fixtures/ls-kernel-01-non-action-fragment.json`,
`test/fixtures/bh-e002-expected-absence-fragment.json`) are retained as
historical fixtures and their tests still pass; they are not evidence of
this package's current source authority.

## What changed, and what did not

| Concept | Canonical source | Adapter target | Pure evaluator touched? |
|---|---|---|---|
| Action / NonAction | `schemas/ir/v0/action.schema.json` `Action(kind: NON_ACTION)` + `Action(kind: ACTION)` | `ActionOpportunity` | No — `deriveNonActionQualification()` unchanged |
| eventOrigin (per-Occurrence causal register) | `common.schema.json` `$defs/eventOrigin` | `EvidenceActor` | No |
| ExpectedPatternState | `schemas/ir/v0/expected-pattern-state.schema.json` (`presence`, `confidence`, `confirmationSequence`) | `ExpectationReference`, `ExpectationEvaluationContext.disconfirmationCountSoFar` (derived, not stored) | No — `evaluateExpectation()` unchanged |
| RuntimeRequirement | `schemas/ir/v0/runtime-requirements.schema.json` (`requires[]`) | `RuntimeCapabilities` | No — already byte-identical vocabulary (ported in the compiler's own `LW-COMPILER-R03`); `checkActivation()` unchanged |
| Artifact identity (`ruleId`/`eventId`) | `runtime-requirements/*` document `id` (ruleId-equivalent) + the triggering `Action`/`Occurrence` document `id` (eventId) | `ArtifactReference` | N/A — pure data carrier |
| VisitTransition *(added `R07`)* | `schemas/ir/v0/visit-transition.schema.json` (`kind`, `visitOrdinal?`, `relationshipDepth?`) | `VisitContext` (`translation/visitContextFromCanonical.ts`) | N/A — pure data carrier; `computeReturnRecognition()` itself (`@avatark/world-memory-runtime`) remains untouched and unimported here |

## Known unresolved semantic differences (not blockers, documented honestly)

- **ExpectationOrigin.OBSERVER_KNOWLEDGE** has no canonical source today: the
  canonical `ExpectedPatternState` node is explicitly world-pattern-origin
  only (observer-knowledge-origin expectations belong in
  `PersonalVisitorHistory`, which this package does not consume). The type
  value is retained (the evaluator never branches on it) but no translation
  constructor produces it yet.
- **`ExpectationReference.patternEvidence`** is now a synthetic, deterministic
  id list (`${expectationId}-evidence-${index}`) derived from
  `confirmationSequence`'s length, since canonical has no state-id-reference
  equivalent to STK-SPEC-007's `patternEvidence`. `evaluateExpectation()`
  only ever inspects this array's length, so this is behaviorally exact, but
  the ids themselves are not canonical state references — documented in
  `translation/expectationReferenceFromCanonical.ts`.
- **`VisitTransition` → `computeReturnRecognition()`**: this package has no
  production code consuming either concept today — `computeReturnRecognition()`
  lives in the separate `packages/world-memory-runtime` package, which this
  package's own `dependencyBoundary.test.ts` forbids importing. There is
  nothing in `@avatark/narrative-ir-adapter` to migrate for this pairing;
  see the `R05` completion report for the full scope-boundary finding.
- **Entity, Occurrence/Observation, Consequence, CausalAttribution**: as of
  `R05`, this package consumed none of these canonical concepts directly; no
  migration was needed or performed for them. (`PLT-R3G3-10` later added
  read-only adaptation of verified Occurrence documents; see below.)

## Compiled-artifact verification boundary (PLT-VERIFY-09)

`verifyCompiledArtifact({ artifact: CompiledArtifactIdentity, canonicalBytes })`
(`src/compiledArtifactVerification.ts`) is this package's trust boundary for
compiler artifacts. It accepts a claimed `{fixtureId, digest}` only when the
compiler-emitted canonical bytes are supplied and hash to exactly that digest,
under a canonicalization version it knows the digest rule for (currently only
`0.1.0`: SHA-256 over the exact UTF-8 canonical bytes, per the compiler's
published output contract). Unsupported versions, missing or malformed
material, digest mismatches and fixtureId mismatches are deterministic
`REFUSED` results.

The compiler remains the canonicalization authority: this package never
serializes or re-canonicalizes an artifact, it only hashes the bytes it was
given. VERIFIED proves the bytes match the claimed digest; it does not prove
who issued that digest.

## Verified world-history adaptation (PLT-R3G3-10)

`adaptVerifiedWorldHistory({ artifact, canonicalBytes })`
(`src/worldHistoryEvidence.ts`) first runs `verifyCompiledArtifact()`, then
extracts facts ONLY from the verified canonical artifact:

- WORLD_HISTORY HistoryPool entries, in their ordered, append-only positions,
  each with its reference typed by canonical document family and marked
  materialized or not in the same artifact (open references are kept, never
  resolved by guessing). PERSONAL_VISITOR_HISTORY pools are never emitted.
- Occurrence documents, with their authoritative fields copied verbatim.

Consequence, general causalHistory, and every other class remain out of scope.
An absent `entries`/`observations` is read as empty, per the compiler's
canonical default-equivalence (an omitted optional array equals an empty one).
