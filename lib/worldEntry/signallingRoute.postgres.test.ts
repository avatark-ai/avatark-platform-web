// WORLDK-M14-B5 real-Postgres suite: migration 045 (signalling route authority).
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
import { createLivingForestFixtureFactSource } from "../worldConsumer/facts.ts"
import type { ContinuityRecord, VisitorContinuityLedger } from "../worldConsumer/continuityLedger.ts"
import { assertLocalUrl, createSupabaseShapedDb, OWNER, urlFor } from "../worldConsumer/testing/supabaseShapedDb.ts"
import { EntryAuthorityError, ENTRY_AUTHORITY_ROLE, PgEntryAuthorityDb } from "./authorityDb.ts"
import { newRuntimeCredential, newSecret, sha256 } from "./credentials.ts"
import { handleHandoff, SESSION_COOKIE } from "./gateway.ts"
import { ReferenceRuntime, type IngressTransport } from "./referenceRuntime.ts"
import { handleWorldEntryRequest, HANDOFF_PATH_PREFIX } from "./resolver.ts"
import { handleRuntimeIngress } from "./runtimeIngress.ts"
import { handleSignallingRoute, streamRouteKey } from "./signallingRoute.ts"
import { handleStreamAuthorize, handleStreamCapabilityIssue, STREAM_AUTHORIZE_PATH, STREAM_CAPABILITY_PATH } from "./streamCapability.ts"
import { scramVerifier } from "../../scripts/worldk-m14-runtime-registry.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const url = process.env.WORLD_CONSUMER_TEST_DATABASE_URL
const PLATFORM_PW = "m14-platform-credential-local-only"
const WORLD = "living-forest"
const ORIGIN = "https://platform-preview.avatark.ai"
const mig = (f: string) => readFileSync(path.join(here, "../../supabase/migrations", f), "utf8")

if (!url) {
  test("045 signalling route (skipped: WORLD_CONSUMER_TEST_DATABASE_URL not set)", { skip: true }, () => {})
} else {
  assertLocalUrl(url)
  const dbName = `m14b5_route_${Date.now()}`
  let su: pg.Client, owner: pg.Client, db: PgEntryAuthorityDb, rt: ReferenceRuntime
  const facts = createLivingForestFixtureFactSource()
  const ledger: VisitorContinuityLedger = {
    async get(worldId, subjectId): Promise<ContinuityRecord | null> {
      const r = (await su.query("SELECT * FROM world_visitor_continuity WHERE world_id = $1 AND subject_id = $2", [worldId, subjectId])).rows[0]
      return r ? ({ worldId, subjectId, visitCount: r.visit_count, lastPlaceId: r.last_place_id } as ContinuityRecord) : null
    },
    recordConfirmedEntry: () => Promise.reject(new Error("read-only")),
    recordLeave: () => Promise.reject(new Error("read-only")),
  }
  const claimed = async () => {
    const subject = randomUUID()
    await su.query("INSERT INTO auth.users (id) VALUES ($1)", [subject])
    await rt.poll()
    const res = await handleWorldEntryRequest(new Request(`${ORIGIN}/api/worlds/${WORLD}/entry`, { method: "POST", body: JSON.stringify({
      schemaVersion: "1.0", contract: "world-entry-intent", intentId: randomUUID(), worldId: WORLD, requestedPlaceId: null, narrativeContext: null,
      client: { surface: "WEB", capabilities: { webgl2: true, touchPrimary: false, viewportClass: "EXPANDED", reducedMotion: false } },
    }) }), WORLD, async () => ({ subjectId: subject }), { mode: "FIXTURE_PREVIEW", ledger, db, handoffOrigin: ORIGIN })
    const entry = JSON.parse(await res.text()) as WorldEntryResult
    const h = await handleHandoff(entry.handoff!.href.slice(`${ORIGIN}${HANDOFF_PATH_PREFIX}`.length), { db })
    const cookie = h.headers.get("set-cookie")!.match(new RegExp(`${SESSION_COOKIE}=([A-Za-z0-9_-]{43})`))![1]
    await rt.step()
    const sess = (await su.query("SELECT * FROM world_runtime_sessions WHERE view_sha256 = $1", [sha256(cookie)])).rows[0]
    return { subject, cookie, sessionId: sess.session_id as string }
  }
  const authorize = async (cookie: string) => {
    const hdr = { origin: ORIGIN, "sec-fetch-site": "same-origin", "content-type": "application/json", cookie: `${SESSION_COOKIE}=${cookie}` }
    const i = await handleStreamCapabilityIssue(new Request(`${ORIGIN}${STREAM_CAPABILITY_PATH}`, { method: "POST", headers: hdr, body: "{}" }), { db })
    const c = (await i.json()) as { capability: string }
    const a = await handleStreamAuthorize(new Request(`${ORIGIN}${STREAM_AUTHORIZE_PATH}`, { method: "POST", headers: hdr, body: JSON.stringify({ capability: c.capability, worldId: WORLD }) }), { db })
    return ((await a.json()) as { authorization: string }).authorization
  }
  const route = (authz: string) => db.signallingRoute(sha256(authz)).then((r) => r, (e: EntryAuthorityError) => e.code)
  const digest = async () => {
    const tables = (await su.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`)).rows.map((r) => r.tablename as string)
    const out: Record<string, string> = {}
    for (const t of tables) out[t] = (await su.query(`SELECT md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) d FROM ${pg.escapeIdentifier(t)} x`)).rows[0].d
    return out
  }

  describe("migration 045 — signalling route authority (real Postgres)", () => {
    before(async () => {
      ;({ su, owner } = await createSupabaseShapedDb(url, dbName, { through040: true }))
      for (const f of ["043_world_stream_capability_authority.sql", "044_world_stream_attachment_authority.sql", "045_world_stream_signalling_route.sql"]) await owner.query(mig(f))
      await owner.query(`ALTER ROLE worldk_platform_entry_preview LOGIN PASSWORD '${scramVerifier(PLATFORM_PW)}'`)
      db = new PgEntryAuthorityDb(urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW), { allowLocal: true, ssl: false })
      const instanceId = randomUUID()
      const cred = newRuntimeCredential()
      await owner.query("SELECT world_runtime_register_instance($1, $2, $3, $4)", [instanceId, WORLD, "m14b5-route", 32])
      await owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [cred.credentialId, instanceId, cred.sha256, 3600])
      const post: IngressTransport["post"] = async (op, b) => {
        const res = await handleRuntimeIngress(new Request(`${ORIGIN}/api/runtime/v1/${op}`, { method: "POST", headers: { authorization: `Bearer ${cred.bearer}`, "content-type": "application/json" }, body: JSON.stringify(b) }), op, { db, mode: "FIXTURE_PREVIEW", facts })
        return { status: res.status, body: (await res.json()) as Record<string, unknown> }
      }
      rt = new ReferenceRuntime({ post }, { autoJoin: false })
    })
    after(async () => {
      await db?.end()
      await owner?.end()
      await su?.end()
    })

    test("route key parity: SQL world_m14b5_route_key == TS streamRouteKey; admission (attached=false) then offer gate (attached=true)", async () => {
      const c = await claimed()
      const authz = await authorize(c.cookie)
      const sqlKey = (await su.query("SELECT world_m14b5_route_key($1) k", [c.sessionId])).rows[0].k
      assert.equal(sqlKey, streamRouteKey(c.sessionId))
      const before = await digest()
      assert.deepEqual(await route(authz), { routeKey: streamRouteKey(c.sessionId), attached: false })
      assert.deepEqual(await digest(), before, "read-only")
      assert.equal(await rt.attachStream(c.sessionId, authz), "ATTACHED")
      assert.deepEqual(await route(authz), { routeKey: streamRouteKey(c.sessionId), attached: true })
      // after attach the 60 s window no longer matters for the offer gate
      await su.query("UPDATE world_stream_capabilities SET issued_at = issued_at - interval '61 seconds', expires_at = expires_at - interval '61 seconds', consumed_at = consumed_at - interval '61 seconds' WHERE authorization_sha256 = $1", [sha256(authz)])
      await su.query("UPDATE world_stream_attachments SET attached_at = attached_at - interval '61 seconds', attach_window_ends_at = attach_window_ends_at - interval '61 seconds' WHERE authorization_sha256 = $1", [sha256(authz)])
      assert.deepEqual(await route(authz), { routeKey: streamRouteKey(c.sessionId), attached: true })
    })

    test("refusals: forged, raw capability, unredeemed, expired window, second authorization for an attached session, ended/leaving session", async () => {
      const codes: Record<string, unknown> = {}
      codes.forged = await route(newSecret())
      const c = await claimed()
      const hdr = { origin: ORIGIN, "sec-fetch-site": "same-origin", "content-type": "application/json", cookie: `${SESSION_COOKIE}=${c.cookie}` }
      const i = await handleStreamCapabilityIssue(new Request(`${ORIGIN}${STREAM_CAPABILITY_PATH}`, { method: "POST", headers: hdr, body: "{}" }), { db })
      const rawCap = ((await i.json()) as { capability: string }).capability
      codes.rawCapability = await route(rawCap)
      const expired = await authorize(c.cookie)
      await su.query("UPDATE world_stream_capabilities SET issued_at = issued_at - interval '61 seconds', expires_at = expires_at - interval '61 seconds', consumed_at = consumed_at - interval '61 seconds' WHERE authorization_sha256 = $1", [sha256(expired)])
      codes.expiredWindow = await route(expired)
      const a1 = await authorize(c.cookie)
      const a2 = await authorize(c.cookie)
      await rt.attachStream(c.sessionId, a1)
      codes.secondAuthorizationSameSession = await route(a2)
      const d = await claimed()
      const ad = await authorize(d.cookie)
      await rt.disconnect(d.sessionId)
      codes.endedSession = await route(ad)
      await assert.rejects(db.signallingRoute(Buffer.alloc(31)), (e: EntryAuthorityError) => e.code === "STREAM_AUTHORIZATION_INVALID")
      assert.deepEqual(codes, {
        forged: "STREAM_AUTHORIZATION_INVALID", rawCapability: "STREAM_AUTHORIZATION_INVALID", expiredWindow: "STREAM_ATTACH_WINDOW_EXPIRED",
        secondAuthorizationSameSession: "STREAM_ALREADY_ATTACHED", endedSession: "STREAM_SESSION_NOT_ELIGIBLE",
      })
      // through the HTTP endpoint every one of these is the same 404
      const key = newSecret()
      for (const a of [newSecret(), expired, a2, ad]) {
        const r = await handleSignallingRoute(new Request(`${ORIGIN}/api/signalling/v1/route`, { method: "POST", headers: { authorization: `Bearer ${key}` }, body: JSON.stringify({ authorizationSha256: sha256(a).toString("hex") }) }), { db, configuredKey: key })
        assert.deepEqual([r.status, await r.json()], [404, { error: "NOT_ROUTABLE" }])
      }
    })

    test("privileges (038 lesson): only the Platform authority role may EXECUTE the resolver; the key helper is unexecutable; no table was added", async () => {
      const fns = ["world_stream_signalling_route(bytea)", "world_m14b5_route_key(uuid)"]
      const matrix: Record<string, Record<string, boolean>> = {}
      for (const role of ["anon", "authenticated", "service_role", ENTRY_AUTHORITY_ROLE, "worldk_platform_entry_preview"]) {
        matrix[role] = {}
        for (const f of fns) matrix[role][f] = (await su.query("SELECT has_function_privilege($1, $2, 'EXECUTE') ok", [role, f])).rows[0].ok
      }
      for (const role of ["anon", "authenticated", "service_role", "worldk_platform_entry_preview"]) for (const f of fns) assert.equal(matrix[role][f], false, `${role} ${f}`)
      assert.equal(matrix[ENTRY_AUTHORITY_ROLE][fns[0]], true)
      assert.equal(matrix[ENTRY_AUTHORITY_ROLE][fns[1]], false)
      const pub = (await su.query(`SELECT p.proname, EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE') pub, p.prosecdef, p.proconfig, p.provolatile FROM pg_proc p WHERE p.proname IN ('world_stream_signalling_route','world_m14b5_route_key')`)).rows
      for (const r of pub) {
        assert.equal(r.pub, false, r.proname)
        assert.equal(r.prosecdef, true, r.proname)
        assert.deepEqual(r.proconfig, ["search_path=pg_catalog, public"], r.proname)
      }
      assert.equal(pub.find((r) => r.proname === "world_stream_signalling_route")!.provolatile, "s", "STABLE (read-only)")
      await assert.rejects(owner.query("SELECT * FROM world_stream_signalling_route($1)", [sha256("x")]), /AUTHORITY_INVALID/)
      const src = mig("045_world_stream_signalling_route.sql").replace(/--.*$/gm, "")
      assert.doesNotMatch(src, /\b(INSERT INTO|UPDATE|DELETE FROM|TRUNCATE|CREATE TABLE|ALTER TABLE)\b/, "045 writes nothing and adds no table")
      assert.equal((await su.query(`SELECT count(*)::int n FROM information_schema.role_routine_grants WHERE routine_name = 'world_stream_signalling_route' AND grantee <> '${OWNER}'`)).rows[0].n, 1)
    })
  })
}
