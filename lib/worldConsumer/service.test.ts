import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  confirmWorldArrival,
  getVisitorWorldProjection,
  handlePublicProjectionRequest,
  handleVisitorProjectionRequest,
  priorVisitEvidenceFromWorldState,
  recordWorldDeparture,
  type VerifiedVisitor,
} from "./service.ts"
import { createContractValidator, SCHEMA } from "./testing/schemaValidator.ts"
import { BINDING, depsFor, OTHER_SUBJECT, recordArrivalThenLeave, SUBJECT } from "./testing/scenarios.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const validator = createContractValidator()
const BASE = "https://platform.example/api/worlds"
const noSession = async () => null
const sessionOf = (subjectId: string) => async (): Promise<VerifiedVisitor> => ({ subjectId })

test("public API: no auth, contract JSON, cache bounded by producer freshness, no identity read", async () => {
  const deps = await depsFor()
  const res = await handlePublicProjectionRequest(new Request(`${BASE}/living-forest/public-projection?subjectId=${SUBJECT}`, { headers: { cookie: "sb-access-token=x" } }), "living-forest", deps)
  assert.equal(res.status, 200)
  assert.match(res.headers.get("cache-control")!, /^public, max-age=0, s-maxage=\d+$/)
  const body = await res.json()
  assert.ok(validator.validate(SCHEMA.public, body).ok)
  assert.ok(!JSON.stringify(body).includes(SUBJECT), "query-string identity is never echoed into a public payload")
})

test("K. unauthenticated visitor request -> 401 UNAUTHENTICATED, private/no-store, no subject", async () => {
  const deps = await depsFor()
  const res = await handleVisitorProjectionRequest(new Request(`${BASE}/living-forest/visitor-projection`), "living-forest", noSession, deps)
  assert.equal(res.status, 401)
  assert.equal(res.headers.get("cache-control"), "private, no-store")
  assert.match(res.headers.get("vary")!, /Cookie/)
  const body = await res.json()
  assert.ok(validator.validate(SCHEMA.visitor, body).ok)
  assert.equal(body.status, "UNAUTHENTICATED")
  assert.equal(body.subjectId, null)
  assert.equal(body.projection, null)
})

test("K'. identity hints are ignored: subjectId in query/body, avatarKId, anon never become identity", async () => {
  const deps = await depsFor()
  await recordArrivalThenLeave(deps.ledger) // SUBJECT has continuity
  const url = `${BASE}/living-forest/visitor-projection?subjectId=${SUBJECT}&avatarKId=${SUBJECT}&anon=1`
  const anon = await handleVisitorProjectionRequest(new Request(url, { method: "GET" }), "living-forest", noSession, deps)
  assert.equal((await anon.json()).status, "UNAUTHENTICATED", "no session -> unauthenticated, whatever the query says")
  const asOther = await handleVisitorProjectionRequest(new Request(url), "living-forest", sessionOf(OTHER_SUBJECT), deps)
  const body = await asOther.json()
  assert.equal(body.subjectId, OTHER_SUBJECT, "the verified session wins over any hint")
  assert.equal(body.projection.relationship.state, "NO_PRIOR_VISIT", "the hinted subject's continuity is not disclosed")
  const src = readFileSync(path.join(here, "service.ts"), "utf8")
  const handler = src.slice(src.indexOf("export async function handleVisitorProjectionRequest"))
  assert.ok(!/searchParams|\.json\(\)|\.text\(\)|formData|avatarKId/.test(handler), "handler never reads query/body")
})

test("L. wrong/unknown world -> 404 WORLD_NOT_FOUND on both APIs", async () => {
  const deps = await depsFor()
  const pub = await handlePublicProjectionRequest(new Request(`${BASE}/nowhere/public-projection`), "nowhere", deps)
  assert.equal(pub.status, 404)
  assert.equal((await pub.json()).status, "WORLD_NOT_FOUND")
  const vis = await handleVisitorProjectionRequest(new Request(`${BASE}/nowhere/visitor-projection`), "nowhere", sessionOf(SUBJECT), deps)
  assert.equal(vis.status, 404)
  const body = await vis.json()
  assert.ok(validator.validate(SCHEMA.visitor, body).ok)
  assert.equal(body.status, "WORLD_NOT_FOUND")
})

test("production mode: fixture-backed Living Forest is honestly unpublished (503, NOT_YET_PUBLISHED)", async () => {
  const deps = await depsFor({ mode: "PRODUCTION" })
  const pub = await handlePublicProjectionRequest(new Request(`${BASE}/living-forest/public-projection`), "living-forest", deps)
  assert.equal(pub.status, 503)
  const body = await pub.json()
  assert.equal(body.freshness.reason, "NOT_YET_PUBLISHED")
  const vis = await handleVisitorProjectionRequest(new Request(`${BASE}/living-forest/visitor-projection`), "living-forest", sessionOf(SUBJECT), deps)
  assert.equal(vis.status, 503)
})

test("N. WorldK browsing (public + visitor reads, repeated) never moves lastSeen", async () => {
  const deps = await depsFor()
  const before = await recordArrivalThenLeave(deps.ledger)
  for (let i = 0; i < 3; i++) {
    await handlePublicProjectionRequest(new Request(`${BASE}/living-forest/public-projection`), "living-forest", deps)
    await handleVisitorProjectionRequest(new Request(`${BASE}/living-forest/visitor-projection`), "living-forest", sessionOf(SUBJECT), deps)
  }
  // Viewing Since You Were Here is the visitor projection itself.
  await getVisitorWorldProjection("living-forest", { subjectId: SUBJECT }, deps)
  assert.deepEqual(await deps.ledger.get("living-forest", SUBJECT), before)
})

test("O. entry intent submission never moves lastSeen: no consumer route accepts it and no HTTP path writes the ledger", async () => {
  const deps = await depsFor()
  const before = await recordArrivalThenLeave(deps.ledger)
  const intent = { schemaVersion: "1.0", contract: "world-entry-intent", intentId: "11111111-2222-4333-8444-555555555555", worldId: "living-forest", requestedPlaceId: null, narrativeContext: null, client: { surface: "WEB", capabilities: { webgl2: true, touchPrimary: false, viewportClass: "EXPANDED", reducedMotion: false } } }
  await handleVisitorProjectionRequest(new Request(`${BASE}/living-forest/visitor-projection`, { method: "POST", body: JSON.stringify(intent) }), "living-forest", sessionOf(SUBJECT), deps)
  assert.deepEqual(await deps.ledger.get("living-forest", SUBJECT), before)
  // Only GET handlers exist on the consumer routes; ledger writes are unreachable from app/api.
  for (const route of ["public-projection", "visitor-projection"]) {
    const src = readFileSync(path.join(here, `../../app/api/worlds/[worldId]/${route}/route.ts`), "utf8")
    assert.deepEqual([...src.matchAll(/export async function (\w+)/g)].map((m) => m[1]), ["GET"])
    assert.ok(!/confirmWorldArrival|recordWorldDeparture|recordConfirmedEntry|recordLeave/.test(src))
  }
})

test("P/Q via the runtime-host entry points: runtime LocationIds are mapped to projection placeIds", async () => {
  const deps = await depsFor()
  const entered = await confirmWorldArrival({ consumerWorldId: "living-forest", subjectId: SUBJECT, at: "2026-09-23T16:00:00.000Z", worldTick: 0, runtimeLocationId: "forest-clearing" }, deps)
  assert.equal(entered.lastSeenBasis, "ENTRY_CONFIRMED")
  assert.deepEqual(entered.encounteredPlaceIds, ["forest-clearing"])
  const left = await recordWorldDeparture({ consumerWorldId: "living-forest", subjectId: SUBJECT, at: "2026-09-23T16:05:00.000Z", worldTick: 1, runtimeLocationId: "not-a-public-location" }, deps)
  assert.equal(left.lastSeenBasis, "LEAVE_RECORDED")
  assert.equal(left.lastPlaceId, "forest-clearing", "an unbound runtime location is never stored as a placeId")
  await assert.rejects(confirmWorldArrival({ consumerWorldId: "living-forest-fixture", subjectId: SUBJECT, at: "x", worldTick: 2, runtimeLocationId: null }, deps), "runtime alias is not a consumer world")
})

test("prior-visit evidence adapter reads living-world-runtime WorldState without exposing runtime ids", () => {
  assert.equal(priorVisitEvidenceFromWorldState(null, BINDING), null)
  const ev = priorVisitEvidenceFromWorldState(
    { recentVisits: [{ locationId: "forest-pond", enteredAt: "2026-09-22T10:00:00.000Z" }, { locationId: "forest-clearing", enteredAt: "2026-09-20T10:00:00.000Z", leftAt: "2026-09-20T11:00:00.000Z" }] } as never,
    BINDING,
  )
  assert.deepEqual(ev, { visitCount: 2, firstEnteredAt: "2026-09-20T10:00:00.000Z", lastEnteredAt: "2026-09-22T10:00:00.000Z", lastLeftAt: null, lastPlaceId: "forest-pond" })
})
