// WORLDK-M13: the deployed read path end to end on a disposable stack —
// supabase-js -> PostgREST -> Postgres RLS (037/039) — with continuity
// written ONLY through the Preview Lifecycle Harness credential.
//
// Opt-in (skipped visibly otherwise):
//   WORLD_CONSUMER_TEST_DATABASE_URL      superuser URL of a DISPOSABLE local server
//   WORLD_CONSUMER_TEST_POSTGREST_URL     PostgREST serving database `m13_rest` on that server,
//                                         connecting as `authenticator` (anon role `anon`)
//   WORLD_CONSUMER_TEST_POSTGREST_JWT_SECRET  that PostgREST's JWT secret
import { after, before, describe, test } from "node:test"
import assert from "node:assert/strict"
import { createHmac, randomUUID } from "node:crypto"
import http from "node:http"
import type { AddressInfo } from "node:net"
import pg from "pg"
import { createClient } from "@supabase/supabase-js"
import { getVisitorWorldProjection } from "./service.ts"
import { ContinuityReadUnavailableError, SessionRlsContinuityReader, type SessionContinuityClient } from "./sessionContinuity.ts"
import { runLivingForestFixtureTimeline } from "./facts.ts"
import { depsFor, factSourceOf } from "./testing/scenarios.ts"
import { LIFECYCLE_CREDENTIAL_ROLE, previewProvenance, recordConfirmedArrival, recordConfirmedDeparture } from "./testing/previewLifecycleHarness.ts"
import { createSupabaseShapedDb, urlFor } from "./testing/supabaseShapedDb.ts"

const dbUrl = process.env.WORLD_CONSUMER_TEST_DATABASE_URL
const restUrl = process.env.WORLD_CONSUMER_TEST_POSTGREST_URL
const secret = process.env.WORLD_CONSUMER_TEST_POSTGREST_JWT_SECRET
const DB = "m13_rest"
const CRED_PW = "m13-credential-local-only"

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url")
function jwt(claims: Record<string, unknown>) {
  const head = b64({ alg: "HS256", typ: "JWT" })
  const body = b64({ exp: Math.floor(Date.now() / 1000) + 600, ...claims })
  return `${head}.${body}.${createHmac("sha256", secret!).update(`${head}.${body}`).digest("base64url")}`
}

if (!dbUrl || !restUrl || !secret) {
  test("session RLS continuity via PostgREST (skipped: disposable PostgREST stack not configured)", { skip: true }, () => {})
} else {
  let su: pg.Client
  let owner: pg.Client
  let cred: pg.Client
  let proxy: http.Server
  let supabaseUrl = ""
  const A = randomUUID()
  const B = randomUUID()
  const visitA = randomUUID()

  // supabase-js addresses `${url}/rest/v1/...`; map that prefix onto bare PostgREST.
  const startProxy = () =>
    new Promise<void>((resolve) => {
      proxy = http.createServer((req, res) => {
        const target = new URL(restUrl!)
        const upstream = http.request(
          { host: target.hostname, port: target.port, path: (req.url ?? "/").replace(/^\/rest\/v1/, ""), method: req.method, headers: { ...req.headers, host: target.host } },
          (up) => {
            res.writeHead(up.statusCode ?? 502, up.headers)
            up.pipe(res)
          },
        )
        req.pipe(upstream)
      })
      proxy.listen(0, "127.0.0.1", () => {
        supabaseUrl = `http://127.0.0.1:${(proxy.address() as AddressInfo).port}`
        resolve()
      })
    })

  const anonKey = () => jwt({ role: "anon" })
  const as = (claims: Record<string, unknown> | null) =>
    createClient(supabaseUrl, anonKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: claims ? { headers: { Authorization: `Bearer ${jwt(claims)}` } } : {},
    })
  const visitor = (sub: string) => as({ role: "authenticated", sub, aud: "authenticated" })
  const reader = (client: ReturnType<typeof as>) => new SessionRlsContinuityReader(async () => client as unknown as SessionContinuityClient)
  const v2Args = (subjectId: string) => ({
    p_event_id: randomUUID(), p_world_id: "living-forest", p_subject_id: subjectId, p_visit_id: randomUUID(), p_occurred_at: new Date().toISOString(),
    p_world_tick: 0, p_place_id: null, p_authority_kind: "PREVIEW_AUTHORITY_SIMULATION", p_authority_id: "worldk-m13-preview-lifecycle-harness", p_provenance: {},
  })

  /** A genuine Postgres privilege refusal (42501), never a transport or schema-cache error. */
  const denied = (r: { error: { code?: string } | null }, what = "") => assert.equal(r.error?.code, "42501", `${what} must be refused with 42501`)

  describe("session RLS continuity through PostgREST (disposable stack)", () => {
    before(async () => {
      ;({ su, owner } = await createSupabaseShapedDb(dbUrl, DB))
      await su.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN CREATE ROLE authenticator LOGIN NOINHERIT; END IF;
        END $$;
        GRANT anon, authenticated, service_role TO authenticator;
      `)
      await su.query("INSERT INTO auth.users (id) VALUES ($1), ($2)", [A, B])
      await owner.query(`ALTER ROLE ${LIFECYCLE_CREDENTIAL_ROLE} LOGIN PASSWORD '${CRED_PW}'`)
      cred = new pg.Client({ connectionString: urlFor(dbUrl, DB, LIFECYCLE_CREDENTIAL_ROLE, CRED_PW) })
      await cred.connect()
      const t0 = Date.now()
      await recordConfirmedArrival(cred, { eventId: randomUUID(), worldId: "living-forest", subjectId: A, visitId: visitA, occurredAt: new Date(t0 - 60_000).toISOString(), worldTick: 0, placeId: "forest-clearing", provenance: previewProvenance() })
      await recordConfirmedDeparture(cred, { eventId: randomUUID(), worldId: "living-forest", subjectId: A, visitId: visitA, occurredAt: new Date(t0 - 30_000).toISOString(), worldTick: 1, placeId: "forest-clearing", provenance: previewProvenance() })
      await recordConfirmedArrival(cred, { eventId: randomUUID(), worldId: "living-forest", subjectId: B, visitId: randomUUID(), occurredAt: new Date(t0).toISOString(), worldTick: 0, placeId: null, provenance: previewProvenance() })
      await startProxy()
      // PostgREST reconnects after the database was recreated; reload its schema cache and wait.
      for (let i = 0; i < 40; i++) {
        await su.query("NOTIFY pgrst, 'reload schema'").catch(() => {})
        const { error } = await visitor(A).from("world_visitor_continuity").select("world_id").limit(1)
        if (!error) break
        await new Promise((r) => setTimeout(r, 250))
      }
    })

    after(async () => {
      await new Promise((r) => proxy?.close(r))
      for (const c of [cred, owner, su]) await c?.end().catch(() => {})
    })

    test("visitor A reads A's durable continuity through their own session", async () => {
      const r = await reader(visitor(A)).get("living-forest", A)
      assert.equal(r!.visitCount, 1)
      assert.equal(r!.visitOpen, false)
      assert.equal(r!.lastSeenTick, 1)
      assert.equal(r!.lastSeenBasis, "LEAVE_RECORDED")
    })

    test("visitor A cannot read B's row (RLS) — it is simply absent", async () => {
      assert.equal(await reader(visitor(A)).get("living-forest", B), null)
      const { data } = await visitor(A).from("world_visitor_continuity").select("subject_id")
      assert.deepEqual(data, [{ subject_id: A }])
    })

    test("anon cannot read continuity at all -> unavailable, never a fallback", async () => {
      await assert.rejects(reader(as(null)).get("living-forest", A), ContinuityReadUnavailableError)
    })

    test("REST write paths are closed for anon, visitor and service_role", async () => {
      for (const client of [as(null), visitor(A), as({ role: "service_role" })]) {
        for (const fn of ["record_world_lifecycle_arrival_v2", "record_world_lifecycle_departure_v2"]) {
          denied(await client.rpc(fn, v2Args(A)), fn)
        }
        denied(await client.rpc("record_world_confirmed_entry", { p_world_id: "living-forest", p_subject_id: A, p_at: new Date().toISOString(), p_world_tick: 5, p_place_id: null }))
        denied(await client.rpc("record_world_leave", { p_world_id: "living-forest", p_subject_id: A, p_at: new Date().toISOString(), p_world_tick: 5, p_place_id: null }))
        denied(await client.from("world_visitor_continuity").update({ visit_count: 99 }).eq("subject_id", A).select())
        denied(await client.from("world_visitor_continuity").delete().eq("subject_id", A).select())
        denied(await client.from("world_visitor_continuity").insert({ world_id: "living-forest", subject_id: B, visit_count: 1 }).select())
        denied(await client.from("world_visitor_lifecycle_events").select("*"))
        denied(await client.from("world_lifecycle_authorities").select("*"))
      }
      // Visitor A attempting to write B via rpc.
      denied(await visitor(A).rpc("record_world_lifecycle_arrival_v2", v2Args(B)))
      const { rows } = await su.query("SELECT subject_id, visit_count, last_seen_tick FROM world_visitor_continuity ORDER BY subject_id")
      assert.deepEqual(rows.find((r) => r.subject_id === A), { subject_id: A, visit_count: 1, last_seen_tick: 1 })
    })

    test("fresh projection over the durable read: returning visitor + Since You Were Here", async () => {
      const observedAt = new Date().toISOString()
      const facts = (await runLivingForestFixtureTimeline(observedAt)).facts
      const deps = { ...(await depsFor({ facts, now: new Date(Date.parse(observedAt) + 5_000) })), facts: factSourceOf(facts), ledger: reader(visitor(A)) }
      const v = await getVisitorWorldProjection("living-forest", { subjectId: A }, deps)
      assert.equal(v.status, "OK")
      assert.equal(v.subjectId, A)
      assert.equal(v.projection!.relationship.state, "VISITED")
      assert.equal(v.projection!.returnContext.arrivalKind, "RETURNING")
      assert.equal(v.projection!.sinceYouWereHere.state, "CHANGES")
      assert.equal(v.projection!.sinceYouWereHere.interval!.since.worldTick, 1)
      assert.equal(v.projection!.sinceYouWereHere.interval!.through.worldTick, 6)
      // Visitor B (visit still open, no leave) is a different relationship entirely.
      const vb = await getVisitorWorldProjection("living-forest", { subjectId: B }, { ...deps, ledger: reader(visitor(B)) })
      assert.equal(vb.projection!.relationship.visitCount, 1)
      assert.notEqual(vb.projection!.relationship.lastSeen!.basis, "LEAVE_RECORDED")
    })
  })
}
