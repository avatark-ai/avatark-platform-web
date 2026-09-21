import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import nonActionFixture from "../test/fixtures/ls-kernel-01-non-action-canonical-fragment.json" with { type: "json" }
import expectationFixture from "../test/fixtures/bh-e002-expected-absence-canonical-fragment.json" with { type: "json" }
import { checkActivation } from "./runtimeCapabilities.ts"
import type { RuntimeCapabilities, RuntimeRequirement } from "./runtimeCapabilities.ts"
import { deriveNonActionQualification } from "./deriveNonActionQualification.ts"
import type { ObservedEvent, EvidenceWindow } from "./deriveNonActionQualification.ts"
import { evaluateExpectation } from "./expectationEvaluation.ts"
import type { ExpectationEvaluationContext } from "./expectationEvaluation.ts"
import { evidenceActorFromCanonicalEventOrigin } from "./translation/evidenceActorFromCanonical.ts"
import { artifactReferenceFromCanonical } from "./translation/artifactReferenceFromCanonical.ts"
import { actionOpportunityFromCanonicalAction } from "./translation/actionOpportunityFromCanonical.ts"
import {
  disconfirmationCountFromConfirmationSequence,
  expectationReferenceFromCanonical,
} from "./translation/expectationReferenceFromCanonical.ts"
import type { CanonicalAction, CanonicalExpectedPatternState } from "./canonicalNarrativeIR.ts"

function completeWindow(events: ObservedEvent[]): EvidenceWindow {
  return { completeness: "COMPLETE", events }
}

// Coverage A: canonical Action(kind: NON_ACTION) -> existing
// NonActionQualification behavior (deriveNonActionQualification() itself is
// not modified -- only its input construction).
test("R05-A: canonical Action(kind: NON_ACTION) qualifies via unmodified deriveNonActionQualification()", () => {
  const nonAction = nonActionFixture.documents["action/dwell-at-water"] as CanonicalAction
  const qualifyingAction = nonActionFixture.documents["action/clears-obstruction"] as CanonicalAction
  const runtimeRequirementsDoc = nonActionFixture.documents["runtime-requirements/dwell-reveals-approach"]

  const artifactReference = artifactReferenceFromCanonical(
    { fixtureId: nonActionFixture.fixtureId, digest: nonActionFixture.digest },
    runtimeRequirementsDoc,
    nonAction.id,
  )
  assert.deepStrictEqual(artifactReference, {
    sourceId: "r05-ls-kernel-01-canonical",
    digest: "test-fixture-digest-not-canonical",
    ruleId: "runtime-requirements/dwell-reveals-approach",
    eventId: "action/dwell-at-water",
  })

  const opportunity = actionOpportunityFromCanonicalAction(nonAction, qualifyingAction, {
    subjectId: nonActionFixture.subjectId,
    contextId: nonActionFixture.contextId,
    openedAtTick: 0,
    artifactReference,
  })
  assert.equal(opportunity.qualifyingActionRef, "action/clears-obstruction")

  const result = deriveNonActionQualification(opportunity, 10, completeWindow([]))
  assert.equal(result.status, "QUALIFIED")
  if (result.status === "QUALIFIED") {
    assert.equal(result.qualification.artifactReference.eventId, "action/dwell-at-water")
  }
})

test("R05-A: performing the canonical qualifying Action disqualifies the opportunity", () => {
  const nonAction = nonActionFixture.documents["action/dwell-at-water"] as CanonicalAction
  const qualifyingAction = nonActionFixture.documents["action/clears-obstruction"] as CanonicalAction
  const runtimeRequirementsDoc = nonActionFixture.documents["runtime-requirements/dwell-reveals-approach"]
  const artifactReference = artifactReferenceFromCanonical(
    { fixtureId: nonActionFixture.fixtureId, digest: nonActionFixture.digest },
    runtimeRequirementsDoc,
    nonAction.id,
  )
  const opportunity = actionOpportunityFromCanonicalAction(nonAction, qualifyingAction, {
    subjectId: nonActionFixture.subjectId,
    contextId: nonActionFixture.contextId,
    openedAtTick: 0,
    artifactReference,
  })

  const events: ObservedEvent[] = [
    {
      id: "perform-clear",
      subjectId: nonActionFixture.subjectId,
      actor: evidenceActorFromCanonicalEventOrigin("CONSUMER_CAUSED"),
      tick: 5,
      actionRef: qualifyingAction.id,
    },
  ]
  const result = deriveNonActionQualification(opportunity, 10, completeWindow(events))
  assert.equal(result.status, "NOT_QUALIFIED")
})

test("R05-A: non-CONSUMER eventOrigin translations never disqualify (mirrors T7's world-activity invariant)", () => {
  const nonAction = nonActionFixture.documents["action/dwell-at-water"] as CanonicalAction
  const qualifyingAction = nonActionFixture.documents["action/clears-obstruction"] as CanonicalAction
  const runtimeRequirementsDoc = nonActionFixture.documents["runtime-requirements/dwell-reveals-approach"]
  const artifactReference = artifactReferenceFromCanonical(
    { fixtureId: nonActionFixture.fixtureId, digest: nonActionFixture.digest },
    runtimeRequirementsDoc,
    nonAction.id,
  )
  const opportunity = actionOpportunityFromCanonicalAction(nonAction, qualifyingAction, {
    subjectId: nonActionFixture.subjectId,
    contextId: nonActionFixture.contextId,
    openedAtTick: 0,
    artifactReference,
  })

  const events: ObservedEvent[] = [
    { id: "e1", subjectId: "autonomous-entity", actor: evidenceActorFromCanonicalEventOrigin("OTHER_ENTITY_CAUSED"), tick: 2 },
    { id: "e2", subjectId: "context-1", actor: evidenceActorFromCanonicalEventOrigin("WORLD_PROCESS_CAUSED"), tick: 4 },
    { id: "e3", subjectId: nonActionFixture.subjectId, actor: evidenceActorFromCanonicalEventOrigin("UNEXPLAINED"), tick: 6 },
  ]
  const result = deriveNonActionQualification(opportunity, 10, completeWindow(events))
  assert.equal(result.status, "QUALIFIED")
})

// Coverage B: canonical ExpectedPatternState -> existing evaluateExpectation()
// behavior (evaluateExpectation() itself is not modified).
test("R05-B: canonical ExpectedPatternState with a trailing DISCONFIRMED produces EXPECTED_ABSENCE", () => {
  const placeMemory = expectationFixture.documents["place-memory/waiting-hollow"]
  const eps = placeMemory.expectedPatternState as CanonicalExpectedPatternState
  const runtimeRequirementsDoc = expectationFixture.documents["runtime-requirements/occupancy-pattern"]

  const artifactReference = artifactReferenceFromCanonical(
    { fixtureId: expectationFixture.fixtureId, digest: expectationFixture.digest },
    runtimeRequirementsDoc,
    placeMemory.placeId,
  )
  const expectation = expectationReferenceFromCanonical(eps, {
    expectationId: `expectation-${placeMemory.placeId}`,
    subjectId: expectationFixture.subjectId,
    property: expectationFixture.property,
    artifactReference,
  })
  assert.equal(expectation.origin, "WORLD_PATTERN")
  assert.equal(expectation.patternEvidence.length, eps.confirmationSequence.length)

  const disconfirmationCountSoFar = disconfirmationCountFromConfirmationSequence(eps.confirmationSequence.slice(0, -1))
  assert.equal(disconfirmationCountSoFar, 0, "no disconfirmation yet before the trailing gap is evaluated")

  const context: ExpectationEvaluationContext = {
    observedOutcome: "DEVIATED",
    withinPatternWindow: false,
    evidenceCompleteness: "COMPLETE",
    logicalTick: 10,
    disconfirmationCountSoFar,
  }
  const result = evaluateExpectation(expectation, context)
  assert.equal(result.status, "EXPECTED_ABSENCE")
  if (result.status === "EXPECTED_ABSENCE") {
    assert.equal(result.fact.disconfirmationCount, disconfirmationCountFromConfirmationSequence(eps.confirmationSequence))
    assert.equal(result.fact.subjectId, expectationFixture.subjectId)
  }
})

// STK-WO-009 Phase C (G10C-3): irVersion regression -- the source node's own
// version must survive translation and evaluation unchanged, never
// hard-coded and never dropped.
test("R05-J: the source ExpectedPatternState's own irVersion survives into ExpectationReference and into the evaluated ExpectedAbsenceFact unchanged", () => {
  const placeMemory = expectationFixture.documents["place-memory/waiting-hollow"]
  const eps = placeMemory.expectedPatternState as CanonicalExpectedPatternState
  const runtimeRequirementsDoc = expectationFixture.documents["runtime-requirements/occupancy-pattern"]

  const artifactReference = artifactReferenceFromCanonical(
    { fixtureId: expectationFixture.fixtureId, digest: expectationFixture.digest },
    runtimeRequirementsDoc,
    placeMemory.placeId,
  )
  const expectation = expectationReferenceFromCanonical(eps, {
    expectationId: `expectation-${placeMemory.placeId}`,
    subjectId: expectationFixture.subjectId,
    property: expectationFixture.property,
    artifactReference,
  })
  assert.equal(expectation.irVersion, eps.irVersion)
  assert.equal(expectation.irVersion, "0.3.0", "this fixture's own documents declare irVersion 0.3.0 -- asserting the literal proves the value came from the fixture, not a hard-coded default")

  const disconfirmationCountSoFar = disconfirmationCountFromConfirmationSequence(eps.confirmationSequence.slice(0, -1))
  const result = evaluateExpectation(expectation, {
    observedOutcome: "DEVIATED",
    withinPatternWindow: false,
    evidenceCompleteness: "COMPLETE",
    logicalTick: 10,
    disconfirmationCountSoFar,
  })
  assert.equal(result.status, "EXPECTED_ABSENCE")
  if (result.status === "EXPECTED_ABSENCE") {
    assert.equal(result.fact.irVersion, eps.irVersion)
  }
})

test("R05-B: disconfirmationCountFromConfirmationSequence is a derived view, never a second stored authority", () => {
  assert.equal(disconfirmationCountFromConfirmationSequence(["CONFIRMED", "CONFIRMED", "CONFIRMED", "DISCONFIRMED"]), 1)
  assert.equal(disconfirmationCountFromConfirmationSequence([]), 0)
  assert.equal(disconfirmationCountFromConfirmationSequence(["DISCONFIRMED", "DISCONFIRMED"]), 2)
})

test("R05-B: an empty canonical confirmationSequence collapses to NOT_APPLICABLE (evaluator gate preserved)", () => {
  const eps: CanonicalExpectedPatternState = { irVersion: "0.3.0", presence: "NEVER_PRESENT", confidence: 0, confirmationSequence: [] }
  const runtimeRequirementsDoc = expectationFixture.documents["runtime-requirements/occupancy-pattern"]
  const artifactReference = artifactReferenceFromCanonical(
    { fixtureId: expectationFixture.fixtureId, digest: expectationFixture.digest },
    runtimeRequirementsDoc,
    "place/never-visited",
  )
  const expectation = expectationReferenceFromCanonical(eps, {
    expectationId: "expectation-place/never-visited",
    subjectId: "place/never-visited",
    property: "occupancy",
    artifactReference,
  })
  assert.deepStrictEqual(expectation.patternEvidence, [])

  const result = evaluateExpectation(expectation, {
    observedOutcome: "DEVIATED",
    withinPatternWindow: false,
    evidenceCompleteness: "COMPLETE",
    logicalTick: 1,
    disconfirmationCountSoFar: 0,
  })
  assert.equal(result.status, "NOT_APPLICABLE")
})

// Coverage D: canonical RuntimeRequirement -> existing activation/capability
// behavior. The vocabulary is byte-identical (EXACT_EQUIVALENT per the
// NC-IR-RECONCILE-01 crosswalk); this proves the canonical document's own
// `requires[]` values plug into checkActivation() with zero remapping.
test("R05-D: canonical runtime-requirements document's requires[] plug directly into checkActivation()", () => {
  const runtimeRequirementsDoc = nonActionFixture.documents["runtime-requirements/dwell-reveals-approach"]
  const requires = runtimeRequirementsDoc.requires as RuntimeRequirement[]
  const capabilities: RuntimeCapabilities = {
    schemaVersion: "1.0.0",
    supports: Object.fromEntries(requires.map(r => [r, true])),
  }
  const result = checkActivation(requires, capabilities)
  assert.deepStrictEqual(result, { activation: "ALLOWED" })
})

// Coverage H: CausalAttribution preserved distinctly from eventOrigin --
// translation only ever reads eventOrigin, never causalAttribution.
test("R05-H: eventOrigin translation module's CODE (not its explanatory comments) never references causalAttribution", () => {
  const filePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "translation", "evidenceActorFromCanonical.ts")
  const codeOnly = readFileSync(filePath, "utf8")
    .split("\n")
    .filter(line => !line.trim().startsWith("//"))
    .join("\n")
  assert.ok(!codeOnly.includes("causalAttribution"), "eventOrigin translation must never read the distinct causalAttribution concept in actual code")
})

// Coverage I: provenance/Trace false-friend protection -- ArtifactReference
// construction must never be conflated with common.schema.json's
// SYSTEM_OBSERVED/CONSUMER_DECLARED provenance concept (a different concept
// that happens to share the field name "provenance", per the crosswalk's
// explicit false-friend finding).
test("R05-I: artifact-identity translation never references the SYSTEM_OBSERVED/CONSUMER_DECLARED provenance concept", () => {
  const filePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "translation", "artifactReferenceFromCanonical.ts")
  const contents = readFileSync(filePath, "utf8")
  assert.ok(!contents.includes("SYSTEM_OBSERVED"), "artifact-identity translation must not conflate compiled-artifact provenance with fact provenance")
  assert.ok(!contents.includes("CONSUMER_DECLARED"), "artifact-identity translation must not conflate compiled-artifact provenance with fact provenance")
})
