// WORLDK-M13: durable session-RLS continuity read path.
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { getVisitorWorldProjection } from "./service.ts"
import { ContinuityReadUnavailableError, SessionRlsContinuityReader, type SessionContinuityClient } from "./sessionContinuity.ts"
import { depsFor, fixtureRun, OTHER_SUBJECT, SUBJECT } from "./testing/scenarios.ts"
import { runLivingForestFixtureTimeline } from "./facts.ts"
import { factSourceOf } from "./testing/scenarios.ts"

const here = path.dirname(fileURLToPath(import.meta.url))

/** Durable row as Postgres returns it after the 039 harness: arrival tick 0, leave tick 1. */
const durableRow = (subjectId = SUBJECT) => ({
  world_id: "living-forest",
  subject_id: subjectId,
  visit_count: 1,
  first_entered_at: "2026-09-25T10:00:00.000Z",
  last_entered_at: "2026-09-25T10:00:00.000Z",
  last_entered_tick: 0,
  last_left_at: "2026-09-25T10:01:00.000Z",
  visit_open: false,
  last_seen_at: "2026-09-25T10:01:00.000Z",
  last_seen_tick: 1,
  last_seen_basis: "LEAVE_RECORDED",
  last_place_id: "forest-clearing",
  encountered_place_ids: ["forest-clearing"],
})

function fakeClient(result: { data: unknown; error: { message: string; code?: string } | null }, seen: string[][] = []): SessionContinuityClient {
  return {
    from: (table) => ({
      select: (cols) => ({
        eq: (c1, v1) => ({
          eq: (c2, v2) => ({
            maybeSingle: async () => {
              seen.push([table, cols, `${c1}=${v1}`, `${c2}=${v2}`])
              return result
            },
          }),
        }),
      }),
    }),
  }
}

test("reads the verified visitor's own durable row by (world, subject)", async () => {
  const seen: string[][] = []
  const reader = new SessionRlsContinuityReader(async () => fakeClient({ data: durableRow(), error: null }, seen))
  const r = await reader.get("living-forest", SUBJECT)
  assert.equal(r!.visitCount, 1)
  assert.equal(r!.lastSeenTick, 1)
  assert.equal(r!.lastSeenBasis, "LEAVE_RECORDED")
  assert.deepEqual(seen[0]!.slice(0, 1).concat(seen[0]!.slice(2)), ["world_visitor_continuity", "world_id=living-forest", `subject_id=${SUBJECT}`])
  assert.ok(!seen[0]![1]!.includes("open_visit_id"), "lifecycle authority internals are not read into the consumer path")
})

test("no row -> null (first visit); read error -> unavailable (never a fallback)", async () => {
  assert.equal(await new SessionRlsContinuityReader(async () => fakeClient({ data: null, error: null })).get("living-forest", SUBJECT), null)
  await assert.rejects(new SessionRlsContinuityReader(async () => fakeClient({ data: null, error: { message: "permission denied", code: "42501" } })).get("living-forest", SUBJECT), ContinuityReadUnavailableError)
  await assert.rejects(new SessionRlsContinuityReader(async () => { throw new Error("no supabase env") }).get("living-forest", SUBJECT), ContinuityReadUnavailableError)
})

test("a row for any other subject or world is refused even if the store returned it", async () => {
  await assert.rejects(new SessionRlsContinuityReader(async () => fakeClient({ data: durableRow(OTHER_SUBJECT), error: null })).get("living-forest", SUBJECT), ContinuityReadUnavailableError)
  await assert.rejects(new SessionRlsContinuityReader(async () => fakeClient({ data: { ...durableRow(), world_id: "another-world" }, error: null })).get("living-forest", SUBJECT), ContinuityReadUnavailableError)
})

test("the reader is read-only: no write path exists through it", async () => {
  const reader = new SessionRlsContinuityReader(async () => fakeClient({ data: null, error: null }))
  const e = { worldId: "living-forest", subjectId: SUBJECT, at: new Date().toISOString(), worldTick: 0, placeId: null }
  await assert.rejects(reader.recordConfirmedEntry(e), /read-only/)
  await assert.rejects(reader.recordLeave(e), /read-only/)
})

test("service: unreadable durable continuity -> PROJECTION_UNAVAILABLE / SOURCE_OFFLINE, not NO_PRIOR_VISIT", async () => {
  const deps = { ...(await depsFor()), ledger: new SessionRlsContinuityReader(async () => fakeClient({ data: null, error: { message: "boom" } })) }
  const v = await getVisitorWorldProjection("living-forest", { subjectId: SUBJECT }, deps)
  assert.equal(v.status, "PROJECTION_UNAVAILABLE")
  assert.equal(v.freshness.reason, "SOURCE_OFFLINE")
  assert.equal(v.projection, null)
})

test("durable continuity + current world history -> RETURNING + Since You Were Here (ticks 2-6), derived not stored", async () => {
  // A FRESH process observes the world after the recorded leave.
  const facts = (await runLivingForestFixtureTimeline("2026-09-25T10:30:00.000Z")).facts
  const deps = { ...(await depsFor({ facts, now: new Date("2026-09-25T10:30:10.000Z") })), facts: factSourceOf(facts), ledger: new SessionRlsContinuityReader(async () => fakeClient({ data: durableRow(), error: null })) }
  const v = await getVisitorWorldProjection("living-forest", { subjectId: SUBJECT }, deps)
  assert.equal(v.status, "OK")
  const body = v.projection!
  assert.equal(body.relationship.state, "VISITED")
  assert.equal(body.relationship.visitCount, 1)
  assert.equal(body.relationship.lastSeen!.basis, "LEAVE_RECORDED")
  assert.equal(body.relationship.lastSeen!.worldTick, 1)
  assert.equal(body.returnContext.arrivalKind, "RETURNING")
  assert.equal(body.sinceYouWereHere.state, "CHANGES")
  assert.deepEqual(body.sinceYouWereHere.interval, { since: { at: "2026-09-25T10:01:00.000Z", worldTick: 1 }, through: { at: "2026-09-25T10:30:00.000Z", worldTick: 6 } })
  assert.ok(body.sinceYouWereHere.changes.length > 0)
  const publicIds = new Set((await fixtureRun()).facts.worldEvents.filter((e) => e.tick > 1 && e.tick <= 6).map((e) => e.tick))
  assert.ok(publicIds.size > 0, "fixture world history has changes after the leave")
})

test("deployed deps: durable session reader only — no in-memory ledger, no DB URL, no pg, no writer", () => {
  const src = readFileSync(path.join(here, "runtimeDeps.ts"), "utf8").replace(/^\s*\/\/.*$/gm, "")
  assert.ok(src.includes("SessionRlsContinuityReader"))
  assert.ok(!/InMemoryContinuityLedger|PostgresContinuityLedger|WORLD_CONSUMER_LEDGER_DATABASE_URL|from "pg"|SERVICE_ROLE|createAdminClient|lifecycle/i.test(src))
})
