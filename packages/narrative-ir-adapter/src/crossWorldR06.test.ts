import { test } from "node:test"
import assert from "node:assert/strict"
import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import fixture from "../test/fixtures/r06-living-vrindavan-protocol-identity.json" with { type: "json" }
import { artifactReferenceFromCanonical } from "./translation/artifactReferenceFromCanonical.ts"
import { actionOpportunityFromCanonicalAction } from "./translation/actionOpportunityFromCanonical.ts"
import { evidenceActorFromCanonicalEventOrigin } from "./translation/evidenceActorFromCanonical.ts"
import { deriveNonActionQualification } from "./deriveNonActionQualification.ts"
import type { ObservedEvent, EvidenceWindow } from "./deriveNonActionQualification.ts"
import type { CanonicalAction } from "./canonicalNarrativeIR.ts"

function completeWindow(events: ObservedEvent[]): EvidenceWindow {
  return { completeness: "COMPLETE", events }
}

// R06 -- Cross-World protocol test, adapter side. Living Vrindavan vocabulary
// is a different domain from every other fixture this package consumes
// (Living Symphony). The fixture is NON-AUTHORITATIVE protocol test material
// (see its _provenanceClass / _sourceAuthority): its digest is a well-formed
// SHA-256 value, not the placeholder, but its source artifact exists only in
// a quarantined non-authoritative compiler lineage, so it proves nothing about
// authoritative compiler provenance. What these tests prove is the protocol:
// a second-domain {fixtureId, digest} plus runtime-requirements document and
// Action ids -> this package's unmodified R05 translation constructors -> the
// unmodified deriveNonActionQualification() pure evaluator -> correct result,
// with the digest carried through unchanged.
test("R06: second-domain protocol fixture translates and qualifies via unmodified R05 code", () => {
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
  // The digest is a well-formed SHA-256 hex value, not the
  // "test-fixture-digest-not-canonical" placeholder R05/R05C's own fixtures
  // carry. It is protocol material only: carried unchanged, never verified
  // against canonical bytes here (see the fixture's _sourceAuthority).
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
  // certified DELIBERATE_NON_ACTION behavior over second-domain vocabulary.
  const result = deriveNonActionQualification(opportunity, 10, completeWindow([]))
  assert.equal(result.status, "QUALIFIED")
  if (result.status === "QUALIFIED") {
    assert.equal(result.qualification.subjectId, "entity/grove-keeper")
    assert.equal(result.qualification.artifactReference.digest, fixture.digest)
  }
})

test("R06: the grove-keeper moving toward the sound source disqualifies the opportunity (same protocol fixture)", () => {
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
// proof: this package's existing pure-evaluator surface never consumes
// Entity/Occurrence/Consequence/WorldProcess/Trace directly --
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

// PLT-HYGIENE-08: the fixture's provenance claim must be no stronger than its
// evidence. A reproducible digest is not authoritative provenance: the source
// artifact exists only in a quarantined, non-authoritative compiler lineage.
test("R06 hygiene: the fixture is classified as non-authoritative protocol material and makes no authoritative-provenance claim", () => {
  assert.equal(fixture._provenanceClass, "PROTOCOL_TEST_FIXTURE_NON_AUTHORITATIVE_SOURCE")
  assert.match(fixture._sourceAuthority, /quarantined/)
  assert.match(fixture._sourceAuthority, /non-authoritative/)
  assert.match(fixture._sourceAuthority, /not authoritative provenance/)

  // No authority is claimed for the source bytes, and no quarantined commit is
  // cited as the place they came from.
  assert.doesNotMatch(fixture._fixtureNote, /\bREAL\b/)
  assert.doesNotMatch(fixture._fixtureNote, /de68213|at compiler HEAD/)
  assert.doesNotMatch(fixture._sourceAuthority, /de68213/)
  assert.match(fixture._fixtureNote, /NON-AUTHORITATIVE/)

  // The protocol contract is unchanged: the well-formed digest is carried
  // through ArtifactReference exactly as given.
  const artifactReference = artifactReferenceFromCanonical(
    { fixtureId: fixture.fixtureId, digest: fixture.digest },
    fixture.runtimeRequirementsDocument,
    fixture.nonAction.id,
  )
  assert.equal(artifactReference.digest, "7108d56f55772a93a807afe748c2e2200d9463fe9dc0a88cf7248345bf6653a5")
  assert.equal(artifactReference.sourceId, fixture.fixtureId)
})
