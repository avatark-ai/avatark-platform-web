// WORLDK-M14-A5 focused suite: automatic presence expiry through the EXISTING
// authoritative sweep, scheduled by pg_cron as the Platform entry authority.
//
// Always (real Postgres, 037..040 as the non-superuser owner): live presence is
// preserved, stale presence closes exactly once, concurrent/retried sweeps
// cannot double-close, unrelated subjects are untouched, unauthorized callers
// are refused.
//
// With pg_cron (041 applied; the test database must be cron.database_name):
// the REAL scheduled job, owned by worldk_platform_entry_preview, closes an
// abandoned Visit with no manual sweep; repeated scheduled runs are idempotent;
// explicit LEAVE stays the normal path; a job owned by a non-authority role
// fails and changes nothing.
//
// Requires WORLD_CONSUMER_TEST_DATABASE_URL (superuser URL, DISPOSABLE local
// server). Scheduler tests also need WORLD_CONSUMER_TEST_CRON_DATABASE = the
// server's cron.database_name. Each part is skipped visibly when unavailable.
import { after, before, describe, test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"
import type { WorldEntryResult } from "@avatark/world-consumer-contracts"
import { createLivingForestFixtureFactSource } from "../worldConsumer/facts.ts"
import type { ContinuityRecord, VisitorContinuityLedger } from "../worldConsumer/continuityLedger.ts"
import { assertLocalUrl, createSupabaseShapedDb, urlFor } from "../worldConsumer/testing/supabaseShapedDb.ts"
import { PgEntryAuthorityDb } from "./authorityDb.ts"
import { newRuntimeCredential } from "./credentials.ts"
import { handleHandoff, handleLeave, SESSION_COOKIE } from "./gateway.ts"
import { ReferenceRuntime, type IngressTransport } from "./referenceRuntime.ts"
import { handleWorldEntryRequest, HANDOFF_PATH_PREFIX } from "./resolver.ts"
import { handleRuntimeIngress } from "./runtimeIngress.ts"
import { presenceSweepCommand, presenceSweepStatus, schedulePresenceSweep, unschedulePresenceSweep, PRESENCE_SWEEP_JOB } from "./presenceSweepSchedule.ts"
import { scramVerifier } from "../../scripts/worldk-m14-runtime-registry.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const url = process.env.WORLD_CONSUMER_TEST_DATABASE_URL
const cronDb = process.env.WORLD_CONSUMER_TEST_CRON_DATABASE
// Shared with entryAuthority.postgres.test.ts: the role is cluster-wide and the suites run in parallel.
const PLATFORM_PW = "m14-platform-credential-local-only"
const WORLD = "living-forest"
const ORIGIN = "https://platform-preview.avatark.ai"
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

if (!url) {
  test("M14-A5 presence sweep schedule (skipped: WORLD_CONSUMER_TEST_DATABASE_URL not set)", { skip: true }, () => {})
} else {
  assertLocalUrl(url)
  const dbName = cronDb ?? `m14a5_${Date.now()}`
  let su: pg.Client
  let owner: pg.Client
  let db: PgEntryAuthorityDb
  let cronReady = false
  const facts = createLivingForestFixtureFactSource()

  const subject = async () => {
    const id = randomUUID()
    await su.query("INSERT INTO auth.users (id) VALUES ($1)", [id])
    return id
  }
  const row = async (s: string) => (await su.query("SELECT * FROM world_visitor_continuity WHERE world_id = $1 AND subject_id = $2", [WORLD, s])).rows[0]
  const events = async (s: string) => (await su.query("SELECT * FROM world_visitor_lifecycle_events WHERE subject_id = $1 ORDER BY recorded_at, event_type", [s])).rows
  const presenceOf = async (s: string) => (await su.query("SELECT * FROM world_visit_presence WHERE subject_id = $1 ORDER BY opened_at", [s])).rows
  const allocationsOf = async (s: string) => (await su.query("SELECT * FROM world_runtime_allocations WHERE subject_id = $1 ORDER BY created_at", [s])).rows
  const sessionsOf = async (s: string) => (await su.query("SELECT * FROM world_runtime_sessions WHERE subject_id = $1 ORDER BY redeemed_at", [s])).rows
  const snapshot = async (s: string) => JSON.stringify({ c: await row(s), e: await events(s), p: await presenceOf(s), a: await allocationsOf(s), x: await sessionsOf(s) })
  const age = async (s: string, seconds: number) => {
    await su.query("UPDATE world_visit_presence SET last_presence_at = now() - make_interval(secs => $2), opened_at = LEAST(opened_at, now() - make_interval(secs => $2)) WHERE subject_id = $1 AND closed_at IS NULL", [s, seconds])
    await su.query("UPDATE world_visitor_continuity SET last_entered_at = LEAST(last_entered_at, now() - make_interval(secs => $2 + 10)) WHERE subject_id = $1", [s, seconds])
  }
  const ledger: VisitorContinuityLedger = {
    async get(worldId, subjectId): Promise<ContinuityRecord | null> {
      const r = (await su.query("SELECT * FROM world_visitor_continuity WHERE world_id = $1 AND subject_id = $2", [worldId, subjectId])).rows[0]
      return r ? ({ worldId, subjectId, visitCount: r.visit_count, lastPlaceId: r.last_place_id } as ContinuityRecord) : null
    },
    recordConfirmedEntry: () => Promise.reject(new Error("read-only")),
    recordLeave: () => Promise.reject(new Error("read-only")),
  }
  let rt: ReferenceRuntime
  const openVisit = async (s: string) => {
    await rt.poll()
    const res = await handleWorldEntryRequest(new Request(`${ORIGIN}/api/worlds/${WORLD}/entry`, { method: "POST", body: JSON.stringify({
      schemaVersion: "1.0", contract: "world-entry-intent", intentId: randomUUID(), worldId: WORLD, requestedPlaceId: null, narrativeContext: null,
      client: { surface: "WEB", capabilities: { webgl2: true, touchPrimary: false, viewportClass: "EXPANDED", reducedMotion: false } },
    }) }), WORLD, async () => ({ subjectId: s }), { mode: "FIXTURE_PREVIEW", ledger, db, handoffOrigin: ORIGIN })
    const r = JSON.parse(await res.text()) as WorldEntryResult
    assert.equal(r.outcome, "READY")
    const red = await handleHandoff(r.handoff!.href.slice(`${ORIGIN}${HANDOFF_PATH_PREFIX}`.length), { db })
    assert.equal(red.status, 303)
    await rt.step() // claim + ARRIVAL
    assert.equal((await row(s)).visit_open, true)
    return red.headers.get("set-cookie")!.match(new RegExp(`${SESSION_COOKIE}=([A-Za-z0-9_-]{43})`))![1]!
  }
  const authorityClient = async () => {
    const c = new pg.Client({ connectionString: urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW) })
    await c.connect()
    return c
  }
  const assertTimedOut = async (s: string, lastPresence: Date, countBefore: number) => {
    const ev = await events(s)
    assert.equal(ev.filter((e) => e.event_type === "CONFIRMED_DEPARTURE").length, 1, "exactly one departure")
    const dep = ev.at(-1)
    assert.equal(dep.event_type, "CONFIRMED_DEPARTURE")
    assert.equal(dep.authority_kind, "PLATFORM_PRESENCE_TIMEOUT")
    assert.equal(dep.recorded_by, "worldk_platform_entry_preview")
    assert.equal(new Date(dep.occurred_at).getTime(), lastPresence.getTime(), "closure is dated at the last accepted presence")
    const c = await row(s)
    assert.equal(c.visit_open, false)
    assert.equal(c.open_visit_id, null)
    assert.equal(c.last_seen_basis, "PRESENCE_TIMEOUT")
    assert.equal(new Date(c.last_seen_at).getTime(), lastPresence.getTime())
    assert.equal(c.visit_count, countBefore, "a timeout never changes the visit count")
    assert.equal((await presenceOf(s)).at(-1).close_kind, "PRESENCE_TIMEOUT")
    const a = (await allocationsOf(s)).at(-1)
    assert.equal(a.state, "RELEASED")
    assert.equal(a.release_reason, "PRESENCE_TIMEOUT")
    assert.equal((await sessionsOf(s)).at(-1).end_reason, "VISIT_CLOSED")
  }

  describe("M14-A5 automatic presence expiry (real Postgres)", () => {
    before(async () => {
      ;({ su, owner } = await createSupabaseShapedDb(url, dbName, { through040: true }))
      await owner.query(`ALTER ROLE worldk_platform_entry_preview LOGIN PASSWORD '${scramVerifier(PLATFORM_PW)}'`)
      db = new PgEntryAuthorityDb(urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW), { allowLocal: true, ssl: false })
      const instanceId = randomUUID()
      const cred = newRuntimeCredential()
      await owner.query("SELECT world_runtime_register_instance($1, $2, $3, $4)", [instanceId, WORLD, "m14a5-reference", 64])
      await owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [cred.credentialId, instanceId, cred.sha256, 3600])
      const post: IngressTransport["post"] = async (op, body) => {
        const res = await handleRuntimeIngress(new Request(`${ORIGIN}/api/runtime/v1/${op}`, { method: "POST", headers: { authorization: `Bearer ${cred.bearer}`, "content-type": "application/json" }, body: JSON.stringify(body) }), op, { db, mode: "FIXTURE_PREVIEW", facts })
        return { status: res.status, body: (await res.json()) as Record<string, unknown> }
      }
      rt = new ReferenceRuntime({ post }, {})
      // 041 (applied by the superuser here; by the Supabase migration owner on Preview).
      if (cronDb && (await su.query("SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'")).rowCount) {
        await su.query(readFileSync(path.join(here, "../../supabase/migrations/041_world_presence_sweep_schedule.sql"), "utf8"))
        cronReady = true
      }
    })
    after(async () => {
      if (cronReady) await su.query("SELECT cron.unschedule(jobid) FROM cron.job").catch(() => {})
      await db?.end()
      await owner?.end()
      await su?.end()
    })

    test("A5-1/7: a sweep leaves live presence and unrelated subjects untouched", async () => {
      const live = await subject()
      await openVisit(live)
      const before = await snapshot(live)
      assert.equal(await db.sweep(100), 0)
      assert.equal(await snapshot(live), before)
    })

    test("A5-2..6/8: stale presence closes exactly once — allocation, presence, session released; continuity coherent; repeat is a no-op", async () => {
      const stale = await subject()
      const live = await subject()
      await openVisit(stale)
      await openVisit(live)
      await age(stale, 125)
      const lastPresence = (await presenceOf(stale))[0].last_presence_at as Date
      const count = (await row(stale)).visit_count
      const liveBefore = await snapshot(live)
      assert.equal(await db.sweep(100), 1)
      await assertTimedOut(stale, lastPresence, count)
      assert.equal(await snapshot(live), liveBefore, "the live subject is untouched")
      const after1 = await snapshot(stale)
      assert.equal(await db.sweep(100), 0, "a repeated sweep changes nothing")
      assert.equal(await snapshot(stale), after1)
    })

    test("A5-9: concurrent sweeps close each abandoned Visit exactly once", async () => {
      const subs = await Promise.all([1, 2, 3, 4, 5].map(() => subject()))
      for (const s of subs) await openVisit(s)
      for (const s of subs) await age(s, 130)
      const workers = [1, 2, 3, 4].map(() => new PgEntryAuthorityDb(urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW), { allowLocal: true, ssl: false }))
      const n = await Promise.all(workers.map((w) => w.sweep(100)))
      await Promise.all(workers.map((w) => w.end()))
      assert.equal(n.reduce((a, b) => a + b, 0), subs.length, `per-worker counts ${n}`)
      for (const s of subs) assert.equal((await events(s)).filter((e) => e.event_type === "CONFIRMED_DEPARTURE").length, 1)
    })

    test("A5-11: only the authority credential (with SET ROLE) can run the sweep", async () => {
      for (const role of ["anon", "authenticated", "service_role"]) {
        await su.query("BEGIN")
        await su.query(`SET LOCAL ROLE ${role}`)
        await assert.rejects(su.query("SELECT world_presence_sweep(1)"), (e: { code?: string }) => e.code === "42501", role)
        await su.query("ROLLBACK")
      }
      await assert.rejects(owner.query("SELECT world_presence_sweep(1)"), /AUTHORITY_INVALID/)
      const c = await authorityClient()
      try {
        await assert.rejects(c.query("SELECT world_presence_sweep(1)"), (e: { code?: string }) => e.code === "42501", "no INHERIT: SET ROLE is required")
        await c.query(presenceSweepCommand(5)) // the scheduled command itself succeeds as the credential
      } finally {
        await c.end()
      }
    })

    describe("scheduled by pg_cron (041)", () => {
      const waitFor = async (what: string, pred: () => Promise<boolean>, ms = 30000) => {
        const end = Date.now() + ms
        while (!(await pred())) {
          if (Date.now() > end) throw new Error(`timed out waiting for ${what}`)
          await sleep(500)
        }
      }

      test("A5-3/SCHED: the scheduled job (owned by the authority credential) closes an abandoned Visit with no manual sweep; later runs are no-ops", { skip: !cronDb && "WORLD_CONSUMER_TEST_CRON_DATABASE not set" }, async () => {
        assert.ok(cronReady, "pg_cron available in the cron database")
        const stale = await subject()
        const live = await subject()
        await openVisit(stale)
        await openVisit(live)
        await age(stale, 125)
        const lastPresence = (await presenceOf(stale))[0].last_presence_at as Date
        const count = (await row(stale)).visit_count
        const liveBefore = await snapshot(live)
        const c = await authorityClient()
        try {
          const jobid = await schedulePresenceSweep(c, "1 seconds")
          const job = (await su.query("SELECT username, command FROM cron.job WHERE jobid = $1", [jobid])).rows[0]
          assert.equal(job.username, "worldk_platform_entry_preview")
          assert.equal(job.command, presenceSweepCommand())
          await waitFor("the scheduled sweep to close the abandoned Visit", async () => (await row(stale)).visit_open === false)
          await assertTimedOut(stale, lastPresence, count)
          assert.equal(await snapshot(live), liveBefore, "live presence survives scheduled sweeps")
          const settled = await snapshot(stale)
          const runsBefore = (await presenceSweepStatus(c, 1000)).runs.length
          await waitFor("three more scheduled runs", async () => (await presenceSweepStatus(c, 1000)).runs.length >= runsBefore + 3)
          assert.equal(await snapshot(stale), settled, "repeated scheduled runs change nothing")
          const st = await presenceSweepStatus(c, 1000)
          assert.ok(st.runs.length > 0 && st.runs.filter((r) => r.end).every((r) => r.status === "succeeded"), JSON.stringify(st.runs.slice(0, 3)))
        } finally {
          await c.end()
        }
      })

      test("A5-10: with the schedule active, explicit LEAVE is still the normal path (RUNTIME_CONFIRMED, no timeout)", { skip: !cronDb && "WORLD_CONSUMER_TEST_CRON_DATABASE not set" }, async () => {
        const s = await subject()
        const cookie = await openVisit(s)
        const leave = await handleLeave(new Request(`${ORIGIN}/world-entry/session/leave`, { method: "POST", headers: { cookie: `${SESSION_COOKIE}=${cookie}`, origin: ORIGIN, "sec-fetch-site": "same-origin" } }), { db })
        assert.equal(leave.status, 303)
        await rt.step()
        await sleep(2500) // scheduled runs happen meanwhile
        const ev = await events(s)
        assert.deepEqual(ev.map((e) => `${e.event_type}/${e.authority_kind}`), ["CONFIRMED_ARRIVAL/RUNTIME_CONFIRMED", "CONFIRMED_DEPARTURE/RUNTIME_CONFIRMED"])
        assert.equal((await row(s)).last_seen_basis, "LEAVE_RECORDED")
      })

      test("A5-11/SCHED: a job owned by a non-authority role fails and changes nothing", { skip: !cronDb && "WORLD_CONSUMER_TEST_CRON_DATABASE not set" }, async () => {
        const c = await authorityClient()
        await unschedulePresenceSweep(c)
        await c.end()
        const s = await subject()
        await openVisit(s)
        await age(s, 125)
        const before = await snapshot(s)
        const ownerRole = (await owner.query("SELECT current_user AS u")).rows[0].u
        await su.query(`GRANT USAGE ON SCHEMA cron TO ${ownerRole}`)
        await su.query(`GRANT EXECUTE ON FUNCTION cron.schedule(text, text, text) TO ${ownerRole}`)
        const rogue = Number((await owner.query("SELECT cron.schedule('rogue-sweep', '1 seconds', $1) AS j", [presenceSweepCommand()])).rows[0].j)
        await waitFor("the rogue job to run", async () => (await su.query("SELECT 1 FROM cron.job_run_details WHERE jobid = $1 AND end_time IS NOT NULL", [rogue])).rowCount! >= 2)
        const runs = (await su.query("SELECT status, return_message FROM cron.job_run_details WHERE jobid = $1", [rogue])).rows
        assert.ok(runs.every((r) => r.status === "failed"), JSON.stringify(runs))
        assert.match(runs[0].return_message, /permission denied|AUTHORITY_INVALID/)
        await su.query("SELECT cron.unschedule($1::bigint)", [rogue])
        assert.equal(await snapshot(s), before, "a non-authority job changes nothing")
        assert.equal((await su.query("SELECT 1 FROM cron.job WHERE jobname = $1", [PRESENCE_SWEEP_JOB])).rowCount, 0)
      })
    })
  })
}
