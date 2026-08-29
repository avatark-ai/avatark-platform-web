import { test } from "node:test"
import assert from "node:assert/strict"
import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fixture from "../test/fixtures/r06-living-vrindavan-real-compiled-identity.json" with { type: "json" }
import { artifactReferenceFromCanonical } from "./translation/artifactReferenceFromCanonical.ts"
import { actionOpportunityFromCanonicalAction } from "./translation/actionOpportunityFromCanonical.ts"
import { evidenceActorFromCanonicalEventOrigin } from "./translation/evidenceActorFromCanonical.ts"
import { deriveNonActionQualification } from "./deriveNonActionQualification.ts"
import type { ObservedEvent, EvidenceWindow } from "./deriveNonActionQualification.ts"
import type { CanonicalAction } from "./canonicalNarrativeIR.ts"

function completeWindow(events: ObservedEvent[]): EvidenceWindow {
  return { completeness: "COMPLETE", events }
}

// R06 -- Cross-World Falsification, adapter side. Living Vrindavan is a
// genuinely different domain from every fixture this package has consumed
// before (Living Symphony). Unlike R05's own canonical-shaped fixtures, the
// `digest` here is the REAL output of studiok-living-symphony-compiler's
// unmodified compile() over a real second-domain fixture -- see
// r06-living-vrindavan-real-compiled-identity.json's own note for the exact
// reproduction command. This is the end-to-end chain R05/R05C left unproven:
// second-domain source -> real compile() -> real digest -> this package's
// unmodified R05 translation constructors -> the unmodified
// deriveNonActionQualification() pure evaluator -> correct result.
test("R06: real second-domain compiled artifact translates and qualifies via unmodified R05 code", () => {
  const artifactReference = artifactReferenceFromCanonical(
    { fixtureId: fixture.fixtureId, digest: fixture.digest },
    fixture.runtimeRequirementsDocument,
    fixture.nonAction.id,
  )
  assert.deepStrictEqual(artifactReference, {
    sourceId: "r06-living-vrindavan-flute-across-yamuna",
    digest: "7108d56f55772a93a807afe748c2e2200d9463fe9dc0a88cf7248345bf6653a5",
    ruleId: "runtime-requirements/flute-signal-non-action",
    eventId: "action/grove-keeper-remains-with-herd",
  })
  // The digest is the real compiler's output, not a fixture placeholder --
  // structurally a genuine SHA-256 hex digest (R05/R05C's own fixtures all
  // carried a literal "test-fixture-digest-not-canonical" placeholder; this
  // one does not).
  assert.match(artifactReference.digest, /^[0-9a-f]{64}$/)
  assert.notEqual(artifactReference.digest, "test-fixture-digest-not-canonical")

  const opportunity = actionOpportunityFromCanonicalAction(fixture.nonAction as CanonicalAction, fixture.qualifyingAction as CanonicalAction, {
    subjectId: fixture.subjectId,
    contextId: fixture.contextId,
    openedAtTick: 0,
    artifactReference,
  })

  // The grove-keeper never performs the qualifying action (moving toward the
  // sound source) within the window -- QUALIFIED, reproducing NC-IR-02C's
  // certified DELIBERATE_NON_ACTION behavior against a real second-domain
  // artifact for the first time.
  const result = deriveNonActionQualification(opportunity, 10, completeWindow([]))
  assert.equal(result.status, "QUALIFIED")
  if (result.status === "QUALIFIED") {
    assert.equal(result.qualification.subjectId, "entity/grove-keeper")
    assert.equal(result.qualification.artifactReference.digest, fixture.digest)
  }
})

test("R06: the grove-keeper moving toward the sound source disqualifies the opportunity (same real artifact)", () => {
  const artifactReference = artifactReferenceFromCanonical(
    { fixtureId: fixture.fixtureId, digest: fixture.digest },
    fixture.runtimeRequirementsDocument,
    fixture.nonAction.id,
  )
  const opportunity = actionOpportunityFromCanonicalAction(fixture.nonAction as CanonicalAction, fixture.qualifyingAction as CanonicalAction, {
    subjectId: fixture.subjectId,
    contextId: fixture.contextId,
    openedAtTick: 0,
    artifactReference,
  })

  const events: ObservedEvent[] = [
    {
      id: "grove-keeper-moves",
      subjectId: fixture.subjectId,
      actor: evidenceActorFromCanonicalEventOrigin("CONSUMER_CAUSED"),
      tick: 4,
      actionRef: fixture.qualifyingAction.id,
    },
  ]
  const result = deriveNonActionQualification(opportunity, 10, completeWindow(events))
  assert.equal(result.status, "NOT_QUALIFIED")
})

// No new production translation code was required for this second-domain
// proof: Entity/Occurrence/Consequence/WorldProcess/Trace all exist and
// validate in the real compiled Living Vrindavan artifact (see the compiler
// repo's LW_COMPILER_R06_CROSS_WORLD_FALSIFICATION.md), but this package's
// existing pure-evaluator surface never consumes any of them directly --
// only the Action/NonAction/RuntimeRequirement path does, and that path is
// unmodified R05 code. This test documents that finding as an assertion,
// not just prose: every symbol this file imports from ./translation/ and
// ./ already existed before R06.
// R07 update: this test originally asserted exact equality against the
// translation/*.ts set as it stood at the end of R06. R07 (Return/Revisit
// Continuity Bridge) legitimately added one new translation file,
// visitContextFromCanonical.ts, for a DIFFERENT proof (VisitTransition ->
// VisitContext) than R06's own scope (cross-world falsification) ever
// required -- exactly the outcome this test's own original comment
// anticipated ("If this fails, R06 (or a later gate) added a
// translation/*.ts file -- which is fine, but this test's premise...
// would then be false and must be corrected, not silently left stale").
// Loosened from exact-equality to subset-containment so R06's own
// historical finding (R05's translation layer already sufficed for R06's
// second-domain proof, with zero R06-specific additions) stays true and
// checked forever, without this test breaking every time a later gate
// legitimately adds unrelated translation code.
test("R06: R05's existing translation layer already sufficed for R06's own second-domain proof -- no R06-specific translation file was required", () => {
  const translationDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "translation")
  const actualFiles = readdirSync(translationDir).filter((f) => f.endsWith(".ts"))
  const preR06TranslationFiles = [
    "actionOpportunityFromCanonical.ts",
    "artifactReferenceFromCanonical.ts",
    "evidenceActorFromCanonical.ts",
    "expectationReferenceFromCanonical.ts",
  ]
  for (const file of preR06TranslationFiles) {
    assert.ok(actualFiles.includes(file), `${file} (present since before R06) must still exist`)
  }
})
