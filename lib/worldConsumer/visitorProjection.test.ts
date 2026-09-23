import { test } from "node:test"
import assert from "node:assert/strict"
import { computeReturnRecognition } from "@avatark/world-memory-runtime"
import { getPublicWorldProjection, getVisitorWorldProjection } from "./service.ts"
import { classifyContinuity, SINCE_YOU_WERE_HERE_POLICY } from "./visitorProjection.ts"
import { createContractValidator, SCHEMA } from "./testing/schemaValidator.ts"
import { depsFor, fixtureRun, recordArrivalThenLeave, SUBJECT } from "./testing/scenarios.ts"

const validator = createContractValidator()
const valid = (p: unknown) => {
  const r = validator.validate(SCHEMA.visitor, p)
  assert.ok(r.ok, r.errors)
}
const visitor = { subjectId: SUBJECT }

test("G. first-time visitor: no ledger row -> NO_PRIOR_VISIT / FIRST_VISIT / NOT_APPLICABLE_FIRST_VISIT", async () => {
  const v = await getVisitorWorldProjection("living-forest", visitor, await depsFor())
  valid(v)
  assert.equal(v.status, "OK")
  assert.equal(v.subjectId, SUBJECT)
  assert.equal(v.projection!.relationship.state, "NO_PRIOR_VISIT")
  assert.equal(v.projection!.returnContext.arrivalKind, "FIRST_VISIT")
  assert.equal(v.projection!.returnContext.continuity, "NOT_APPLICABLE")
  assert.equal(v.projection!.sinceYouWereHere.state, "NOT_APPLICABLE_FIRST_VISIT")
})

test("H. returning visitor whose last presence is the current world tick -> NO_MEANINGFUL_CHANGES (never blank)", async () => {
  const { facts } = await fixtureRun()
  const deps = await depsFor()
  const tick = facts.sharedState.clock.tick
  await deps.ledger.recordConfirmedEntry({ worldId: "living-forest", subjectId: SUBJECT, at: "2026-09-23T16:50:00.000Z", worldTick: tick, placeId: "forest-stream" })
  await deps.ledger.recordLeave({ worldId: "living-forest", subjectId: SUBJECT, at: "2026-09-23T16:55:00.000Z", worldTick: tick, placeId: "forest-stream" })
  const v = await getVisitorWorldProjection("living-forest", visitor, deps)
  valid(v)
  const s = v.projection!.sinceYouWereHere
  assert.equal(v.projection!.returnContext.continuity, "RECOGNIZED")
  assert.equal(s.state, "NO_MEANINGFUL_CHANGES")
  assert.deepEqual(s.interval, { since: { at: "2026-09-23T16:55:00.000Z", worldTick: tick }, through: { at: facts.observedAt, worldTick: tick } })
  assert.equal(s.omittedChangeCount, 0)
})

test("I. returning visitor with meaningful changes: derived from durable lastSeen + ReturnRecognition, world significance != visitor relevance", async () => {
  const run = await fixtureRun()
  const deps = await depsFor({ encounteredEntityIds: run.arrivalCompanionEntityIds })
  const leave = await recordArrivalThenLeave(deps.ledger)
  const v = await getVisitorWorldProjection("living-forest", visitor, deps)
  valid(v)
  const s = v.projection!.sinceYouWereHere
  assert.equal(s.state, "CHANGES")
  assert.equal(s.interval!.since.worldTick, leave.lastSeenTick, "interval starts at the ledger's lastSeen, not a caller-supplied tick")
  assert.deepEqual(s.selectionPolicy, { policyId: SINCE_YOU_WERE_HERE_POLICY.policyId, version: SINCE_YOU_WERE_HERE_POLICY.version })

  // Same fact types the existing ReturnRecognition algorithm reports for the interval.
  const recognition = computeReturnRecognition(run.facts.runtimeWorldId, SUBJECT, leave.lastSeenTick, run.facts.sharedState.clock.tick, run.facts.worldEvents.filter((e) => e.tick > leave.lastSeenTick))
  assert.deepEqual(new Set(s.changes.map((c) => c.kind)), new Set(recognition.facts.map((f) => ({ season_changed: "SEASON_CHANGED", population_relocated: "POPULATION_MOVED" } as Record<string, string>)[f.type])))

  const season = s.changes.find((c) => c.kind === "SEASON_CHANGED")!
  const moved = s.changes.find((c) => c.kind === "POPULATION_MOVED")!
  assert.equal(season.worldSignificance, "LANDMARK")
  assert.equal(season.visitorRelevance, "WORLD_WIDE")
  assert.equal(moved.worldSignificance, "MEANINGFUL")
  assert.equal(moved.visitorRelevance, "DIRECT", "the herd the visitor met moved")
  assert.equal(s.changes[0]!.visitorRelevance, "DIRECT", "deterministic ordering: relevance first")
  assert.equal(s.summary, "The season turned to Drought while you were away.")
  // The tick-1 movement happened while the visitor was still present: not a change "since you were here".
  const pub = await getPublicWorldProjection("living-forest", deps)
  const tick1 = pub.projection!.history.entries.find((e) => e.worldTime.worldTick === 1)!
  assert.ok(!s.changes.some((c) => c.linkedOccurrenceIds.includes(tick1.occurrenceId)))
})

test("I'. omittedChangeCount stays honest when a public change is not selected", async () => {
  const deps = await depsFor({ encounteredEntityIds: [] })
  await deps.ledger.recordConfirmedEntry({ worldId: "living-forest", subjectId: SUBJECT, at: "2026-09-23T16:00:00.000Z", worldTick: 0, placeId: null })
  await deps.ledger.recordLeave({ worldId: "living-forest", subjectId: SUBJECT, at: "2026-09-23T16:05:00.000Z", worldTick: 1, placeId: null })
  const v = await getVisitorWorldProjection("living-forest", visitor, deps)
  valid(v)
  const s = v.projection!.sinceYouWereHere
  assert.deepEqual(s.changes.map((c) => c.kind), ["SEASON_CHANGED"], "only the world-wide change is relevant to a visitor with no encounters")
  assert.equal(s.omittedChangeCount, 1, "the herd's move to an unvisited place is counted, not hidden")
})

test("I''. a world with public changes never reads as 'nothing changed' even when none is personally relevant", async () => {
  const { facts } = await fixtureRun()
  const onlyLocal = { ...facts, worldEvents: facts.worldEvents.filter((e) => e.category === "POPULATION_MOVEMENT") }
  const deps = await depsFor({ facts: onlyLocal })
  await deps.ledger.recordConfirmedEntry({ worldId: "living-forest", subjectId: SUBJECT, at: "2026-09-23T16:00:00.000Z", worldTick: 0, placeId: null })
  await deps.ledger.recordLeave({ worldId: "living-forest", subjectId: SUBJECT, at: "2026-09-23T16:05:00.000Z", worldTick: 1, placeId: null })
  const v = await getVisitorWorldProjection("living-forest", visitor, deps)
  valid(v)
  assert.equal(v.projection!.sinceYouWereHere.state, "CHANGES")
  assert.equal(v.projection!.sinceYouWereHere.changes.length, 1)
})

test("J. claimed return without a continuity record -> VISITED / RETURNING / NO_CONTINUITY_RECORD / SYWH UNAVAILABLE (not 'nothing changed')", async () => {
  const deps = await depsFor({ evidence: { visitCount: 2, firstEnteredAt: "2026-09-20T10:00:00.000Z", lastEnteredAt: "2026-09-22T10:00:00.000Z", lastLeftAt: null, lastPlaceId: "forest-pond" } })
  const v = await getVisitorWorldProjection("living-forest", visitor, deps)
  valid(v)
  const body = v.projection!
  assert.equal(body.relationship.state, "VISITED")
  assert.equal(body.relationship.lastSeen, null, "no durable continuity -> lastSeen is never fabricated")
  assert.equal(body.returnContext.arrivalKind, "RETURNING")
  assert.equal(body.returnContext.continuity, "NO_CONTINUITY_RECORD")
  assert.equal(body.sinceYouWereHere.state, "UNAVAILABLE")
  assert.equal(body.sinceYouWereHere.unavailableReason, "NO_CONTINUITY_RECORD")
  assert.notEqual(body.sinceYouWereHere.state, "NO_MEANINGFUL_CHANGES")
})

test("R07 meanings preserved: first_entry / return_recognized / return_claimed_without_continuity_record stay distinct", () => {
  const record = { lastSeenTick: 1 } as never
  const evidence = { visitCount: 1, firstEnteredAt: "x", lastEnteredAt: "x", lastLeftAt: null, lastPlaceId: null }
  assert.equal(classifyContinuity(null, null), "first_entry")
  assert.equal(classifyContinuity(record, null), "return_recognized")
  assert.equal(classifyContinuity(record, evidence), "return_recognized", "durable continuity outranks other evidence")
  assert.equal(classifyContinuity(null, evidence), "return_claimed_without_continuity_record")
})

test("the visitor projection is private and derived only from the verified subject", async () => {
  const deps = await depsFor()
  await recordArrivalThenLeave(deps.ledger)
  const other = await getVisitorWorldProjection("living-forest", { subjectId: "5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d" }, deps)
  valid(other)
  assert.equal(other.cacheScope, "PRIVATE")
  assert.equal(other.projection!.relationship.state, "NO_PRIOR_VISIT", "one visitor's continuity never appears in another's projection")
})
