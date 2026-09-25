// WORLDK-M13: migration 039 lifecycle authority against real Postgres.
//
// Builds a Supabase-shaped database (non-superuser owner standing in for
// Supabase's `postgres`, anon/authenticated/service_role with Supabase's
// default privileges on new public objects) in a FRESH throwaway database,
// applies 037 + 038's continuity revokes + 039 as that owner, then drives
// the Preview Lifecycle Harness through the dedicated credential.
//
// Requires WORLD_CONSUMER_TEST_DATABASE_URL: a superuser URL for a
// DISPOSABLE local server (never shared/production). Skipped — visibly —
// when unset.
import { after, before, describe, test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import pg from "pg"
import {
  LIFECYCLE_CREDENTIAL_ROLE,
  LifecycleFailure,
  previewProvenance,
  recordConfirmedArrival,
  recordConfirmedDeparture,
  type LifecycleEvent,
} from "./testing/previewLifecycleHarness.ts"
import { assertLocalUrl, createSupabaseShapedDb, migrationSql as migration, urlFor } from "./testing/supabaseShapedDb.ts"

const url = process.env.WORLD_CONSUMER_TEST_DATABASE_URL
const CRED_PW = "m13-credential-local-only"
const WORLD = "living-forest"
const V2 = ["record_world_lifecycle_arrival_v2", "record_world_lifecycle_departure_v2"]

if (!url) {
  test("039 lifecycle authority (skipped: WORLD_CONSUMER_TEST_DATABASE_URL not set)", { skip: true }, () => {})
} else {
  assertLocalUrl(url)
  const dbName = `m13_lifecycle_${Date.now()}`
  const at = (db: string, user?: string, password?: string) => urlFor(url, db, user, password)
  let su: pg.Client // superuser in the throwaway db
  let owner: pg.Client
  let cred: pg.Client
  const clients: pg.Client[] = []
  const connect = async (conn: string) => {
    const c = new pg.Client({ connectionString: conn })
    await c.connect()
    clients.push(c)
    return c
  }

  const subject = async () => {
    const id = randomUUID()
    await su.query("INSERT INTO auth.users (id) VALUES ($1)", [id])
    return id
  }
  const nowIso = () => new Date().toISOString()
  const ev = (subjectId: string, visitId: string, over: Partial<LifecycleEvent> = {}): LifecycleEvent => ({
    eventId: randomUUID(),
    worldId: WORLD,
    subjectId,
    visitId,
    occurredAt: nowIso(),
    worldTick: 0,
    placeId: "forest-clearing",
    provenance: previewProvenance(),
    ...over,
  })
  const failsWith = async (p: Promise<unknown>, code: string) => {
    await assert.rejects(p, (e: unknown) => e instanceof LifecycleFailure && e.code === code, `expected ${code}`)
  }
  const row = async (subjectId: string, world = WORLD) => (await su.query("SELECT * FROM world_visitor_continuity WHERE world_id = $1 AND subject_id = $2", [world, subjectId])).rows[0]
  const events = async (subjectId: string) => (await su.query("SELECT * FROM world_visitor_lifecycle_events WHERE subject_id = $1 ORDER BY recorded_at, event_type", [subjectId])).rows
  /** Run SQL as a Supabase API role the way PostgREST does (SET ROLE + JWT claim). */
  const asRole = async (role: string, sql: string, params: unknown[] = [], sub?: string) => {
    await su.query("BEGIN")
    try {
      await su.query(`SET LOCAL ROLE ${role}`)
      if (sub) await su.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [sub])
      return await su.query(sql, params)
    } finally {
      await su.query("ROLLBACK")
    }
  }
  const v2Call = (fn: string) => `SELECT * FROM ${fn}($1, 'living-forest', $2, $3, now(), 0, NULL, 'PREVIEW_AUTHORITY_SIMULATION', 'worldk-m13-preview-lifecycle-harness', '{}'::jsonb)`

  describe("migration 039 — Preview lifecycle authority (real Postgres)", () => {
    before(async () => {
      ;({ su, owner } = await createSupabaseShapedDb(url, dbName))
      clients.push(su, owner)
      // Operator step (out-of-band on Preview): enable the credential.
      await owner.query(`ALTER ROLE ${LIFECYCLE_CREDENTIAL_ROLE} LOGIN PASSWORD '${CRED_PW}'`)
      cred = await connect(at(dbName, LIFECYCLE_CREDENTIAL_ROLE, CRED_PW))
    })

    after(async () => {
      for (const c of clients) await c.end().catch(() => {})
      const admin = new pg.Client({ connectionString: url })
      await admin.connect()
      await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`)
      await admin.end()
    })

    // ── privilege graph ──────────────────────────────────────────

    test("roles: writer is NOLOGIN/NOINHERIT/NOBYPASSRLS; credential holds non-inheriting SET-only membership", async () => {
      const { rows } = await su.query("SELECT rolname, rolcanlogin, rolinherit, rolbypassrls, rolsuper, rolcreaterole, rolcreatedb, rolreplication FROM pg_roles WHERE rolname IN ('worldk_lifecycle_authority', $1) ORDER BY rolname", [LIFECYCLE_CREDENTIAL_ROLE])
      const [writer, credential] = [rows.find((r) => r.rolname === "worldk_lifecycle_authority")!, rows.find((r) => r.rolname === LIFECYCLE_CREDENTIAL_ROLE)!]
      assert.deepEqual({ ...writer, rolname: undefined }, { rolname: undefined, rolcanlogin: false, rolinherit: false, rolbypassrls: false, rolsuper: false, rolcreaterole: false, rolcreatedb: false, rolreplication: false })
      assert.equal(credential.rolinherit, false)
      assert.equal(credential.rolbypassrls, false)
      assert.equal(credential.rolsuper, false)
      const m = (await su.query("SELECT inherit_option, set_option, admin_option FROM pg_auth_members WHERE roleid = 'worldk_lifecycle_authority'::regrole AND member = $1::regrole", [LIFECYCLE_CREDENTIAL_ROLE])).rows
      assert.deepEqual(m, [{ inherit_option: false, set_option: true, admin_option: false }])
      // The writer role is a member of nothing.
      assert.equal((await su.query("SELECT count(*)::int n FROM pg_auth_members WHERE member = 'worldk_lifecycle_authority'::regrole")).rows[0].n, 0)
    })

    test("writer role: EXECUTE on exactly the two v2 functions, zero table privileges anywhere", async () => {
      const fns = (await su.query(`
        SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema') AND has_function_privilege('worldk_lifecycle_authority', p.oid, 'EXECUTE')
          AND NOT has_function_privilege('public', p.oid, 'EXECUTE')`)).rows.map((r) => r.proname).sort()
      assert.deepEqual(fns, [...V2].sort())
      const tables = (await su.query(`
        SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname IN ('public', 'auth') AND c.relkind IN ('r', 'v', 'm', 'p')
          AND (has_table_privilege('worldk_lifecycle_authority', c.oid, 'SELECT') OR has_table_privilege('worldk_lifecycle_authority', c.oid, 'INSERT')
            OR has_table_privilege('worldk_lifecycle_authority', c.oid, 'UPDATE') OR has_table_privilege('worldk_lifecycle_authority', c.oid, 'DELETE')
            OR has_table_privilege('worldk_lifecycle_authority', c.oid, 'TRUNCATE'))`)).rows
      assert.deepEqual(tables, [])
      assert.equal((await su.query("SELECT has_schema_privilege('worldk_lifecycle_authority', 'public', 'CREATE') c")).rows[0].c, false)
    })

    test("credential itself holds no EXECUTE (NOINHERIT) — it must assume the writer role", async () => {
      for (const fn of V2) {
        const oid = `${fn}(uuid, text, uuid, uuid, timestamptz, integer, text, text, text, jsonb)`
        assert.equal((await su.query("SELECT has_function_privilege($1, $2, 'EXECUTE') x", [LIFECYCLE_CREDENTIAL_ROLE, oid])).rows[0].x, false)
      }
      const a = await subject()
      await failsWith(recordConfirmedArrival(cred, ev(a, randomUUID()), { assumeRole: false }), "PERMISSION_DENIED")
      assert.equal(await row(a), undefined)
    })

    test("anon / authenticated / service_role: no EXECUTE on v2 or legacy 037 writers; continuity is SELECT-only", async () => {
      const legacy = ["record_world_confirmed_entry(text, uuid, timestamptz, integer, text)", "record_world_leave(text, uuid, timestamptz, integer, text)"]
      const v2 = V2.map((f) => `${f}(uuid, text, uuid, uuid, timestamptz, integer, text, text, text, jsonb)`)
      for (const role of ["anon", "authenticated", "service_role"]) {
        for (const fn of [...legacy, ...v2]) {
          assert.equal((await su.query("SELECT has_function_privilege($1, $2, 'EXECUTE') x", [role, fn])).rows[0].x, false, `${role} ${fn}`)
        }
        for (const priv of ["INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) {
          assert.equal((await su.query("SELECT has_table_privilege($1, 'world_visitor_continuity', $2) x", [role, priv])).rows[0].x, false, `${role} ${priv}`)
        }
        for (const t of ["world_visitor_lifecycle_events", "world_lifecycle_authorities"]) {
          for (const priv of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"]) {
            assert.equal((await su.query("SELECT has_table_privilege($1, $2, $3) x", [role, t, priv])).rows[0].x, false, `${role} ${t} ${priv}`)
          }
        }
      }
      assert.equal((await su.query("SELECT has_table_privilege('authenticated', 'world_visitor_continuity', 'SELECT') x")).rows[0].x, true)
    })

    // ── authoritative lifecycle ──────────────────────────────────

    test("arrival then correlated departure: one visit, provenance and commit evidence recorded", async () => {
      const a = await subject()
      const visit = randomUUID()
      const arrive = await recordConfirmedArrival(cred, ev(a, visit, { worldTick: 0 }))
      assert.equal(arrive.outcome, "APPLIED")
      assert.equal(arrive.visitCount, 1)
      assert.equal(arrive.visitOpen, true)
      assert.equal(arrive.openVisitId, visit)
      assert.equal(arrive.lastSeenBasis, "ENTRY_CONFIRMED")
      const leave = await recordConfirmedDeparture(cred, ev(a, visit, { worldTick: 1 }))
      assert.equal(leave.outcome, "APPLIED")
      assert.equal(leave.visitCount, 1)
      assert.equal(leave.visitOpen, false)
      assert.equal(leave.openVisitId, null)
      assert.equal(leave.lastSeenTick, 1)
      assert.equal(leave.lastSeenBasis, "LEAVE_RECORDED")
      const r = await row(a)
      assert.equal(r.visit_count, 1)
      assert.equal(r.visit_open, false)
      assert.equal(r.open_visit_id, null)
      assert.notEqual(r.last_left_at, null)
      const log = await events(a)
      assert.deepEqual(log.map((e) => e.event_type), ["CONFIRMED_ARRIVAL", "CONFIRMED_DEPARTURE"])
      for (const e of log) {
        assert.equal(e.recorded_by, LIFECYCLE_CREDENTIAL_ROLE)
        assert.equal(e.authority_kind, "PREVIEW_AUTHORITY_SIMULATION")
        assert.equal(e.authority_id, "worldk-m13-preview-lifecycle-harness")
        assert.equal(e.provenance.classification, "PREVIEW_AUTHORITY_SIMULATION")
        assert.equal(e.provenance.runtimeReceipt, false)
        assert.equal(e.visit_id, visit)
        assert.ok(Number(e.recorded_txid) > 0)
      }
      assert.deepEqual(log.map((e) => [e.resulting_visit_count, e.resulting_visit_open]), [[1, true], [1, false]])
    })

    test("idempotency: same eventId + same payload replays with no effect, even after departure", async () => {
      const a = await subject()
      const visit = randomUUID()
      const arrival = ev(a, visit, { worldTick: 0 })
      const departure = ev(a, visit, { worldTick: 1 })
      await recordConfirmedArrival(cred, arrival)
      const replayOpen = await recordConfirmedArrival(cred, arrival)
      assert.equal(replayOpen.outcome, "IDEMPOTENT_REPLAY")
      assert.equal(replayOpen.visitCount, 1)
      await recordConfirmedDeparture(cred, departure)
      const replayArrival = await recordConfirmedArrival(cred, arrival)
      assert.equal(replayArrival.outcome, "IDEMPOTENT_REPLAY")
      assert.equal(replayArrival.visitOpen, false, "replay must not reopen the visit")
      const replayDeparture = await recordConfirmedDeparture(cred, departure)
      assert.equal(replayDeparture.outcome, "IDEMPOTENT_REPLAY")
      assert.equal((await row(a)).visit_count, 1)
      assert.equal((await events(a)).length, 2)
    })

    test("idempotency: same eventId + changed payload -> EVENT_ID_CONFLICT (incl. arrival id reused as departure)", async () => {
      const a = await subject()
      const visit = randomUUID()
      const arrival = ev(a, visit, { worldTick: 0 })
      await recordConfirmedArrival(cred, arrival)
      await failsWith(recordConfirmedArrival(cred, { ...arrival, worldTick: 1 }), "EVENT_ID_CONFLICT")
      await failsWith(recordConfirmedArrival(cred, { ...arrival, placeId: "forest-pond" }), "EVENT_ID_CONFLICT")
      await failsWith(recordConfirmedArrival(cred, { ...arrival, provenance: previewProvenance() }), "EVENT_ID_CONFLICT")
      await failsWith(recordConfirmedDeparture(cred, { ...arrival, worldTick: 1 }), "EVENT_ID_CONFLICT")
      const departure = ev(a, visit, { worldTick: 1 })
      await recordConfirmedDeparture(cred, departure)
      await failsWith(recordConfirmedDeparture(cred, { ...departure, worldTick: 2 }), "EVENT_ID_CONFLICT")
      const other = await subject()
      await failsWith(recordConfirmedArrival(cred, { ...arrival, subjectId: other }), "EVENT_ID_CONFLICT")
      assert.equal(await row(other), undefined)
      assert.equal((await row(a)).visit_count, 1)
    })

    test("visit state: double arrival, leave without open visit, wrong visit, wrong subject, wrong world, visit-id reuse", async () => {
      const a = await subject()
      const b = await subject()
      await failsWith(recordConfirmedDeparture(cred, ev(a, randomUUID())), "NO_OPEN_VISIT")
      const visit = randomUUID()
      await recordConfirmedArrival(cred, ev(a, visit))
      await failsWith(recordConfirmedArrival(cred, ev(a, randomUUID())), "VISIT_ALREADY_OPEN")
      await failsWith(recordConfirmedArrival(cred, ev(a, visit)), "VISIT_ALREADY_OPEN")
      await failsWith(recordConfirmedDeparture(cred, ev(a, randomUUID(), { worldTick: 1 })), "VISIT_MISMATCH")
      await failsWith(recordConfirmedDeparture(cred, ev(b, visit, { worldTick: 1 })), "NO_OPEN_VISIT")
      const bVisit = randomUUID()
      await recordConfirmedArrival(cred, ev(b, bVisit))
      await failsWith(recordConfirmedDeparture(cred, ev(b, visit, { worldTick: 1 })), "VISIT_MISMATCH")
      await failsWith(recordConfirmedDeparture(cred, ev(a, visit, { worldId: "another-world", worldTick: 1 })), "WORLD_NOT_ALLOWED")
      await recordConfirmedDeparture(cred, ev(a, visit, { worldTick: 1 }))
      await failsWith(recordConfirmedDeparture(cred, ev(a, visit, { worldTick: 2 })), "NO_OPEN_VISIT")
      await failsWith(recordConfirmedArrival(cred, ev(a, visit, { worldTick: 2 })), "VISIT_ID_REUSED")
      await failsWith(recordConfirmedArrival(cred, ev(a, randomUUID(), { worldTick: 0 })), "TICK_REGRESSION")
      assert.equal((await row(a)).visit_count, 1)
      assert.equal((await row(a)).visit_open, false)
      assert.equal((await row(b)).open_visit_id, bVisit)
      // A genuine second visit is counted exactly once.
      const second = await recordConfirmedArrival(cred, ev(a, randomUUID(), { worldTick: 3 }))
      assert.equal(second.visitCount, 2)
    })

    test("authority, world allowlist, subject and trusted-time guards fail closed", async () => {
      const a = await subject()
      await failsWith(recordConfirmedArrival(cred, ev(a, randomUUID(), { worldId: "not-allowlisted" })), "WORLD_NOT_ALLOWED")
      await failsWith(recordConfirmedArrival(cred, ev(a, randomUUID(), { authorityId: "worldk-web" })), "AUTHORITY_INVALID")
      await failsWith(recordConfirmedArrival(cred, ev(a, randomUUID(), { authorityKind: "RUNTIME" })), "AUTHORITY_INVALID")
      await failsWith(recordConfirmedArrival(cred, ev(randomUUID(), randomUUID())), "SUBJECT_INVALID")
      await failsWith(recordConfirmedArrival(cred, ev(a, randomUUID(), { occurredAt: new Date(Date.now() - 16 * 60_000).toISOString() })), "TIME_OUT_OF_BOUNDS")
      await failsWith(recordConfirmedArrival(cred, ev(a, randomUUID(), { occurredAt: new Date(Date.now() + 2 * 60_000).toISOString() })), "TIME_OUT_OF_BOUNDS")
      await failsWith(recordConfirmedArrival(cred, ev(a, randomUUID(), { occurredAt: "2020-01-01T00:00:00.000Z" })), "TIME_OUT_OF_BOUNDS")
      await failsWith(recordConfirmedArrival(cred, ev(a, randomUUID(), { worldTick: -1 })), "INVALID_TICK")
      assert.equal(await row(a), undefined)
      assert.equal((await events(a)).length, 0)
      // Inside the window (14 minutes ago) is accepted.
      const ok = await recordConfirmedArrival(cred, ev(a, randomUUID(), { occurredAt: new Date(Date.now() - 14 * 60_000).toISOString() }))
      assert.equal(ok.outcome, "APPLIED")
    })

    test("concurrency: racing duplicate and racing double arrivals yield exactly one visit", async () => {
      const a = await subject()
      const e = ev(a, randomUUID())
      const c2 = await connect(at(dbName, LIFECYCLE_CREDENTIAL_ROLE, CRED_PW))
      const same = await Promise.all([recordConfirmedArrival(cred, e), recordConfirmedArrival(c2, e)])
      assert.deepEqual(same.map((r) => r.outcome).sort(), ["APPLIED", "IDEMPOTENT_REPLAY"])
      const b = await subject()
      const racing = await Promise.allSettled([recordConfirmedArrival(cred, ev(b, randomUUID())), recordConfirmedArrival(c2, ev(b, randomUUID()))])
      assert.equal(racing.filter((r) => r.status === "fulfilled").length, 1)
      const rejected = racing.find((r) => r.status === "rejected") as PromiseRejectedResult
      assert.equal((rejected.reason as LifecycleFailure).code, "VISIT_ALREADY_OPEN")
      assert.equal((await row(a)).visit_count, 1)
      assert.equal((await row(b)).visit_count, 1)
    })

    // ── negative matrix: everyone else ───────────────────────────

    test("anon, authenticated visitor, and service_role cannot execute any lifecycle writer", async () => {
      const a = await subject()
      for (const role of ["anon", "authenticated", "service_role"]) {
        for (const fn of V2) {
          await assert.rejects(asRole(role, v2Call(fn), [randomUUID(), a, randomUUID()], a), /permission denied/, `${role} ${fn}`)
        }
        await assert.rejects(asRole(role, "SELECT * FROM record_world_confirmed_entry('living-forest', $1, now(), 0, NULL)", [a], a), /permission denied/)
        await assert.rejects(asRole(role, "SELECT * FROM record_world_leave('living-forest', $1, now(), 0, NULL)", [a], a), /permission denied/)
      }
      // Visitor A attempting to write visitor B's continuity through any path.
      const b = await subject()
      await assert.rejects(asRole("authenticated", v2Call(V2[0]!), [randomUUID(), b, randomUUID()], a), /permission denied/)
      await assert.rejects(asRole("authenticated", "INSERT INTO world_visitor_continuity (world_id, subject_id, visit_count, first_entered_at, last_entered_at, last_entered_tick, visit_open, last_seen_at, last_seen_tick, last_seen_basis) VALUES ('living-forest', $1, 1, now(), now(), 0, true, now(), 0, 'ENTRY_CONFIRMED')", [b], a), /permission denied/)
      await assert.rejects(asRole("authenticated", "TRUNCATE world_visitor_continuity", [], a), /permission denied/)
      await assert.rejects(asRole("anon", "TRUNCATE world_visitor_continuity"), /permission denied/)
      await assert.rejects(asRole("service_role", "UPDATE world_visitor_continuity SET visit_count = 99"), /permission denied/)
      await assert.rejects(asRole("service_role", "INSERT INTO world_visitor_lifecycle_events (event_id) VALUES (gen_random_uuid())"), /permission denied/)
      assert.equal(await row(b), undefined)
    })

    test("the function OWNER (Supabase postgres / SQL editor) is refused by the session-authority check", async () => {
      const a = await subject()
      await assert.rejects(owner.query(v2Call(V2[0]!), [randomUUID(), a, randomUUID()]), /AUTHORITY_INVALID/)
      assert.equal(await row(a), undefined)
    })

    test("RLS read path: an authenticated visitor reads only their own continuity row", async () => {
      const a = await subject()
      const b = await subject()
      await recordConfirmedArrival(cred, ev(a, randomUUID()))
      await recordConfirmedArrival(cred, ev(b, randomUUID()))
      const seen = (await asRole("authenticated", "SELECT subject_id FROM world_visitor_continuity", [], a)).rows.map((r) => r.subject_id)
      assert.deepEqual(seen, [a])
      assert.deepEqual((await asRole("authenticated", "SELECT subject_id FROM world_visitor_continuity WHERE subject_id = $1", [b], a)).rows, [])
      // anon holds no privilege at all on continuity (039 revoked Supabase's default grants).
      await assert.rejects(asRole("anon", "SELECT subject_id FROM world_visitor_continuity"), /permission denied/)
    })

    test("writer role: no arbitrary SQL, no table reads/writes, no world-state mutation, no DDL", async () => {
      const attempts = [
        "SELECT * FROM world_visitor_continuity",
        "UPDATE world_visitor_continuity SET visit_count = 99",
        "DELETE FROM world_visitor_continuity",
        "TRUNCATE world_visitor_continuity",
        "SELECT * FROM world_visitor_lifecycle_events",
        "INSERT INTO world_lifecycle_authorities VALUES ('another-world', 'x', 'PREVIEW_AUTHORITY_SIMULATION')",
        "UPDATE world_state_probe SET tick = 7",
        "SELECT * FROM world_state_probe",
        "SELECT * FROM auth.users",
        "CREATE TABLE lifecycle_escape (x int)",
        "SELECT * FROM record_world_confirmed_entry('living-forest', gen_random_uuid(), now(), 0, NULL)",
        "SELECT world_lifecycle_replay(gen_random_uuid(), 'CONFIRMED_ARRIVAL', 'living-forest', gen_random_uuid(), gen_random_uuid(), now(), 0, NULL, 'x', 'y', '{}')",
        "SET ROLE service_role",
        "ALTER ROLE worldk_lifecycle_authority BYPASSRLS",
      ]
      for (const sql of attempts) {
        await cred.query("BEGIN")
        await cred.query("SET LOCAL ROLE worldk_lifecycle_authority")
        await assert.rejects(cred.query(sql), /permission denied|must be|insufficient privilege/i, sql)
        await cred.query("ROLLBACK")
      }
      // Bare credential (no SET ROLE) is equally powerless.
      for (const sql of attempts.slice(0, 10)) await assert.rejects(cred.query(sql), /permission denied/i, `bare: ${sql}`)
      assert.equal((await su.query("SELECT tick FROM world_state_probe")).rows[0].tick, 6)
    })

    test("v2 writers write only continuity + the lifecycle log (never world state)", () => {
      const sql = migration("039_world_visitor_lifecycle_authority.sql")
      const bodies = [...sql.matchAll(/CREATE OR REPLACE FUNCTION (record_world_lifecycle_\w+|world_lifecycle_\w+)\([\s\S]*?AS \$\$([\s\S]*?)\$\$;/g)]
      assert.equal(bodies.length, 5)
      for (const [, name, body] of bodies) {
        const written = [...body!.matchAll(/\b(?:INSERT INTO|UPDATE|DELETE FROM)\s+([a-z_.]+)/gi)].map((m) => m[1]!)
        for (const t of written) assert.ok(["world_visitor_continuity", "world_visitor_lifecycle_events"].includes(t), `${name} writes ${t}`)
      }
    })

    test("the lifecycle log is append-only, even for the table owner", async () => {
      const a = await subject()
      await recordConfirmedArrival(cred, ev(a, randomUUID()))
      await assert.rejects(owner.query("UPDATE world_visitor_lifecycle_events SET world_tick = 9 WHERE subject_id = $1", [a]), /append-only/)
      await assert.rejects(owner.query("DELETE FROM world_visitor_lifecycle_events WHERE subject_id = $1", [a]), /append-only/)
      await assert.rejects(owner.query("TRUNCATE world_visitor_lifecycle_events"), /append-only/)
      assert.equal((await events(a)).length, 1)
    })

    test("re-applying 039 is harmless and keeps continuity and the log", async () => {
      const a = await subject()
      await recordConfirmedArrival(cred, ev(a, randomUUID()))
      await owner.query(migration("039_world_visitor_lifecycle_authority.sql"))
      assert.equal((await row(a)).visit_count, 1)
      assert.equal((await events(a)).length, 1)
    })

    // ── credential lifecycle (last: revokes the credential) ──────

    test("wrong credential and revoked credential are denied", async () => {
      await assert.rejects(connect(at(dbName, LIFECYCLE_CREDENTIAL_ROLE, "wrong-password")), /password authentication failed/)
      await owner.query(`ALTER ROLE ${LIFECYCLE_CREDENTIAL_ROLE} NOLOGIN PASSWORD NULL`)
      await assert.rejects(connect(at(dbName, LIFECYCLE_CREDENTIAL_ROLE, CRED_PW)), /password authentication failed|not permitted to log in/)
      // Rotation: a new secret re-enables it; the old one stays dead.
      await owner.query(`ALTER ROLE ${LIFECYCLE_CREDENTIAL_ROLE} LOGIN PASSWORD 'm13-rotated-local-only'`)
      await assert.rejects(connect(at(dbName, LIFECYCLE_CREDENTIAL_ROLE, CRED_PW)), /password authentication failed/)
      const rotated = await connect(at(dbName, LIFECYCLE_CREDENTIAL_ROLE, "m13-rotated-local-only"))
      const a = await subject()
      assert.equal((await recordConfirmedArrival(rotated, ev(a, randomUUID()))).outcome, "APPLIED")
      await owner.query(`ALTER ROLE ${LIFECYCLE_CREDENTIAL_ROLE} NOLOGIN PASSWORD NULL`)
    })
  })
}
