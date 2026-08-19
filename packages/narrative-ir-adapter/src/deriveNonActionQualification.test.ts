import { test } from "node:test"
import assert from "node:assert/strict"
import fixture from "../test/fixtures/ls-kernel-01-non-action-fragment.json" with { type: "json" }
import { checkActivation, MINIMAL_RUNTIME_CAPABILITIES } from "./runtimeCapabilities.ts"
import type { RuntimeCapabilities } from "./runtimeCapabilities.ts"
import type { ActionOpportunity } from "./actionOpportunity.ts"
import { deriveNonActionQualification } from "./deriveNonActionQualification.ts"
import type { ObservedEvent, EvidenceWindow } from "./deriveNonActionQualification.ts"

// Builds the opportunity the fixture's own "dwell-reveals-approach" rule
// establishes -- generic vocabulary only, never a Living-Symphony type.
function opportunityFromFixture(): ActionOpportunity {
  return {
    id: "opportunity-1",
    subjectId: fixture.entities[0].id,
    contextId: "context-1",
    qualifyingActionRef: fixture.events.mutuallyExclusiveAction.id,
    openedAtTick: 0,
    ruleId: fixture.provenance.ruleId,
    artifactReference: {
      sourceId: fixture.provenance.sourceId,
      digest: fixture.provenance.digest,
      ruleId: fixture.provenance.ruleId,
      eventId: fixture.provenance.eventId,
    },
  }
}

function completeWindow(events: ObservedEvent[]): EvidenceWindow {
  return { completeness: "COMPLETE", events }
}

test("T1: capability supported -> activation allowed", () => {
  const capabilities: RuntimeCapabilities = { schemaVersion: "1.0.0", supports: { DELIBERATE_NON_ACTION: true } }
  const result = checkActivation(["DELIBERATE_NON_ACTION"], capabilities)
  assert.deepStrictEqual(result, { activation: "ALLOWED" })
})

test("T2: capability unsupported -> activation rejected, never silently degraded", () => {
  const result = checkActivation(["DELIBERATE_NON_ACTION"], MINIMAL_RUNTIME_CAPABILITIES)
  assert.equal(result.activation, "REJECTED")
  assert.equal(result.activation === "REJECTED" && result.requirement, "DELIBERATE_NON_ACTION")
})

test("T3: qualifying action occurs before the terminal boundary -> no qualification", () => {
  const opportunity = opportunityFromFixture()
  const events: ObservedEvent[] = [
    { id: fixture.events.mutuallyExclusiveAction.id, subjectId: "consumer", actor: "CONSUMER", tick: 5, actionRef: fixture.events.mutuallyExclusiveAction.id },
  ]
  const result = deriveNonActionQualification(opportunity, 10, completeWindow(events))
  assert.equal(result.status, "NOT_QUALIFIED")
})

test("T4: qualified non-action -> NonActionQualification produced", () => {
  const opportunity = opportunityFromFixture()
  const result = deriveNonActionQualification(opportunity, 10, completeWindow([]))
  assert.equal(result.status, "QUALIFIED")
  if (result.status === "QUALIFIED") {
    assert.equal(result.qualification.subjectId, "consumer")
    assert.equal(result.qualification.opportunityId, "opportunity-1")
    assert.equal(result.qualification.qualifiedAtTick, 10)
    assert.deepStrictEqual(result.qualification.evidence.disqualifyingEventIds, [])
  }
})

test("T5: missing/incomplete telemetry -> no qualification, explicit incomplete diagnostic (never ACTION, never NON_ACTION)", () => {
  const opportunity = opportunityFromFixture()
  const result = deriveNonActionQualification(opportunity, 10, { completeness: "INCOMPLETE", events: [] })
  assert.equal(result.status, "INCOMPLETE_EVIDENCE")
})

test("T6: later action after qualification does not retroactively erase the prior qualification", () => {
  const opportunity = opportunityFromFixture()
  const firstResult = deriveNonActionQualification(opportunity, 10, completeWindow([]))
  assert.equal(firstResult.status, "QUALIFIED")

  // A later action event, occurring after the terminal boundary already
  // used to qualify, is added to a wider evidence window -- re-deriving
  // over the SAME terminal boundary must reproduce the identical fact.
  const laterEvents: ObservedEvent[] = [
    { id: "later-action", subjectId: "consumer", actor: "CONSUMER", tick: 20, actionRef: fixture.events.mutuallyExclusiveAction.id },
  ]
  const secondResult = deriveNonActionQualification(opportunity, 10, completeWindow(laterEvents))
  assert.deepStrictEqual(secondResult, firstResult)
})

test("T7: autonomous/environmental world activity during the opportunity does not disqualify it", () => {
  const opportunity = opportunityFromFixture()
  const events: ObservedEvent[] = [
    { id: "autonomous-encounter", subjectId: "autonomous-entity", actor: "AUTONOMOUS", tick: 3 },
    { id: "environmental-shift", subjectId: "context-1", actor: "ENVIRONMENTAL", tick: 6 },
    { id: "unspecified-change", subjectId: "consumer", actor: "UNSPECIFIED", tick: 8 },
  ]
  const result = deriveNonActionQualification(opportunity, 10, completeWindow(events))
  assert.equal(result.status, "QUALIFIED")
})

test("T8: determinism -- identical inputs produce a deep-equal result", () => {
  const opportunity = opportunityFromFixture()
  const events: ObservedEvent[] = [{ id: "autonomous-encounter", subjectId: "autonomous-entity", actor: "AUTONOMOUS", tick: 3 }]
  const first = deriveNonActionQualification(opportunity, 10, completeWindow(events))
  const second = deriveNonActionQualification(opportunity, 10, completeWindow(events))
  assert.deepStrictEqual(first, second)
})

test("T9: qualification carries correct canonical artifact provenance", () => {
  const opportunity = opportunityFromFixture()
  const result = deriveNonActionQualification(opportunity, 10, completeWindow([]))
  assert.equal(result.status, "QUALIFIED")
  if (result.status === "QUALIFIED") {
    assert.deepStrictEqual(result.qualification.artifactReference, {
      sourceId: "LS-KERNEL-01",
      digest: fixture.provenance.digest,
      ruleId: "dwell-reveals-approach",
      eventId: "dwell-at-water",
    })
  }
})

test("T11: downstream autonomous/environmental events retain their own causal attribution", () => {
  const opportunity = opportunityFromFixture()
  const autonomousEvent: ObservedEvent = { id: "autonomous-encounter", subjectId: "autonomous-entity", actor: "AUTONOMOUS", tick: 12 }
  const result = deriveNonActionQualification(opportunity, 10, completeWindow([autonomousEvent]))

  assert.equal(result.status, "QUALIFIED")
  // The derivation never inspects, mutates, or references events outside its
  // own bounded window -- the later autonomous event's actor is exactly as
  // supplied, and no qualification field claims it as consumer-caused.
  assert.equal(autonomousEvent.actor, "AUTONOMOUS")
  if (result.status === "QUALIFIED") {
    assert.deepStrictEqual(Object.keys(result.qualification), [
      "opportunityId",
      "subjectId",
      "contextId",
      "qualifiedAtTick",
      "evidence",
      "artifactReference",
      "persistenceIntent",
    ])
  }
})
