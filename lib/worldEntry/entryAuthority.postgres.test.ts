// WORLDK-M14-A certification suite against real Postgres.
//
// A Supabase-shaped throwaway database with 037 + 038 (continuity revokes)
// + 039 + 040 applied as the non-superuser owner. The Platform entry
// authority runs through its real credential (worldk_platform_entry_preview
// -> SET ROLE worldk_platform_entry_authority); the reference runtime talks
// only to the Runtime Ingress handler; the browser only to the gateway.
// Time is simulated by ageing DB-recorded timestamps as the superuser.
//
// Requires WORLD_CONSUMER_TEST_DATABASE_URL: a superuser URL for a
// DISPOSABLE local server. Skipped — visibly — when unset.
import { after, before, describe, test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"
import type { WorldEntryResult } from "@avatark/world-consumer-contracts"
import { forbiddenFieldsIn } from "@avatark/world-consumer-contracts"
import { createLivingForestFixtureFactSource } from "../worldConsumer/facts.ts"
import type { ContinuityRecord, VisitorContinuityLedger } from "../worldConsumer/continuityLedger.ts"
import { MACHINE_KEY_HEADER } from "../worldConsumer/machineIngress.ts"
import { createContractValidator, SCHEMA } from "../worldConsumer/testing/schemaValidator.ts"
import { assertLocalUrl, createSupabaseShapedDb, urlFor } from "../worldConsumer/testing/supabaseShapedDb.ts"
import { EntryAuthorityError, PgEntryAuthorityDb } from "./authorityDb.ts"
import { newRuntimeCredential, sha256 } from "./credentials.ts"
import { handleHandoff, handleLeave, handleSessionView, SESSION_COOKIE } from "./gateway.ts"
import { ReferenceRuntime, type IngressTransport, type RuntimeEvent } from "./referenceRuntime.ts"
import { handleWorldEntryRequest, HANDOFF_PATH_PREFIX, type WorldEntryDeps } from "./resolver.ts"
import { handlePresenceSweep, handleRuntimeIngress, SWEEPER_KEY_HEADER, type RuntimeIngressDeps } from "./runtimeIngress.ts"
import { scramVerifier } from "../../scripts/worldk-m14-runtime-registry.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const url = process.env.WORLD_CONSUMER_TEST_DATABASE_URL
const PLATFORM_PW = "m14-platform-credential-local-only"
const WORLD = "living-forest"
const ORIGIN = "https://platform-preview.avatark.ai"
const validator = createContractValidator()

if (!url) {
  test("040 world entry & runtime authority (skipped: WORLD_CONSUMER_TEST_DATABASE_URL not set)", { skip: true }, () => {})
} else {
  assertLocalUrl(url)
  const dbName = `m14_entry_${Date.now()}`
  let su: pg.Client
  let owner: pg.Client
  let db: PgEntryAuthorityDb
  const facts = createLivingForestFixtureFactSource()

  // ── fixtures ─────────────────────────────────────────────────────
  const subject = async () => {
    const id = randomUUID()
    await su.query("INSERT INTO auth.users (id) VALUES ($1)", [id])
    return id
  }
  const row = async (s: string) => (await su.query("SELECT * FROM world_visitor_continuity WHERE world_id = $1 AND subject_id = $2", [WORLD, s])).rows[0]
  const events = async (s: string) => (await su.query("SELECT * FROM world_visitor_lifecycle_events WHERE subject_id = $1 ORDER BY recorded_at, event_type", [s])).rows
  const ledger: VisitorContinuityLedger = {
    async get(worldId, subjectId): Promise<ContinuityRecord | null> {
      const r = (await su.query("SELECT * FROM world_visitor_continuity WHERE world_id = $1 AND subject_id = $2", [worldId, subjectId])).rows[0]
      return r ? ({ worldId, subjectId, visitCount: r.visit_count, lastPlaceId: r.last_place_id } as ContinuityRecord) : null
    },
    recordConfirmedEntry: () => Promise.reject(new Error("read-only")),
    recordLeave: () => Promise.reject(new Error("read-only")),
  }
  const entryDeps = (): WorldEntryDeps => ({ mode: "FIXTURE_PREVIEW", ledger, db, handoffOrigin: ORIGIN })
  const ingressDeps = (): RuntimeIngressDeps => ({ db, mode: "FIXTURE_PREVIEW", facts })

  interface Runtime { instanceId: string; credentialId: string; bearer: string; rt: ReferenceRuntime; events: RuntimeEvent[]; post: IngressTransport["post"] }
  const register = async (label: string, capacity = 4): Promise<Runtime> => {
    const instanceId = randomUUID()
    const cred = newRuntimeCredential()
    await owner.query("SELECT world_runtime_register_instance($1, $2, $3, $4)", [instanceId, WORLD, label, capacity])
    await owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [cred.credentialId, instanceId, cred.sha256, 3600])
    const post: IngressTransport["post"] = async (op, body) => {
      const res = await handleRuntimeIngress(
        new Request(`${ORIGIN}/api/runtime/v1/${op}`, { method: "POST", headers: { authorization: `Bearer ${cred.bearer}`, "content-type": "application/json" }, body: JSON.stringify(body) }),
        op,
        ingressDeps(),
      )
      return { status: res.status, body: (await res.json()) as Record<string, unknown> }
    }
    const evs: RuntimeEvent[] = []
    const rt = new ReferenceRuntime({ post }, { onEvent: (e) => evs.push(e) })
    return { instanceId, credentialId: cred.credentialId, bearer: cred.bearer, rt, events: evs, post }
  }
  const intent = (over: Record<string, unknown> = {}) => ({
    schemaVersion: "1.0",
    contract: "world-entry-intent",
    intentId: randomUUID(),
    worldId: WORLD,
    requestedPlaceId: null,
    narrativeContext: null,
    client: { surface: "WEB", capabilities: { webgl2: true, touchPrimary: false, viewportClass: "EXPANDED", reducedMotion: false } },
    ...over,
  })
  const enter = async (subjectId: string | null, body: Record<string, unknown> = intent()) => {
    const res = await handleWorldEntryRequest(
      new Request(`${ORIGIN}/api/worlds/${WORLD}/entry`, { method: "POST", body: JSON.stringify(body) }),
      WORLD,
      async () => (subjectId ? { subjectId } : null),
      entryDeps(),
    )
    const text = await res.text()
    return { status: res.status, text, result: JSON.parse(text) as WorldEntryResult, headers: res.headers }
  }
  const ticketOf = (r: WorldEntryResult) => {
    assert.ok(r.handoff, "READY carries a handoff")
    assert.ok(r.handoff.href.startsWith(`${ORIGIN}${HANDOFF_PATH_PREFIX}`))
    return r.handoff.href.slice(`${ORIGIN}${HANDOFF_PATH_PREFIX}`.length)
  }
  const redeem = async (ticket: string) => {
    const res = await handleHandoff(ticket, { db })
    const cookie = res.headers.get("set-cookie")?.match(new RegExp(`${SESSION_COOKIE}=([A-Za-z0-9_-]{43})`))?.[1] ?? null
    return { status: res.status, cookie, res }
  }
  const view = async (cookie: string) => {
    const res = await handleSessionView(new Request(`${ORIGIN}/world-entry/session`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), { db })
    return { status: res.status, html: await res.text() }
  }
  const leave = async (cookie: string) =>
    handleLeave(new Request(`${ORIGIN}/world-entry/session/leave`, { method: "POST", headers: { cookie: `${SESSION_COOKIE}=${cookie}`, origin: ORIGIN, "sec-fetch-site": "same-origin" } }), { db })
  const sessionsOf = async (s: string) => (await su.query("SELECT * FROM world_runtime_sessions WHERE subject_id = $1 ORDER BY redeemed_at", [s])).rows
  const presenceOf = async (s: string) => (await su.query("SELECT * FROM world_visit_presence WHERE subject_id = $1 ORDER BY opened_at", [s])).rows
  const agePresence = async (s: string, seconds: number) =>
    su.query(`UPDATE world_visit_presence SET last_presence_at = now() - make_interval(secs => $2), opened_at = LEAST(opened_at, now() - make_interval(secs => $2)) WHERE subject_id = $1 AND closed_at IS NULL`, [s, seconds])
  const ageArrival = async (s: string, seconds: number) =>
    su.query("UPDATE world_visitor_continuity SET last_entered_at = LEAST(last_entered_at, now() - make_interval(secs => $2 + 10)) WHERE subject_id = $1", [s, seconds])
  /** Full happy path to an open visit; returns the pieces. */
  const openVisit = async (s: string, r: Runtime) => {
    await r.rt.poll()
    const e = await enter(s)
    assert.equal(e.result.outcome, "READY", e.text)
    const red = await redeem(ticketOf(e.result))
    assert.equal(red.status, 303)
    await r.rt.step() // claim + ARRIVAL
    return { entered: e, cookie: red.cookie as string }
  }
  const noVisit = async (s: string) => {
    assert.equal(await row(s), undefined, "no continuity row")
    assert.equal((await events(s)).length, 0, "no lifecycle event")
  }
  const allIdsOf = async (s: string) => {
    const ids = new Set<string>()
    for (const q of [
      "SELECT visit_id::text v, allocation_id::text a, instance_id::text i FROM world_runtime_allocations WHERE subject_id = $1",
      "SELECT session_id::text v, allocation_id::text a, instance_id::text i FROM world_runtime_sessions WHERE subject_id = $1",
    ]) for (const r of (await su.query(q, [s])).rows) for (const v of Object.values(r)) if (v) ids.add(String(v))
    for (const r of (await su.query("SELECT credential_id::text c FROM world_runtime_credentials")).rows) ids.add(r.c)
    return [...ids]
  }

  describe("migration 040 — world entry & runtime lifecycle authority (real Postgres)", () => {
    before(async () => {
      ;({ su, owner } = await createSupabaseShapedDb(url, dbName, { through040: true }))
      // Operator step (out-of-band on Preview): enable the Platform credential
      // with only a SCRAM verifier, exactly as the operator script emits it.
      await owner.query(`ALTER ROLE worldk_platform_entry_preview LOGIN PASSWORD '${scramVerifier(PLATFORM_PW)}'`)
      db = new PgEntryAuthorityDb(urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW), { allowLocal: true, ssl: false })
    })
    after(async () => {
      await db?.end()
      await owner?.end()
      await su?.end()
    })

    test("A. an ENTER intent alone creates no Visit (and needs a verified session)", async () => {
      const s = await subject()
      const anon = await enter(null)
      assert.equal(anon.status, 401)
      assert.equal(anon.result.outcome, "AUTHENTICATION_REQUIRED")
      assert.equal(anon.result.subjectId, null)
      const r = await enter(s) // no runtime has ever polled
      assert.equal(r.result.outcome, "UNAVAILABLE")
      assert.equal(r.result.unavailable?.reason, "RUNTIME_UNAVAILABLE")
      assert.ok(validator.validate(SCHEMA.entry, r.result).ok)
      await noVisit(s)
      // identity is never read from the body
      const forged = await enter(s, { ...intent(), subjectId: randomUUID() })
      assert.equal(forged.status, 400)
    })

    test("B. PENDING creates no Visit", async () => {
      const s = await subject()
      const r = await register("m14-starting")
      r.rt.setReadiness("STARTING")
      await r.rt.poll()
      const e = await enter(s)
      assert.equal(e.result.outcome, "PENDING")
      assert.equal(e.result.pending?.reason, "PREPARING")
      assert.ok(validator.validate(SCHEMA.entry, e.result).ok, validator.validate(SCHEMA.entry, e.result).errors)
      await noVisit(s)
      await owner.query("SELECT world_runtime_revoke_instance($1)", [r.instanceId])
    })

    test("C. UNAVAILABLE (runtime gone / at capacity) creates no Visit", async () => {
      const s = await subject()
      const full = await register("m14-full", 1)
      await full.rt.poll()
      const other = await subject()
      assert.equal((await enter(other)).result.outcome, "READY") // takes the only slot
      const e = await enter(s)
      assert.equal(e.result.outcome, "UNAVAILABLE")
      assert.equal(e.result.unavailable?.reason, "AT_CAPACITY")
      await su.query("UPDATE world_runtime_instances SET last_seen_at = now() - interval '1 hour' WHERE instance_id = $1", [full.instanceId])
      const gone = await enter(s)
      assert.equal(gone.result.unavailable?.reason, "RUNTIME_UNAVAILABLE")
      await noVisit(s)
      await noVisit(other)
      await owner.query("SELECT world_runtime_revoke_instance($1)", [full.instanceId])
    })

    let rtA: Runtime
    let rtB: Runtime

    test("D/E/Q. READY + ticket issuance create no Visit; the result is Contract 03 and carries no runtime identifier", async () => {
      rtA = await register("m14-reference-a", 64)
      rtB = await register("m14-reference-b")
      await rtA.rt.poll()
      const s = await subject()
      const e = await enter(s)
      assert.equal(e.result.outcome, "READY")
      const v = validator.validate(SCHEMA.entry, e.result)
      assert.ok(v.ok, v.errors)
      assert.deepEqual(forbiddenFieldsIn(e.result), [])
      assert.equal(e.result.subjectId, s)
      assert.equal(e.result.arrival?.kind, "FIRST_VISIT")
      assert.equal(e.result.arrival?.placeId, "forest-clearing")
      assert.equal(e.result.handoff?.singleUse, true)
      assert.equal(e.headers.get("cache-control"), "private, no-store")
      for (const id of await allIdsOf(s)) assert.ok(!e.text.includes(id), "no visit/allocation/instance/credential id in the result")
      // the ticket secret is not stored; only its hash
      const secret = ticketOf(e.result)
      const t = (await su.query("SELECT * FROM world_entry_tickets WHERE subject_id = $1", [s])).rows
      assert.equal(t.length, 1)
      assert.ok(Buffer.from(t[0].ticket_sha256).equals(sha256(secret)))
      assert.ok(!JSON.stringify(t).includes(secret))
      const ttl = (new Date(t[0].expires_at).getTime() - new Date(t[0].issued_at).getTime()) / 1000
      assert.equal(ttl, 90, "D8 ticket TTL")
      await noVisit(s)
    })

    test("F. ticket redemption alone (and runtime claim alone) creates no Visit; the gateway exposes no identifiers", async () => {
      const s = await subject()
      await rtA.rt.poll()
      const e = await enter(s)
      const red = await redeem(ticketOf(e.result))
      assert.equal(red.status, 303)
      assert.equal(red.res.headers.get("location"), "/world-entry/session")
      assert.match(red.res.headers.get("set-cookie") ?? "", /; Path=\/; Secure; HttpOnly; SameSite=Lax/)
      assert.ok(red.cookie)
      await noVisit(s)
      const page = await view(red.cookie!)
      assert.match(page.html, /Preparing your way into Living Forest/)
      for (const id of [...(await allIdsOf(s)), s]) assert.ok(!page.html.includes(id), "gateway page shows no ids")
      // claim without joining
      const autoJoinOff = new ReferenceRuntime({ post: rtA.post }, { autoJoin: false })
      await autoJoinOff.step()
      assert.ok((await sessionsOf(s))[0].claimed_at)
      await noVisit(s)
      // replayed ticket
      assert.equal((await redeem(ticketOf(e.result))).status, 410)
    })

    test("G/H/I. verified runtime ARRIVAL opens exactly one Visit; duplicates are idempotent; explicit DEPARTURE closes it", async () => {
      const s = await subject()
      const { cookie } = await openVisit(s, rtA)
      const c = await row(s)
      assert.equal(c.visit_count, 1)
      assert.equal(c.visit_open, true)
      assert.equal(c.last_seen_tick, 6, "tick from the Platform world clock")
      assert.equal(c.last_place_id, "forest-clearing")
      let ev = await events(s)
      assert.equal(ev.length, 1)
      assert.equal(ev[0].event_type, "CONFIRMED_ARRIVAL")
      assert.equal(ev[0].authority_kind, "RUNTIME_CONFIRMED")
      assert.equal(ev[0].recorded_by, "worldk_platform_entry_preview")
      assert.equal(ev[0].provenance.runtimeReceipt, true)
      assert.match((await view(cookie)).html, /You are in Living Forest/)

      // H: duplicate arrival — same receipt id, new receipt id, and the lifecycle event id
      const sess = (await sessionsOf(s))[0].session_id
      const receiptId = randomUUID()
      const dup1 = await rtA.post("arrival", { receiptId, sessionId: sess, worldId: WORLD })
      assert.equal(dup1.body.outcome, "ALREADY_JOINED")
      assert.equal((await rtA.post("arrival", { receiptId, sessionId: sess, worldId: WORLD })).body.outcome, "IDEMPOTENT_REPLAY")
      const conflict = await rtA.post("presence", { receiptId, sessionId: sess, worldId: WORLD })
      assert.equal(conflict.status, 409)
      assert.equal(conflict.body.error, "RECEIPT_CONFLICT")
      assert.equal((await events(s)).length, 1)
      assert.equal((await row(s)).visit_count, 1)

      // I: visitor asks to leave via the gateway -> runtime evidences the departure
      assert.equal((await leave(cookie)).status, 303)
      assert.equal((await events(s)).length, 1, "a leave request is not a departure")
      await rtA.rt.step()
      ev = await events(s)
      assert.equal(ev.length, 2)
      assert.equal(ev[1].event_type, "CONFIRMED_DEPARTURE")
      assert.equal(ev[1].authority_kind, "RUNTIME_CONFIRMED")
      const closed = await row(s)
      assert.equal(closed.visit_open, false)
      assert.equal(closed.last_seen_basis, "LEAVE_RECORDED")
      assert.equal((await presenceOf(s))[0].close_kind, "RUNTIME_DEPARTURE")
      assert.match((await view(cookie)).html, /You have left Living Forest/)
      // departure without an open visit
      const again = await rtA.post("departure", { receiptId: randomUUID(), sessionId: sess, worldId: WORLD })
      assert.equal(again.body.outcome, "ALREADY_CLOSED_RUNTIME_DEPARTURE")
      assert.equal((await events(s)).length, 2)
    })

    test("J. runtime disappearance + grace expiry produces exactly one PRESENCE_TIMEOUT departure at the last presence", async () => {
      const s = await subject()
      await openVisit(s, rtA)
      await agePresence(s, 121)
      await ageArrival(s, 121)
      const lastPresence = (await presenceOf(s))[0].last_presence_at as Date
      // the sweep trigger needs its own key
      const KEY = "k".repeat(43)
      assert.equal((await handlePresenceSweep(new Request(`${ORIGIN}/api/platform/v1/presence-sweep`, { method: "POST" }), { db, configuredKey: KEY })).status, 401)
      const sw = await handlePresenceSweep(new Request(`${ORIGIN}/api/platform/v1/presence-sweep`, { method: "POST", headers: { [SWEEPER_KEY_HEADER]: KEY } }), { db, configuredKey: KEY })
      assert.equal(sw.status, 200)
      assert.equal(((await sw.json()) as { timedOut: number }).timedOut, 1)
      assert.equal(await db.sweep(10), 0, "sweeping again changes nothing")
      const ev = await events(s)
      assert.equal(ev.length, 2)
      assert.equal(ev[1].event_type, "CONFIRMED_DEPARTURE")
      assert.equal(ev[1].authority_kind, "PLATFORM_PRESENCE_TIMEOUT")
      assert.equal(ev[1].provenance.inferred, true)
      assert.equal(new Date(ev[1].occurred_at).getTime(), lastPresence.getTime(), "occurred_at = last authoritative presence, not sweep time")
      const c = await row(s)
      assert.equal(c.visit_open, false)
      assert.equal(c.last_seen_basis, "PRESENCE_TIMEOUT")
      // late evidence cannot revive or double-close the visit
      const sess = (await sessionsOf(s))[0].session_id
      const late = await rtA.post("departure", { receiptId: randomUUID(), sessionId: sess, worldId: WORLD })
      assert.equal(late.body.outcome, "ALREADY_CLOSED_PRESENCE_TIMEOUT")
      const hb = await rtA.post("presence", { receiptId: randomUUID(), sessionId: sess, worldId: WORLD })
      assert.equal(hb.status, 409)
      assert.equal((await events(s)).length, 2)
    })

    test("J'. evidence after the grace window closes the visit at the last presence — sweep timing never matters", async () => {
      const s = await subject()
      await openVisit(s, rtA)
      await agePresence(s, 125)
      await ageArrival(s, 125)
      const lastPresence = (await presenceOf(s))[0].last_presence_at as Date
      const sess = (await sessionsOf(s))[0].session_id
      // no sweep ran; an explicit departure now arrives too late
      const late = await rtA.post("departure", { receiptId: randomUUID(), sessionId: sess, worldId: WORLD })
      assert.equal(late.body.outcome, "VISIT_TIMED_OUT")
      const ev = await events(s)
      assert.equal(ev.length, 2)
      assert.equal(ev[1].authority_kind, "PLATFORM_PRESENCE_TIMEOUT")
      assert.equal(new Date(ev[1].occurred_at).getTime(), lastPresence.getTime())
    })

    test("J''. explicit departure racing PRESENCE_TIMEOUT never yields two terminal outcomes", async () => {
      for (const aged of [false, true]) {
        const s = await subject()
        await openVisit(s, rtA)
        if (aged) {
          await agePresence(s, 130)
          await ageArrival(s, 130)
        }
        const sess = (await sessionsOf(s))[0].session_id
        const db2: PgEntryAuthorityDb = new PgEntryAuthorityDb(urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW), { allowLocal: true, ssl: false })
        const [dep, swept]: [{ status: number; body: Record<string, unknown> }, number] = await Promise.all([
          rtA.post("departure", { receiptId: randomUUID(), sessionId: sess, worldId: WORLD }),
          db2.sweep(50),
        ])
        await db2.end()
        const deps = (await events(s)).filter((e) => e.event_type === "CONFIRMED_DEPARTURE")
        assert.equal(deps.length, 1, `exactly one departure (aged=${aged}, dep=${JSON.stringify(dep.body)}, swept=${swept})`)
        assert.equal(deps[0].authority_kind, aged ? "PLATFORM_PRESENCE_TIMEOUT" : "RUNTIME_CONFIRMED")
      }
    })

    test("K. reconnect inside the grace window keeps the same Visit: new RuntimeSession, no second ARRIVAL", async () => {
      const s = await subject()
      const { cookie } = await openVisit(s, rtA)
      const first = (await sessionsOf(s))[0]
      assert.equal((await rtA.rt.disconnect(first.session_id)), "GRACE_RUNNING")
      assert.equal((await row(s)).visit_open, true, "a disconnect is not a departure")
      assert.equal((await events(s)).length, 1)
      assert.match((await view(cookie)).html, /session .* has ended|has ended/)
      const e = await enter(s)
      assert.equal(e.result.outcome, "READY")
      assert.equal(e.result.arrival?.kind, "FIRST_VISIT", "the reconnect resumes the original arrival")
      const red = await redeem(ticketOf(e.result))
      assert.equal(red.status, 303)
      await rtA.rt.step()
      const sessions = await sessionsOf(s)
      assert.equal(sessions.length, 2)
      assert.equal(sessions[1].visit_id, first.visit_id, "same visit_id")
      assert.equal(sessions[1].reconnect, true)
      assert.ok(sessions[1].joined_at)
      assert.ok(rtA.events.some((x) => x.kind === "ARRIVAL" && x.sessionId === sessions[1].session_id && x.outcome === "SESSION_RESUMED"))
      assert.equal((await events(s)).length, 1, "no second lifecycle ARRIVAL")
      assert.equal((await row(s)).visit_count, 1)
      assert.match((await view(red.cookie!)).html, /You are in Living Forest/)
    })

    test("L. reconnect after PRESENCE_TIMEOUT is a new entry resolution and a new Visit (RETURNING)", async () => {
      const s = await subject()
      await openVisit(s, rtA)
      const firstVisit = (await sessionsOf(s))[0].visit_id
      await rtA.rt.disconnect((await sessionsOf(s))[0].session_id)
      await agePresence(s, 200)
      await ageArrival(s, 200)
      const e = await enter(s) // the resolver applies the timeout first
      assert.equal(e.result.outcome, "READY")
      assert.equal(e.result.arrival?.kind, "RETURNING")
      assert.equal(e.result.arrival?.reason, "PRIOR_PLACE")
      const ev1 = await events(s)
      assert.deepEqual(ev1.map((x) => `${x.event_type}/${x.authority_kind}`), ["CONFIRMED_ARRIVAL/RUNTIME_CONFIRMED", "CONFIRMED_DEPARTURE/PLATFORM_PRESENCE_TIMEOUT"])
      await redeem(ticketOf(e.result))
      await rtA.rt.step()
      const sessions = await sessionsOf(s)
      assert.notEqual(sessions.at(-1).visit_id, firstVisit, "new visit_id")
      const c = await row(s)
      assert.equal(c.visit_count, 2)
      assert.equal(c.visit_open, true)
      assert.equal((await events(s)).length, 3)
    })

    test("M. WorldK cannot forge arrival or departure", async () => {
      // No WorldK-reachable route calls a lifecycle path.
      for (const f of ["resolver.ts", "gateway.ts"]) {
        const src = readFileSync(path.join(here, f), "utf8")
        assert.doesNotMatch(src, /runtimeArrival|runtimeDeparture|runtimePresence|world_runtime_|record_world_lifecycle|apply_arrival|apply_departure/)
      }
      // The WorldK machine key is not a runtime credential.
      const res = await handleRuntimeIngress(
        new Request(`${ORIGIN}/api/runtime/v1/arrival`, { method: "POST", headers: { [MACHINE_KEY_HEADER]: "x".repeat(43), "content-type": "application/json" }, body: JSON.stringify({ receiptId: randomUUID(), sessionId: randomUUID(), worldId: WORLD }) }),
        "arrival",
        ingressDeps(),
      )
      assert.equal(res.status, 401)
      // No Supabase API role can reach any 040 table or function.
      const fns = ["world_entry_resolve", "world_entry_redeem_ticket", "world_runtime_arrival", "world_runtime_departure", "world_presence_sweep", "world_m14_apply_arrival", "world_runtime_register_instance"]
      const tables = ["world_runtime_credentials", "world_entry_tickets", "world_runtime_sessions", "world_visit_presence", "world_entry_resolutions"]
      for (const role of ["anon", "authenticated", "service_role"]) {
        for (const fn of fns) {
          const r = await su.query("SELECT has_function_privilege($1, p.oid, 'EXECUTE') ok FROM pg_proc p WHERE p.proname = $2", [role, fn])
          assert.equal(r.rows.every((x) => x.ok === false), true, `${role} ${fn}`)
        }
        for (const t of tables) {
          const r = await su.query("SELECT has_table_privilege($1, $2, 'SELECT') OR has_table_privilege($1, $2, 'INSERT') OR has_table_privilege($1, $2, 'UPDATE') ok", [role, t])
          assert.equal(r.rows[0].ok, false, `${role} ${t}`)
        }
      }
    })

    test("N. the reference runtime cannot write the database directly; the Platform credential is narrow", async () => {
      // A runtime credential is not a database login.
      const c = newRuntimeCredential()
      const probe = new pg.Client({ connectionString: urlFor(url, dbName, c.credentialId, c.secret) })
      await assert.rejects(probe.connect())
      await probe.end().catch(() => {})
      // The Platform credential itself has no table privileges, no 039 writer and no internal helper.
      const plat = new pg.Client({ connectionString: urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW) })
      await plat.connect()
      try {
        for (const sql of [
          "SET ROLE worldk_lifecycle_authority",
          "INSERT INTO world_visitor_continuity (world_id, subject_id) VALUES ('living-forest', gen_random_uuid())",
          "SELECT * FROM world_runtime_credentials",
          "SELECT world_m14_apply_arrival(gen_random_uuid(), 'living-forest', gen_random_uuid(), gen_random_uuid(), now(), 6, NULL, 'RUNTIME_CONFIRMED', 'worldk-m14-runtime-ingress', '{}'::jsonb)",
          "SELECT record_world_lifecycle_arrival_v2(gen_random_uuid(), 'living-forest', gen_random_uuid(), gen_random_uuid(), now(), 6, NULL, 'RUNTIME_CONFIRMED', 'worldk-m14-runtime-ingress', '{}'::jsonb)",
          "UPDATE world_state_probe SET tick = 7",
        ]) {
          for (const withRole of [false, true]) {
            await plat.query("BEGIN")
            if (withRole) await plat.query("SET LOCAL ROLE worldk_platform_entry_authority")
            await assert.rejects(plat.query(sql), (e: { code?: string }) => e.code === "42501", sql)
            await plat.query("ROLLBACK")
          }
        }
        // Without SET ROLE even the granted functions are refused (no INHERIT).
        await assert.rejects(plat.query("SELECT world_presence_sweep(1)"), (e: { code?: string }) => e.code === "42501")
      } finally {
        await plat.end()
      }
      // The migration owner / service_role cannot drive runtime evidence either (session gate).
      await assert.rejects(owner.query("SELECT world_presence_sweep(1)"), /AUTHORITY_INVALID/)
    })

    test("O. runtime A cannot act on runtime B's session, allocation or visit", async () => {
      const s = await subject()
      await rtB.rt.poll()
      await su.query("UPDATE world_runtime_instances SET last_seen_at = now() - interval '1 hour' WHERE instance_id = $1", [rtA.instanceId])
      await openVisit(s, rtB)
      const sess = (await sessionsOf(s))[0]
      assert.equal(sess.instance_id, rtB.instanceId)
      for (const op of ["claim", "arrival", "presence", "departure", "disconnect"] as const) {
        const r = await rtA.post(op, { receiptId: randomUUID(), sessionId: sess.session_id, worldId: WORLD })
        assert.equal(r.status, 403, op)
        assert.equal(r.body.error, "SESSION_NOT_BOUND", op)
      }
      // wrong world, unknown session (arrival without a redeemed ticket), tampered subject binding
      assert.equal((await rtB.post("presence", { receiptId: randomUUID(), sessionId: sess.session_id, worldId: "other-world" })).status, 403)
      assert.equal((await rtB.post("arrival", { receiptId: randomUUID(), sessionId: randomUUID(), worldId: WORLD })).body.error, "SESSION_NOT_BOUND")
      await su.query("UPDATE world_runtime_sessions SET subject_id = gen_random_uuid() WHERE session_id = $1", [sess.session_id])
      assert.equal((await rtB.post("presence", { receiptId: randomUUID(), sessionId: sess.session_id, worldId: WORLD })).body.error, "SESSION_NOT_BOUND")
      await su.query("UPDATE world_runtime_sessions SET subject_id = $2 WHERE session_id = $1", [sess.session_id, s])
      assert.equal((await events(s)).length, 1)
      await rtA.rt.poll()
    })

    test("runtime identity: wrong, revoked and expired credentials are refused identically; rotation works", async () => {
      const s = await subject()
      const r = await register("m14-rotation")
      await r.rt.poll()
      const bad = new ReferenceRuntime({
        post: async (op, body) => {
          const res = await handleRuntimeIngress(new Request(`${ORIGIN}/api/runtime/v1/${op}`, { method: "POST", headers: { authorization: `Bearer ${newRuntimeCredential().bearer}` }, body: JSON.stringify(body) }), op, ingressDeps())
          return { status: res.status, body: (await res.json()) as Record<string, unknown> }
        },
      })
      assert.equal(await bad.poll(), null)
      // expired
      await su.query("UPDATE world_runtime_credentials SET expires_at = now() - interval '1 second', issued_at = now() - interval '1 hour' WHERE credential_id = $1", [r.credentialId])
      assert.equal((await r.post("poll", { readiness: "READY" })).status, 401)
      // rotation: a new credential for the same instance works, the old one stays refused
      const next = newRuntimeCredential()
      await owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [next.credentialId, r.instanceId, next.sha256, 3600])
      const post2 = async (op: string, body: unknown) => {
        const res = await handleRuntimeIngress(new Request(`${ORIGIN}/api/runtime/v1/${op}`, { method: "POST", headers: { authorization: `Bearer ${next.bearer}` }, body: JSON.stringify(body) }), op, ingressDeps())
        return { status: res.status, body: (await res.json()) as Record<string, unknown> }
      }
      assert.equal((await post2("poll", { readiness: "READY" })).status, 200)
      // revoked credential, then revoked instance
      await owner.query("SELECT world_runtime_revoke_credential($1)", [next.credentialId])
      const revoked = await post2("poll", { readiness: "READY" })
      assert.equal(revoked.status, 401)
      assert.deepEqual(revoked.body, { error: "RUNTIME_UNAUTHORIZED" })
      const third = newRuntimeCredential()
      await owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [third.credentialId, r.instanceId, third.sha256, 3600])
      await owner.query("SELECT world_runtime_revoke_instance($1)", [r.instanceId])
      await assert.rejects(owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [randomUUID(), r.instanceId, newRuntimeCredential().sha256, 3600]), /RUNTIME_INSTANCE_REVOKED/)
      await assert.rejects(owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [randomUUID(), rtA.instanceId, newRuntimeCredential().sha256, 999999]), /CREDENTIAL_TTL_INVALID/)
      await noVisit(s)
      await rtA.rt.poll()
    })

    test("tickets: expired, superseded and replayed tickets are refused; the intent is idempotent", async () => {
      const s = await subject()
      await rtA.rt.poll()
      const body = intent()
      const first = await enter(s, body)
      const again = await enter(s, body) // same intentId -> same resolution, fresh ticket
      assert.equal(again.result.outcome, "READY")
      assert.notEqual(ticketOf(again.result), ticketOf(first.result))
      assert.equal((await redeem(ticketOf(first.result))).status, 410, "superseded")
      await su.query("UPDATE world_entry_tickets SET expires_at = now() - interval '1 second', issued_at = now() - interval '2 minutes' WHERE subject_id = $1 AND superseded_at IS NULL", [s])
      assert.equal((await redeem(ticketOf(again.result))).status, 410, "expired")
      await assert.rejects(db.redeemTicket(sha256(ticketOf(again.result)), sha256("v".repeat(43))), (e: unknown) => e instanceof EntryAuthorityError && e.code === "TICKET_EXPIRED")
      // another visitor reusing the intent id is refused
      const other = await subject()
      assert.equal((await enter(other, body)).status, 409)
      assert.equal((await redeem("not-a-ticket")).status, 410)
      await noVisit(s)
      await noVisit(other)
    })

    test("P. a visitor never receives another visitor's visit", async () => {
      const a = await subject()
      const b = await subject()
      await openVisit(a, rtA)
      const e = await enter(b)
      assert.equal(e.result.outcome, "READY")
      assert.equal(e.result.arrival?.kind, "FIRST_VISIT")
      const aVisit = (await sessionsOf(a))[0].visit_id
      const bAlloc = (await su.query("SELECT visit_id FROM world_runtime_allocations WHERE subject_id = $1", [b])).rows[0].visit_id
      assert.notEqual(bAlloc, aVisit)
      await noVisit(b)
    })

    test("R. process restart preserves durable state: a fresh runtime process and a fresh Platform pool resume", async () => {
      const s = await subject()
      await openVisit(s, rtA)
      // Platform process restart
      await db.end()
      db = new PgEntryAuthorityDb(urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW), { allowLocal: true, ssl: false })
      // Runtime process restart: a new object with no memory of the session
      const evs: RuntimeEvent[] = []
      const restarted = new ReferenceRuntime({ post: rtA.post }, { onEvent: (e) => evs.push(e) })
      await restarted.step()
      assert.ok(evs.some((e) => e.kind === "CLAIMED"))
      assert.ok(evs.some((e) => e.kind === "PRESENCE" && e.outcome === "PRESENCE_RECORDED"))
      assert.equal((await row(s)).visit_open, true)
      assert.equal((await events(s)).length, 1)
    })
  })
}
