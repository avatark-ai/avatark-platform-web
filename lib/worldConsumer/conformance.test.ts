import { test } from "node:test"
import assert from "node:assert/strict"
import { forbiddenFieldsIn } from "@avatark/world-consumer-contracts"
import type { PublicWorldProjection, VisitorWorldProjection } from "@avatark/world-consumer-contracts"
import { getPublicWorldProjection, getVisitorWorldProjection } from "./service.ts"
import { createContractValidator, SCHEMA } from "./testing/schemaValidator.ts"
import { AFTER_WINDOW, depsFor, fixtureRun, recordArrivalThenLeave, SUBJECT } from "./testing/scenarios.ts"

const validator = createContractValidator()
const assertValid = (schema: string, payload: unknown) => {
  const r = validator.validate(schema, payload)
  assert.ok(r.ok, r.errors)
}

async function current(): Promise<PublicWorldProjection> {
  return getPublicWorldProjection("living-forest", await depsFor())
}

test("A. public CURRENT projection is produced from real runtime facts and validates against the frozen M07 schema", async () => {
  const p = await current()
  assertValid(SCHEMA.public, p)
  assert.equal(p.status, "OK")
  assert.equal(p.freshness.state, "CURRENT")
  assert.equal(p.worldId, "living-forest")
  const body = p.projection!
  assert.equal(body.world.lifecycle, "PREVIEW", "fixture-backed facts are never presented as an OPEN production world")
  assert.match(p.freshness.source.sourceRevision!, /^fixture:/, "fixture-backed output is classified in the payload")
  assert.equal(body.now.season?.id, "drought", "World Now reflects the runtime's own season transition")
  assert.equal(p.freshness.source.worldTick, (await fixtureRun()).facts.sharedState.clock.tick)
  assert.ok(!/\btick\b/i.test(body.now.worldTime.label), "world time label never exposes simulation ticks as copy")
})

test("B. public projection read after its freshness window is declared STALE by the producer", async () => {
  const p = await getPublicWorldProjection("living-forest", await depsFor({ now: AFTER_WINDOW }))
  assertValid(SCHEMA.public, p)
  assert.equal(p.freshness.state, "STALE")
  assert.equal(p.freshness.reason, "SOURCE_LAGGING")
})

test("C. public projection is UNAVAILABLE (no body) when the source is offline or absent", async () => {
  const { facts } = await fixtureRun()
  for (const deps of [await depsFor({ facts: { ...facts, sourceStatus: "OFFLINE" } }), await depsFor({ facts: null })]) {
    const p = await getPublicWorldProjection("living-forest", deps)
    assertValid(SCHEMA.public, p)
    assert.equal(p.status, "PROJECTION_UNAVAILABLE")
    assert.equal(p.projection, null)
    assert.equal(p.freshness.state, "UNAVAILABLE")
  }
})

test("D. public projection contains zero visitor identity, even with a visitor's continuity recorded", async () => {
  const deps = await depsFor()
  await recordArrivalThenLeave(deps.ledger)
  const p = await getPublicWorldProjection("living-forest", deps)
  const json = JSON.stringify(p)
  assert.ok(!json.includes(SUBJECT))
  for (const k of ["subjectId", "userId", "visitorContext", "relationship", "sinceYouWereHere", "returnContext", "visitorRelevance", "lastSeen"]) {
    assert.ok(!json.includes(`"${k}"`), k)
  }
})

test("E. public places + history: runtime locations become projection places; history is the aggregate World Memory read", async () => {
  const p = await current()
  const body = p.projection!
  const { facts } = await fixtureRun()
  assert.deepEqual(body.places.map((pl) => pl.placeId), ["forest-clearing", "forest-stream", "forest-pond"])
  assert.equal(body.history.state, "AVAILABLE")
  assert.equal(body.history.entries.length, facts.worldEvents.length, "one public entry per stored significant event — no invented history")
  const season = body.history.entries.find((e) => e.kind === "SEASON")!
  assert.equal(season.significance, "LANDMARK")
  assert.deepEqual(season.placeIds, [], "world-scale occurrence")
  const clearing = body.places.find((pl) => pl.placeId === "forest-clearing")!
  assert.equal(clearing.history.state, "AVAILABLE")
  assert.ok(clearing.recentChange && body.history.entries.some((e) => e.occurrenceId === clearing.recentChange!.occurrenceId))
  assert.equal(body.places.find((pl) => pl.placeId === "forest-pond")!.history.state, "EMPTY")
  assert.ok(body.history.entries.every((e) => /^occ-[0-9a-f]{20}$/.test(e.occurrenceId)), "occurrence ids are minted, not raw runtime event ids")
  const eventIds = facts.worldEvents.map((e) => e.id)
  assert.ok(!eventIds.some((id) => JSON.stringify(p).includes(id)), "raw WorldEvent ids never leak")
  assert.deepEqual(body.stories.map((s) => s.storySlug), ["the-forest-remembers"])
})

test("F. history EMPTY when World Memory holds no significant events (real runtime state, no events)", async () => {
  const { facts } = await fixtureRun()
  const p = await getPublicWorldProjection("living-forest", await depsFor({ facts: { ...facts, worldEvents: [] } }))
  assertValid(SCHEMA.public, p)
  assert.equal(p.projection!.history.state, "EMPTY")
  assert.equal(p.projection!.history.entries.length, 0)
  assert.equal(p.projection!.history.hasMore, false)
  assert.ok(p.projection!.places.every((pl) => pl.recentChange === null && pl.history.state === "EMPTY"))
})

test("M. worldId alias: the runtime fixture id cannot be requested or escape as production identity", async () => {
  const deps = await depsFor()
  const byAlias = await getPublicWorldProjection("living-forest-fixture", deps)
  assertValid(SCHEMA.public, byAlias)
  assert.equal(byAlias.status, "WORLD_NOT_FOUND")
  const p = await current()
  assert.ok(!JSON.stringify(p).includes("living-forest-fixture"))
  const production = await getPublicWorldProjection("living-forest", await depsFor({ mode: "PRODUCTION" }))
  assertValid(SCHEMA.public, production)
  assert.equal(production.status, "PROJECTION_UNAVAILABLE", "FIXTURE bindings are never served in PRODUCTION mode")
  assert.equal(production.freshness.reason, "NOT_YET_PUBLISHED")
})

async function returningVisitor(): Promise<{ p: PublicWorldProjection; v: VisitorWorldProjection }> {
  const run = await fixtureRun()
  const deps = await depsFor({ encounteredEntityIds: run.arrivalCompanionEntityIds })
  await recordArrivalThenLeave(deps.ledger)
  return { p: await getPublicWorldProjection("living-forest", deps), v: await getVisitorWorldProjection("living-forest", { subjectId: SUBJECT }, deps) }
}

test("S. every selected Since-You-Were-Here change references public occurrence ids", async () => {
  const { p, v } = await returningVisitor()
  const publicIds = new Set(p.projection!.history.entries.map((e) => e.occurrenceId))
  const changes = v.projection!.sinceYouWereHere.changes
  assert.ok(changes.length > 0)
  for (const c of changes) {
    assert.ok(c.linkedOccurrenceIds.length > 0)
    for (const id of c.linkedOccurrenceIds) assert.ok(publicIds.has(id), `${id} must be a public occurrence`)
  }
})

test("T. every visitor placeId resolves against the public places", async () => {
  const { p, v } = await returningVisitor()
  const places = new Set(p.projection!.places.map((pl) => pl.placeId))
  const body = v.projection!
  const ids = [...body.relationship.encounteredPlaceIds, ...(body.returnContext.lastPlaceId ? [body.returnContext.lastPlaceId] : []), ...body.sinceYouWereHere.changes.flatMap((c) => c.placeIds)]
  assert.ok(ids.length > 0)
  for (const id of ids) assert.ok(places.has(id), id)
})

test("U. consumer payloads leak no runtime, kernel, infrastructure or credential fields", async () => {
  const { p, v } = await returningVisitor()
  assert.deepEqual(forbiddenFieldsIn(p), [])
  assert.deepEqual(forbiddenFieldsIn(v), [])
  const json = JSON.stringify([p, v])
  for (const s of ["WorldSnapshot", "WorldLease", "simulationTick", "visitorContext", "deer-1", "deer-herd-1", "patch-forest", "living-forest-fixture", "service_role", "eyJ"]) {
    assert.ok(!json.includes(s), `must not contain ${s}`)
  }
})

test("V. every producer output state validates against the frozen M07 schemas", async () => {
  const run = await fixtureRun()
  const outputs: [string, unknown][] = []
  outputs.push([SCHEMA.public, await current()])
  outputs.push([SCHEMA.public, await getPublicWorldProjection("unknown-world", await depsFor())])
  const { v } = await returningVisitor()
  outputs.push([SCHEMA.visitor, v])
  outputs.push([SCHEMA.visitor, await getVisitorWorldProjection("living-forest", null, await depsFor())])
  outputs.push([SCHEMA.visitor, await getVisitorWorldProjection("living-forest", { subjectId: SUBJECT }, await depsFor())])
  outputs.push([SCHEMA.visitor, await getVisitorWorldProjection("unknown-world", { subjectId: SUBJECT }, await depsFor())])
  outputs.push([SCHEMA.visitor, await getVisitorWorldProjection("living-forest", { subjectId: SUBJECT }, await depsFor({ mode: "PRODUCTION" }))])
  outputs.push([SCHEMA.visitor, await getVisitorWorldProjection("living-forest", { subjectId: SUBJECT }, await depsFor({ facts: { ...run.facts, sourceStatus: "OFFLINE" } }))])
  for (const [schema, payload] of outputs) assertValid(schema, payload)
})
