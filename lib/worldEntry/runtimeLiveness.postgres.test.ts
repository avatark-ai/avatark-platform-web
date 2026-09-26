// WORLDK-M14-A4 focused suite: derived runtime liveness (042) against real
// Postgres (037..040 + 042 as the non-superuser migration owner).
//
// Advertised readiness is the runtime's last declared state; liveness is
// observation within the policy window; effective_state is derived on read.
// Proves: fresh READY -> READY; stale READY -> STALE; stale runtimes stay
// ineligible; revoked/invalid credentials never read as READY; a later healthy
// poll restores READY with no repair write; effective READY is exactly the
// resolver's per-instance eligibility; the view itself writes nothing.
//
// Requires WORLD_CONSUMER_TEST_DATABASE_URL (superuser URL, DISPOSABLE local
// server). Skipped visibly when unset.
import { after, before, describe, test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"
import type { WorldEntryResult } from "@avatark/world-consumer-contracts"
import type { ContinuityRecord, VisitorContinuityLedger } from "../worldConsumer/continuityLedger.ts"
import { assertLocalUrl, createSupabaseShapedDb, urlFor } from "../worldConsumer/testing/supabaseShapedDb.ts"
import { PgEntryAuthorityDb } from "./authorityDb.ts"
import { newRuntimeCredential } from "./credentials.ts"
import { handleWorldEntryRequest } from "./resolver.ts"
import { scramVerifier } from "../../scripts/worldk-m14-runtime-registry.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const url = process.env.WORLD_CONSUMER_TEST_DATABASE_URL
// Shared with the other M14 suites: the role is cluster-wide and suites run in parallel.
const PLATFORM_PW = "m14-platform-credential-local-only"
const WORLD = "living-forest"
const ORIGIN = "https://platform-preview.avatark.ai"

if (!url) {
  test("M14-A4 runtime liveness view (skipped: WORLD_CONSUMER_TEST_DATABASE_URL not set)", { skip: true }, () => {})
} else {
  assertLocalUrl(url)
  const dbName = `m14a4_${Date.now()}`
  let su: pg.Client
  let owner: pg.Client
  let db: PgEntryAuthorityDb

  interface Rt { instanceId: string; credentialId: string; sha: Buffer }
  const register = async (label: string): Promise<Rt> => {
    const instanceId = randomUUID()
    const cred = newRuntimeCredential()
    await owner.query("SELECT world_runtime_register_instance($1, $2, $3, $4)", [instanceId, WORLD, label, 4])
    await owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [cred.credentialId, instanceId, cred.sha256, 3600])
    return { instanceId, credentialId: cred.credentialId, sha: cred.sha256 }
  }
  const poll = (r: Rt, readiness: "READY" | "STARTING" = "READY") => db.runtimePoll(r.credentialId, r.sha, readiness)
  const view = async (r: Rt) => (await owner.query("SELECT * FROM world_runtime_instance_liveness WHERE instance_id = $1", [r.instanceId])).rows[0]
  const age = (r: Rt, seconds: number) => su.query("UPDATE world_runtime_instances SET last_seen_at = now() - make_interval(secs => $2) WHERE instance_id = $1", [r.instanceId, seconds])
  const staleAll = () => su.query("UPDATE world_runtime_instances SET last_seen_at = now() - interval '1 hour' WHERE last_seen_at IS NOT NULL")
  const ledger: VisitorContinuityLedger = {
    async get(worldId, subjectId): Promise<ContinuityRecord | null> {
      const r = (await su.query("SELECT * FROM world_visitor_continuity WHERE world_id = $1 AND subject_id = $2", [worldId, subjectId])).rows[0]
      return r ? ({ worldId, subjectId, visitCount: r.visit_count, lastPlaceId: r.last_place_id } as ContinuityRecord) : null
    },
    recordConfirmedEntry: () => Promise.reject(new Error("read-only")),
    recordLeave: () => Promise.reject(new Error("read-only")),
  }
  const enter = async () => {
    const subject = randomUUID()
    await su.query("INSERT INTO auth.users (id) VALUES ($1)", [subject])
    const res = await handleWorldEntryRequest(new Request(`${ORIGIN}/api/worlds/${WORLD}/entry`, { method: "POST", body: JSON.stringify({
      schemaVersion: "1.0", contract: "world-entry-intent", intentId: randomUUID(), worldId: WORLD, requestedPlaceId: null, narrativeContext: null,
      client: { surface: "WEB", capabilities: { webgl2: true, touchPrimary: false, viewportClass: "EXPANDED", reducedMotion: false } },
    }) }), WORLD, async () => ({ subjectId: subject }), { mode: "FIXTURE_PREVIEW", ledger, db, handoffOrigin: ORIGIN })
    return { subject, result: JSON.parse(await res.text()) as WorldEntryResult }
  }
  const allocationsFor = async (subject: string) => (await su.query("SELECT * FROM world_runtime_allocations WHERE subject_id = $1", [subject])).rows
  /** resolver's per-instance eligibility predicate (040), stated independently of the view */
  const resolverEligible = async (r: Rt) => (await su.query(`
    SELECT EXISTS (SELECT 1 FROM world_runtime_instances i JOIN world_entry_policies pol ON pol.world_id = i.world_id
      WHERE i.instance_id = $1 AND i.status = 'ACTIVE' AND i.readiness = 'READY'
        AND i.last_seen_at > now() - make_interval(secs => pol.instance_liveness_seconds)
        AND EXISTS (SELECT 1 FROM world_runtime_credentials k WHERE k.instance_id = i.instance_id AND k.revoked_at IS NULL AND k.expires_at > now())) AS ok`, [r.instanceId])).rows[0].ok as boolean

  describe("M14-A4 derived runtime liveness (real Postgres)", () => {
    before(async () => {
      ;({ su, owner } = await createSupabaseShapedDb(url, dbName, { through040: true }))
      await owner.query(readFileSync(path.join(here, "../../supabase/migrations/042_world_runtime_instance_liveness.sql"), "utf8"))
      await owner.query(`ALTER ROLE worldk_platform_entry_preview LOGIN PASSWORD '${scramVerifier(PLATFORM_PW)}'`)
      db = new PgEntryAuthorityDb(urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW), { allowLocal: true, ssl: false })
    })
    after(async () => {
      await db?.end()
      await owner?.end()
      await su?.end()
    })

    test("A. a fresh READY runtime is advertised READY and effectively READY", async () => {
      const r = await register("m14a4-fresh")
      await poll(r)
      const v = await view(r)
      assert.equal(v.advertised_readiness, "READY")
      assert.equal(v.is_live, true)
      assert.equal(v.credential_valid, true)
      assert.equal(v.liveness_window_seconds, 30)
      assert.ok(v.seconds_since_last_seen >= 0 && v.seconds_since_last_seen < 30)
      assert.equal(v.effective_state, "READY")
    })

    test("B. a stale READY runtime is still advertised READY but effectively STALE (no write)", async () => {
      const r = await register("m14a4-stale")
      await poll(r)
      await age(r, 31)
      const v = await view(r)
      assert.equal(v.advertised_readiness, "READY", "the stored advertisement is untouched")
      assert.equal(v.is_live, false)
      assert.equal(v.effective_state, "STALE")
      const stored = (await su.query("SELECT readiness FROM world_runtime_instances WHERE instance_id = $1", [r.instanceId])).rows[0]
      assert.equal(stored.readiness, "READY", "nothing wrote OFFLINE")
    })

    test("STARTING: live STARTING -> STARTING; stale STARTING -> STALE; never observed -> OFFLINE", async () => {
      const s = await register("m14a4-starting")
      await poll(s, "STARTING")
      assert.equal((await view(s)).effective_state, "STARTING")
      await age(s, 45)
      assert.equal((await view(s)).effective_state, "STALE")
      const never = await register("m14a4-never")
      const v = await view(never)
      assert.equal(v.advertised_readiness, "OFFLINE")
      assert.equal(v.last_seen_at, null)
      assert.equal(v.effective_state, "OFFLINE")
    })

    test("C. a stale (advertised READY) runtime stays ineligible: ENTER is RUNTIME_UNAVAILABLE and allocates nothing", async () => {
      const r = await register("m14a4-ineligible")
      await poll(r)
      await staleAll()
      assert.equal((await view(r)).effective_state, "STALE")
      assert.equal((await view(r)).advertised_readiness, "READY")
      const e = await enter()
      assert.equal(e.result.outcome, "UNAVAILABLE")
      assert.equal(e.result.unavailable?.reason, "RUNTIME_UNAVAILABLE")
      assert.equal((await allocationsFor(e.subject)).length, 0)
    })

    test("D. revoked or expired credentials, or a revoked instance, never read as effectively READY", async () => {
      await staleAll()
      const r = await register("m14a4-cred")
      await poll(r)
      assert.equal((await view(r)).effective_state, "READY")
      await owner.query("SELECT world_runtime_revoke_credential($1)", [r.credentialId])
      let v = await view(r)
      assert.equal(v.advertised_readiness, "READY")
      assert.equal(v.is_live, true, "still inside the window")
      assert.equal(v.credential_valid, false)
      assert.equal(v.effective_state, "CREDENTIAL_INVALID")
      assert.equal(await resolverEligible(r), false)
      const e = await enter()
      assert.equal(e.result.unavailable?.reason, "RUNTIME_UNAVAILABLE", "the resolver agrees")

      const x = await register("m14a4-expired")
      await poll(x)
      await su.query("UPDATE world_runtime_credentials SET expires_at = now() - interval '1 second', issued_at = now() - interval '1 hour' WHERE credential_id = $1", [x.credentialId])
      assert.equal((await view(x)).effective_state, "CREDENTIAL_INVALID")

      const y = await register("m14a4-revoked")
      await poll(y)
      await owner.query("SELECT world_runtime_revoke_instance($1)", [y.instanceId])
      v = await view(y)
      assert.equal(v.status, "REVOKED")
      assert.equal(v.effective_state, "REVOKED")
    })

    test("E. a later healthy poll restores effective READY naturally (no repair write)", async () => {
      await staleAll()
      const r = await register("m14a4-recover")
      await poll(r)
      await age(r, 300)
      assert.equal((await view(r)).effective_state, "STALE")
      await poll(r) // the runtime's own authenticated observation, nothing else
      const v = await view(r)
      assert.equal(v.effective_state, "READY")
      assert.equal(await resolverEligible(r), true)
      const e = await enter()
      assert.equal(e.result.outcome, "READY", "and the resolver allocates to it again")
      assert.equal((await allocationsFor(e.subject))[0].instance_id, r.instanceId)
    })

    test("effective READY is exactly the resolver's per-instance eligibility, for every instance", async () => {
      const rows = (await owner.query("SELECT instance_id, effective_state FROM world_runtime_instance_liveness")).rows
      assert.ok(rows.length >= 8)
      for (const row of rows) {
        const eligible = await resolverEligible({ instanceId: row.instance_id } as Rt)
        assert.equal(row.effective_state === "READY", eligible, `${row.instance_id}: ${row.effective_state} vs eligible=${eligible}`)
      }
    })

    test("F. reading the view performs zero writes (no transaction id, identical state)", async () => {
      const tables = ["world_runtime_instances", "world_runtime_credentials", "world_runtime_allocations", "world_entry_tickets", "world_runtime_sessions", "world_visit_presence", "world_visitor_continuity", "world_visitor_lifecycle_events", "world_entry_resolutions", "world_runtime_receipts", "world_entry_policies"]
      const digest = async () => {
        const out: Record<string, string> = {}
        for (const t of tables) out[t] = (await su.query(`SELECT md5(COALESCE(string_agg(x::text, '|' ORDER BY x::text), '')) AS h FROM ${t} x`)).rows[0].h
        return out
      }
      const before = await digest()
      for (const c of [owner, su]) {
        await c.query("BEGIN")
        await c.query("SELECT * FROM world_runtime_instance_liveness")
        await c.query("SELECT effective_state, count(*) FROM world_runtime_instance_liveness GROUP BY 1")
        const xid = (await c.query("SELECT pg_current_xact_id_if_assigned() AS x")).rows[0].x
        await c.query("COMMIT")
        assert.equal(xid, null, "a write would have assigned a transaction id")
      }
      assert.deepEqual(await digest(), before)
      const def = (await su.query("SELECT pg_get_viewdef('world_runtime_instance_liveness'::regclass) AS d")).rows[0].d as string
      assert.doesNotMatch(def, /world_m14_|world_presence_sweep|world_runtime_poll|nextval|INSERT|UPDATE|DELETE/i)
      const opts = (await su.query("SELECT reloptions FROM pg_class WHERE oid = 'world_runtime_instance_liveness'::regclass")).rows[0].reloptions
      assert.deepEqual(opts, ["security_invoker=true"])
      for (const role of ["anon", "authenticated", "service_role"]) {
        assert.equal((await su.query("SELECT has_table_privilege($1, 'world_runtime_instance_liveness', 'SELECT') AS p", [role])).rows[0].p, false, role)
      }
      const triggers = (await su.query("SELECT count(*)::int AS n FROM pg_trigger WHERE tgrelid = 'world_runtime_instance_liveness'::regclass")).rows[0].n
      assert.equal(triggers, 0)
    })
  })
}
