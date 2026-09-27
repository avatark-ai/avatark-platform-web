// WORLDK-M14-B6 certification suite: renderer world-state read authority (046)
// against real Postgres (037..046 as the non-superuser owner, Supabase-shaped
// default privileges), the real Runtime Ingress `snapshot` op, the reference
// runtime, and the real deterministic Living Forest fixture fact source.
//
// Requires WORLD_CONSUMER_TEST_DATABASE_URL (superuser URL, DISPOSABLE local
// server). Skipped visibly when unset.
import { after, before, describe, test } from "node:test"
import assert from "node:assert/strict"
import { createHash, randomUUID } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"
import Ajv from "ajv"
import addFormats from "ajv-formats"
import type { WorldEntryResult } from "@avatark/world-consumer-contracts"
import { createLivingForestFixtureFactSource } from "../worldConsumer/facts.ts"
import type { ContinuityRecord, VisitorContinuityLedger } from "../worldConsumer/continuityLedger.ts"
import { assertLocalUrl, createSupabaseShapedDb, OWNER, urlFor } from "../worldConsumer/testing/supabaseShapedDb.ts"
import { EntryAuthorityError, ENTRY_AUTHORITY_ROLE, PgEntryAuthorityDb } from "../worldEntry/authorityDb.ts"
import { newRuntimeCredential, newSecret, sha256 } from "../worldEntry/credentials.ts"
import { handleHandoff, handleLeave, SESSION_COOKIE } from "../worldEntry/gateway.ts"
import { ReferenceRuntime, type IngressTransport } from "../worldEntry/referenceRuntime.ts"
import { createRendererSnapshotPort, rendererForbiddenFieldsIn, type RendererSessionSnapshot } from "./rendererSessionSnapshot.ts"
import { handleWorldEntryRequest, HANDOFF_PATH_PREFIX } from "../worldEntry/resolver.ts"
import { handleRuntimeIngress } from "../worldEntry/runtimeIngress.ts"
import { handleStreamAuthorize, handleStreamCapabilityIssue, STREAM_AUTHORIZE_PATH, STREAM_CAPABILITY_PATH } from "../worldEntry/streamCapability.ts"
import { scramVerifier } from "../../scripts/worldk-m14-runtime-registry.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const url = process.env.WORLD_CONSUMER_TEST_DATABASE_URL
const PLATFORM_PW = "m14-platform-credential-local-only"
const WORLD = "living-forest"
const ORIGIN = "https://platform-preview.avatark.ai"
const mig = (f: string) => readFileSync(path.join(here, "../../supabase/migrations", f), "utf8")
const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)
const validate = ajv.compile(JSON.parse(readFileSync(path.join(here, "schemas/renderer-session-snapshot.schema.json"), "utf8")))

if (!url) {
  test("046 renderer snapshot authority (skipped: WORLD_CONSUMER_TEST_DATABASE_URL not set)", { skip: true }, () => {})
} else {
  assertLocalUrl(url)
  const dbName = `m14b6_${Date.now()}`
  let su: pg.Client, owner: pg.Client, db: PgEntryAuthorityDb
  const facts = createLivingForestFixtureFactSource()
  const evidence: Record<string, unknown> = {}
  const ledger: VisitorContinuityLedger = {
    async get(worldId, subjectId): Promise<ContinuityRecord | null> {
      const r = (await su.query("SELECT * FROM world_visitor_continuity WHERE world_id = $1 AND subject_id = $2", [worldId, subjectId])).rows[0]
      return r ? ({ worldId, subjectId, visitCount: r.visit_count, lastPlaceId: r.last_place_id } as ContinuityRecord) : null
    },
    recordConfirmedEntry: () => Promise.reject(new Error("read-only")),
    recordLeave: () => Promise.reject(new Error("read-only")),
  }
  interface Runtime { instanceId: string; credentialId: string; bearer: string; rt: ReferenceRuntime }
  const register = async (label: string, world = WORLD): Promise<Runtime> => {
    const instanceId = randomUUID()
    const cred = newRuntimeCredential()
    await owner.query("SELECT world_runtime_register_instance($1, $2, $3, $4)", [instanceId, world, label, 64])
    await owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [cred.credentialId, instanceId, cred.sha256, 3600])
    const post: IngressTransport["post"] = async (op, b) => {
      const res = await handleRuntimeIngress(new Request(`${ORIGIN}/api/runtime/v1/${op}`, { method: "POST", headers: { authorization: `Bearer ${cred.bearer}`, "content-type": "application/json" }, body: JSON.stringify(b) }), op, { db, mode: "FIXTURE_PREVIEW", facts, snapshots: createRendererSnapshotPort({ mode: "FIXTURE_PREVIEW", facts }) })
      return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, unknown> }
    }
    return { instanceId, credentialId: cred.credentialId, bearer: cred.bearer, rt: new ReferenceRuntime({ post }, { autoJoin: false }) }
  }
  /** Raw snapshot call: exact status, body text and headers. */
  const snap = async (bearer: string | null, body: unknown, extra: Record<string, string> = {}) => {
    const res = await handleRuntimeIngress(new Request(`${ORIGIN}/api/runtime/v1/snapshot`, { method: "POST", headers: { "content-type": "application/json", ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), ...extra }, body: JSON.stringify(body) }), "snapshot", { db, mode: "FIXTURE_PREVIEW", facts, snapshots: createRendererSnapshotPort({ mode: "FIXTURE_PREVIEW", facts }) })
    return { status: res.status, text: await res.text(), headers: res.headers }
  }
  const pin = (r: Runtime) => su.query("UPDATE world_runtime_instances SET last_seen_at = now() - interval '1 hour' WHERE instance_id <> $1", [r.instanceId])
  const claimed = async (r: Runtime, subjectId?: string) => {
    const subject = subjectId ?? randomUUID()
    if (!subjectId) await su.query("INSERT INTO auth.users (id) VALUES ($1)", [subject])
    await pin(r)
    await r.rt.poll()
    const res = await handleWorldEntryRequest(new Request(`${ORIGIN}/api/worlds/${WORLD}/entry`, { method: "POST", body: JSON.stringify({
      schemaVersion: "1.0", contract: "world-entry-intent", intentId: randomUUID(), worldId: WORLD, requestedPlaceId: null, narrativeContext: null,
      client: { surface: "WEB", capabilities: { webgl2: true, touchPrimary: false, viewportClass: "EXPANDED", reducedMotion: false } },
    }) }), WORLD, async () => ({ subjectId: subject }), { mode: "FIXTURE_PREVIEW", ledger, db, handoffOrigin: ORIGIN })
    const entry = JSON.parse(await res.text()) as WorldEntryResult
    assert.equal(entry.outcome, "READY", JSON.stringify(entry))
    const h = await handleHandoff(entry.handoff!.href.slice(`${ORIGIN}${HANDOFF_PATH_PREFIX}`.length), { db })
    const cookie = h.headers.get("set-cookie")!.match(new RegExp(`${SESSION_COOKIE}=([A-Za-z0-9_-]{43})`))![1]
    await r.rt.step()
    const s = (await su.query("SELECT * FROM world_runtime_sessions WHERE view_sha256 = $1", [sha256(cookie)])).rows[0]
    assert.equal(s.instance_id, r.instanceId)
    return { subject, cookie, sessionId: s.session_id as string, visitId: s.visit_id as string, allocationId: s.allocation_id as string, entry }
  }
  const digest = async () => {
    const tables = (await su.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`)).rows.map((r) => r.tablename as string)
    const out: Record<string, string> = {}
    for (const t of tables) out[t] = (await su.query(`SELECT md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) d FROM ${pg.escapeIdentifier(t)} x`)).rows[0].d
    return out
  }
  const factsDigest = async () => createHash("sha256").update(JSON.stringify(await facts.load("living-forest-fixture"))).digest("hex")
  const codeOf = async (r: Runtime, sessionId: string) => db.runtimeSessionRenderContext(r.credentialId, sha256(r.bearer.split(".")[2]), sessionId).then(() => "OK", (e: EntryAuthorityError) => e.code)

  let A: Runtime

  describe("migration 046 + Runtime Ingress `snapshot` — renderer world-state read (real Postgres)", () => {
    before(async () => {
      ;({ su, owner } = await createSupabaseShapedDb(url, dbName, { through040: true }))
      for (const f of ["043_world_stream_capability_authority.sql", "044_world_stream_attachment_authority.sql", "045_world_stream_signalling_route.sql", "046_renderer_session_snapshot_authority.sql"]) await owner.query(mig(f))
      await owner.query(`ALTER ROLE worldk_platform_entry_preview LOGIN PASSWORD '${scramVerifier(PLATFORM_PW)}'`)
      db = new PgEntryAuthorityDb(urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW), { allowLocal: true, ssl: false })
      A = await register("m14b6-renderer-a")
    })
    after(async () => {
      if (process.env.M14B6_EVIDENCE_FILE) writeFileSync(process.env.M14B6_EVIDENCE_FILE, JSON.stringify(evidence, null, 2) + "\n")
      await db?.end()
      await owner?.end()
      await su?.end()
    })

    test("G1/G2/G18-G25. own snapshot after CLAIM and while IN_WORLD; non-mutating; deterministic; freshness = ingress tick; no identity", async () => {
      const c = await claimed(A)
      const dbBefore = await digest()
      const fBefore = await factsDigest()
      const r1 = await snap(A.bearer, { sessionId: c.sessionId })
      const r2 = await snap(A.bearer, { sessionId: c.sessionId })
      assert.equal(r1.status, 200, r1.text)
      assert.equal(r1.text, r2.text, "byte-identical for the same sourceRevision + session context")
      assert.deepEqual(await digest(), dbBefore, "full public-schema digest unchanged by reads")
      assert.equal(await factsDigest(), fBefore, "fact source unchanged by reads")
      assert.equal(r1.headers.get("cache-control"), "private, no-store")
      const s = JSON.parse(r1.text) as RendererSessionSnapshot
      assert.ok(validate(JSON.parse(r1.text)), JSON.stringify(validate.errors))
      assert.deepEqual(rendererForbiddenFieldsIn(s), [])
      assert.deepEqual(s.session, { sessionId: c.sessionId, reconnect: false })
      assert.deepEqual(s.visitor, { arrivalKind: c.entry.arrival!.kind, arrivalPlaceId: c.entry.arrival!.placeId })
      assert.equal(r1.headers.get("etag"), `"${s.freshness.source.sourceRevision}"`)
      // no identity or infrastructure ids anywhere in the bytes
      const cred = (await su.query("SELECT credential_id FROM world_runtime_credentials WHERE instance_id = $1", [A.instanceId])).rows.map((x) => x.credential_id as string)
      for (const id of [c.subject, c.visitId, c.allocationId, A.instanceId, ...cred, c.cookie, sha256(c.cookie).toString("hex")]) assert.ok(!r1.text.includes(id), `snapshot contains ${id}`)
      // IN_WORLD: media joined -> arrival; the snapshot's freshness tick equals the tick ingress stamped on the lifecycle event
      assert.equal(await A.rt.join(c.sessionId), "VISIT_OPENED")
      const inWorld = await snap(A.bearer, { sessionId: c.sessionId })
      assert.equal(inWorld.status, 200)
      assert.equal(inWorld.text, r1.text, "same facts + same context -> same bytes after arrival too")
      const ev = (await su.query("SELECT world_tick FROM world_visitor_lifecycle_events WHERE subject_id = $1", [c.subject])).rows[0]
      assert.equal(s.freshness.source.worldTick, ev.world_tick, "snapshot tick == Platform ingress world tick")
      const f = (await facts.load("living-forest-fixture"))!
      assert.deepEqual(s.freshness.source, { worldTick: f.sharedState.clock.tick, worldVersion: f.sharedState.worldVersion, sourceRevision: f.sourceRevision })
      // the reference runtime's SDK path
      const viaSdk = await A.rt.readSnapshot(c.sessionId)
      assert.deepEqual(viaSdk, s)
      // ETag 304 after authorization
      assert.equal((await snap(A.bearer, { sessionId: c.sessionId }, { "if-none-match": `"${s.freshness.source.sourceRevision}"` })).status, 304)
      evidence.ownSnapshot = { status: 200, bytes: r1.text.length, visitor: s.visitor, freshness: s.freshness, currentLocation: s.embodiment.current.locationId, reachable: s.embodiment.reachable.map((x) => x.locationId), entitiesAtCurrent: s.embodiment.current.entities.length, deterministic: true, dbDigestEqual: true, factsDigestEqual: true, tickMatchesIngress: true }
    })

    test("G3/G4/G5. wrong renderer, unknown session, foreign session and cross-world renderer all refused identically (403 SESSION_NOT_BOUND)", async () => {
      const c = await claimed(A)
      const B = await register("m14b6-renderer-b")
      await su.query("INSERT INTO world_lifecycle_authorities (world_id, authority_id, authority_kind) VALUES ('m14b6-other-world', 'worldk-m14-runtime-ingress', 'RUNTIME_CONFIRMED') ON CONFLICT DO NOTHING")
      await su.query("INSERT INTO world_entry_policies (world_id, presence_grace_seconds, heartbeat_seconds, instance_liveness_seconds, ticket_ttl_seconds, intent_lifetime_seconds, credential_max_ttl_seconds) VALUES ('m14b6-other-world', 120, 15, 30, 90, 1800, 604800) ON CONFLICT DO NOTHING")
      const X = await register("m14b6-other-world-renderer", "m14b6-other-world")
      const out: Record<string, { status: number; text: string }> = {}
      out.wrongRenderer = await snap(B.bearer, { sessionId: c.sessionId })
      out.unknownSession = await snap(A.bearer, { sessionId: randomUUID() })
      out.crossWorldRenderer = await snap(X.bearer, { sessionId: c.sessionId })
      for (const [k, v] of Object.entries(out)) assert.deepEqual([v.status, v.text], [403, '{"error":"SESSION_NOT_BOUND"}'], k)
      assert.equal(await B.rt.readSnapshot(c.sessionId), null, "B's SDK refuses locally (never claimed)")
      evidence.binding = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, `${v.status} ${v.text}`]))
    })

    test("G6/G17. no request parameter can select subject/user/world/place: body is exactly {sessionId}", async () => {
      const c = await claimed(A)
      const other = await claimed(A)
      const out: Record<string, number> = {}
      for (const [k, extra] of Object.entries({ subjectId: other.subject, userId: other.subject, worldId: "m14b6-other-world", placeId: "forest-pond", visitId: other.visitId, sessionIds: [other.sessionId] })) {
        out[k] = (await snap(A.bearer, { sessionId: c.sessionId, [k]: extra })).status
      }
      out.empty = (await snap(A.bearer, {})).status
      out.notUuid = (await snap(A.bearer, { sessionId: "forest-clearing" })).status
      for (const [k, v] of Object.entries(out)) assert.equal(v, 400, k)
      const sig = (await su.query("SELECT pg_get_function_identity_arguments('world_runtime_session_render_context(uuid,bytea,uuid)'::regprocedure) a")).rows[0].a
      assert.equal(sig, "p_credential_id uuid, p_secret_sha256 bytea, p_session_id uuid", "no identity/world/place parameter exists")
      evidence.noSelection = { statuses: out, signature: sig }
    })

    test("G7-G11. departed, superseded, leave-requested, released allocation, presence beyond grace -> 409 SESSION_NOT_ELIGIBLE (reused 044 predicate)", async () => {
      const codes: Record<string, string> = {}
      // leave requested, then departed
      const d = await claimed(A)
      await A.rt.join(d.sessionId)
      await handleLeave(new Request(`${ORIGIN}/world-entry/session/leave`, { method: "POST", headers: { cookie: `${SESSION_COOKIE}=${d.cookie}`, origin: ORIGIN, "sec-fetch-site": "same-origin" } }), { db })
      codes.leaveRequested = await codeOf(A, d.sessionId)
      await A.rt.leave(d.sessionId)
      codes.departed = await codeOf(A, d.sessionId)
      // superseded: a reconnect inside grace supersedes the live session
      const s = await claimed(A)
      await A.rt.join(s.sessionId)
      const again = await claimed(A, s.subject)
      assert.equal((await su.query("SELECT end_reason FROM world_runtime_sessions WHERE session_id = $1", [s.sessionId])).rows[0].end_reason, "SUPERSEDED")
      codes.superseded = await codeOf(A, s.sessionId)
      assert.equal(await codeOf(A, again.sessionId), "OK", "the new session reads")
      assert.equal(JSON.parse((await snap(A.bearer, { sessionId: again.sessionId })).text).session.reconnect, true)
      // released allocation (isolated: session itself still open)
      const r = await claimed(A)
      await su.query("UPDATE world_runtime_allocations SET state = 'RELEASED', released_at = now(), release_reason = 'ABANDONED' WHERE allocation_id = $1", [r.allocationId])
      codes.releasedAllocation = await codeOf(A, r.sessionId)
      // presence beyond grace (unswept): refused, and the read infers no timeout
      const p = await claimed(A)
      await A.rt.join(p.sessionId)
      await su.query("UPDATE world_visit_presence SET last_presence_at = now() - interval '121 seconds', opened_at = LEAST(opened_at, now() - interval '121 seconds') WHERE subject_id = $1 AND closed_at IS NULL", [p.subject])
      await su.query("UPDATE world_visitor_continuity SET last_entered_at = LEAST(last_entered_at, now() - interval '131 seconds') WHERE subject_id = $1", [p.subject])
      const before = await digest()
      codes.presenceBeyondGrace = await codeOf(A, p.sessionId)
      assert.deepEqual(await digest(), before, "no timeout inferred by the read")
      // disconnected (ended) too
      const e = await claimed(A)
      await A.rt.disconnect(e.sessionId)
      codes.ended = await codeOf(A, e.sessionId)
      for (const [k, v] of Object.entries(codes)) assert.equal(v, "SESSION_NOT_ELIGIBLE", k)
      assert.deepEqual(await snap(A.bearer, { sessionId: d.sessionId }).then((x) => [x.status, x.text]), [409, '{"error":"SESSION_NOT_ELIGIBLE"}'])
      evidence.eligibility = codes
    })

    test("G12-G16. stale/revoked/wrong credential, revoked instance, no bearer, and B3 capability/authorization/view cookie as bearer -> uniform 401", async () => {
      const c = await claimed(A)
      const out: Record<string, number> = {}
      const exp = newRuntimeCredential()
      await owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [exp.credentialId, A.instanceId, exp.sha256, 3600])
      await su.query("UPDATE world_runtime_credentials SET issued_at = now() - interval '2 hours', expires_at = now() - interval '1 second' WHERE credential_id = $1", [exp.credentialId])
      out.expiredCredential = (await snap(exp.bearer, { sessionId: c.sessionId })).status
      const rev = newRuntimeCredential()
      await owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [rev.credentialId, A.instanceId, rev.sha256, 3600])
      await owner.query("SELECT world_runtime_revoke_credential($1)", [rev.credentialId])
      out.revokedCredential = (await snap(rev.bearer, { sessionId: c.sessionId })).status
      out.wrongSecret = (await snap(`wkrt1.${A.credentialId}.${newSecret()}`, { sessionId: c.sessionId })).status
      out.noBearer = (await snap(null, { sessionId: c.sessionId })).status
      // B3 values presented as a bearer
      const hdr = { origin: ORIGIN, "sec-fetch-site": "same-origin", "content-type": "application/json", cookie: `${SESSION_COOKIE}=${c.cookie}` }
      const i = await handleStreamCapabilityIssue(new Request(`${ORIGIN}${STREAM_CAPABILITY_PATH}`, { method: "POST", headers: hdr, body: "{}" }), { db })
      const cap = ((await i.json()) as { capability: string }).capability
      const a = await handleStreamAuthorize(new Request(`${ORIGIN}${STREAM_AUTHORIZE_PATH}`, { method: "POST", headers: hdr, body: JSON.stringify({ capability: cap, worldId: WORLD }) }), { db })
      const authz = ((await a.json()) as { authorization: string }).authorization
      out.capabilityAsBearer = (await snap(cap, { sessionId: c.sessionId })).status
      out.authorizationAsBearer = (await snap(authz, { sessionId: c.sessionId })).status
      out.viewCookieAsBearer = (await snap(c.cookie, { sessionId: c.sessionId })).status
      out.cookieHeaderOnly = (await snap(null, { sessionId: c.sessionId }, { cookie: `${SESSION_COOKIE}=${c.cookie}` })).status
      // revoked instance (a dedicated instance so A stays usable)
      const R = await register("m14b6-revoked")
      const rc = await claimed(R)
      await owner.query("SELECT world_runtime_revoke_instance($1)", [R.instanceId])
      out.revokedInstance = (await snap(R.bearer, { sessionId: rc.sessionId })).status
      for (const [k, v] of Object.entries(out)) assert.equal(v, 401, k)
      evidence.credentials = out
    })

    test("G26. 046 privileges (038 lesson): only the Platform authority role may EXECUTE; STABLE SECURITY DEFINER with pinned search_path; no table; owner session refused", async () => {
      const f = "world_runtime_session_render_context(uuid,bytea,uuid)"
      const matrix: Record<string, boolean> = {}
      for (const role of ["anon", "authenticated", "service_role", ENTRY_AUTHORITY_ROLE, "worldk_platform_entry_preview"]) matrix[role] = (await su.query("SELECT has_function_privilege($1, $2, 'EXECUTE') ok", [role, f])).rows[0].ok
      assert.deepEqual(matrix, { anon: false, authenticated: false, service_role: false, [ENTRY_AUTHORITY_ROLE]: true, worldk_platform_entry_preview: false })
      const p = (await su.query(`SELECT prosecdef, proconfig, provolatile, EXISTS (SELECT 1 FROM aclexplode(coalesce(proacl, acldefault('f', proowner))) a WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE') pub FROM pg_proc WHERE proname = 'world_runtime_session_render_context'`)).rows[0]
      assert.equal(p.prosecdef, true)
      assert.deepEqual(p.proconfig, ["search_path=pg_catalog, public"])
      assert.equal(p.provolatile, "s", "STABLE")
      assert.equal(p.pub, false)
      assert.equal((await su.query(`SELECT count(*)::int n FROM information_schema.role_routine_grants WHERE routine_name = 'world_runtime_session_render_context' AND grantee <> '${OWNER}'`)).rows[0].n, 1)
      await assert.rejects(owner.query("SELECT * FROM world_runtime_session_render_context($1, $2, $3)", [randomUUID(), sha256("x"), randomUUID()]), /AUTHORITY_INVALID/)
      const src = mig("046_renderer_session_snapshot_authority.sql").replace(/--.*$/gm, "")
      assert.doesNotMatch(src, /\b(INSERT INTO|UPDATE|DELETE FROM|TRUNCATE|CREATE TABLE|ALTER TABLE|FOR UPDATE)\b/, "046 writes/locks nothing and adds no table")
      assert.doesNotMatch(src, /world_m14_(timeout_if_expired|lock|close_visit|apply_)/, "no lifecycle helper, no lock")
      evidence.privileges = { matrix, stable: true, securityDefiner: true, searchPathPinned: true, publicExecute: false }
    })
  })
}
