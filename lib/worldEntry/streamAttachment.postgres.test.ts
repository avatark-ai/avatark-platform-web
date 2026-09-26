// WORLDK-M14-B4 certification suite: renderer attachment authority (044) and
// the approved B3 predicate change, against real Postgres (037..040 + 043 +
// 044 as the non-superuser owner, Supabase-shaped default privileges).
//
// Real path throughout: ENTER -> handoff -> the ALLOCATED reference runtime
// claims -> B3 capability -> stub AUTHORIZED -> the renderer presents
// sha256(authorization) at Runtime Ingress `attach` -> ATTACHED -> (only
// then) STREAM_JOINED -> ARRIVAL. Time is simulated by ageing DB timestamps.
//
// Requires WORLD_CONSUMER_TEST_DATABASE_URL (superuser URL, DISPOSABLE local
// server). Skipped visibly when unset.
import { after, before, describe, test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"
import type { WorldEntryResult } from "@avatark/world-consumer-contracts"
import { createLivingForestFixtureFactSource } from "../worldConsumer/facts.ts"
import type { ContinuityRecord, VisitorContinuityLedger } from "../worldConsumer/continuityLedger.ts"
import { assertLocalUrl, createSupabaseShapedDb, OWNER, urlFor } from "../worldConsumer/testing/supabaseShapedDb.ts"
import { EntryAuthorityError, ENTRY_AUTHORITY_ROLE, PgEntryAuthorityDb } from "./authorityDb.ts"
import { newRuntimeCredential, newSecret, sha256 } from "./credentials.ts"
import { handleHandoff, handleLeave, SESSION_COOKIE } from "./gateway.ts"
import { ReferenceRuntime, type IngressTransport, type RuntimeEvent } from "./referenceRuntime.ts"
import { handleWorldEntryRequest, HANDOFF_PATH_PREFIX } from "./resolver.ts"
import { handleRuntimeIngress } from "./runtimeIngress.ts"
import { handleStreamAuthorize, handleStreamCapabilityIssue, STREAM_AUTHORIZE_PATH, STREAM_CAPABILITY_PATH } from "./streamCapability.ts"
import { handleStubAttach, StubAttachmentRelay } from "./stubAttachmentRelay.ts"
import { scramVerifier } from "../../scripts/worldk-m14-runtime-registry.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const url = process.env.WORLD_CONSUMER_TEST_DATABASE_URL
const PLATFORM_PW = "m14-platform-credential-local-only"
const WORLD = "living-forest"
const ORIGIN = "https://platform-preview.avatark.ai"
const plaintexts: string[] = []
const mig = (f: string) => readFileSync(path.join(here, "../../supabase/migrations", f), "utf8")

if (!url) {
  test("044 stream attachment authority (skipped: WORLD_CONSUMER_TEST_DATABASE_URL not set)", { skip: true }, () => {})
} else {
  assertLocalUrl(url)
  const dbName = `m14b4_${Date.now()}`
  let su: pg.Client
  let owner: pg.Client
  let db: PgEntryAuthorityDb
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

  interface Runtime { instanceId: string; credentialId: string; bearer: string; rt: ReferenceRuntime; events: RuntimeEvent[]; post: (op: string, body: Record<string, unknown>) => Promise<{ status: number; body: Record<string, unknown> }> }
  const register = async (label: string): Promise<Runtime> => {
    const instanceId = randomUUID()
    const cred = newRuntimeCredential()
    await owner.query("SELECT world_runtime_register_instance($1, $2, $3, $4)", [instanceId, WORLD, label, 64])
    await owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [cred.credentialId, instanceId, cred.sha256, 3600])
    const post = async (op: string, body: Record<string, unknown>) => {
      const res = await handleRuntimeIngress(
        new Request(`${ORIGIN}/api/runtime/v1/${op}`, { method: "POST", headers: { authorization: `Bearer ${cred.bearer}`, "content-type": "application/json" }, body: JSON.stringify(body) }),
        op, { db, mode: "FIXTURE_PREVIEW", facts },
      )
      return { status: res.status, body: (await res.json()) as Record<string, unknown> }
    }
    const events: RuntimeEvent[] = []
    const rt = new ReferenceRuntime({ post: post as IngressTransport["post"] }, { autoJoin: false, onEvent: (e) => events.push(e) })
    return { instanceId, credentialId: cred.credentialId, bearer: cred.bearer, rt, events, post }
  }
  const subject = async () => {
    const id = randomUUID()
    await su.query("INSERT INTO auth.users (id) VALUES ($1)", [id])
    return id
  }
  const enter = async (subjectId: string) => {
    const res = await handleWorldEntryRequest(
      new Request(`${ORIGIN}/api/worlds/${WORLD}/entry`, { method: "POST", body: JSON.stringify({
        schemaVersion: "1.0", contract: "world-entry-intent", intentId: randomUUID(), worldId: WORLD, requestedPlaceId: null, narrativeContext: null,
        client: { surface: "WEB", capabilities: { webgl2: true, touchPrimary: false, viewportClass: "EXPANDED", reducedMotion: false } },
      }) }),
      WORLD, async () => ({ subjectId }), { mode: "FIXTURE_PREVIEW", ledger, db, handoffOrigin: ORIGIN },
    )
    const r = JSON.parse(await res.text()) as WorldEntryResult
    assert.equal(r.outcome, "READY", JSON.stringify(r))
    return r.handoff!.href.slice(`${ORIGIN}${HANDOFF_PATH_PREFIX}`.length)
  }
  const sessionOf = async (cookie: string) => (await su.query("SELECT * FROM world_runtime_sessions WHERE view_sha256 = $1", [sha256(cookie)])).rows[0]
  /** ENTER -> handoff -> the allocated runtime CLAIMS (no join): pre-arrival, stream-eligible. */
  const claimed = async (r: Runtime, s?: string) => {
    const subj = s ?? (await subject())
    await r.rt.poll()
    const res = await handleHandoff(await enter(subj), { db })
    const cookie = res.headers.get("set-cookie")!.match(new RegExp(`${SESSION_COOKIE}=([A-Za-z0-9_-]{43})`))![1]
    await r.rt.step() // claim only (autoJoin off)
    const sess = await sessionOf(cookie)
    assert.equal(sess.instance_id, r.instanceId, "allocated on this runtime")
    assert.ok(sess.claimed_at)
    assert.equal(sess.joined_at, null)
    return { subject: subj, cookie, sessionId: sess.session_id as string }
  }
  const postB = (p: string, cookie: string, body: unknown) =>
    new Request(`${ORIGIN}${p}`, { method: "POST", headers: { origin: ORIGIN, "sec-fetch-site": "same-origin", "content-type": "application/json", cookie: `${SESSION_COOKIE}=${cookie}` }, body: JSON.stringify(body) })
  /** Browser side of B3: capability -> AUTHORIZED; returns the capability and the opaque authorization. */
  const authorize = async (cookie: string) => {
    const i = await handleStreamCapabilityIssue(postB(STREAM_CAPABILITY_PATH, cookie, {}), { db })
    assert.equal(i.status, 201)
    const cap = ((await i.json()) as { capability: string }).capability
    const a = await handleStreamAuthorize(postB(STREAM_AUTHORIZE_PATH, cookie, { capability: cap, worldId: WORLD }), { db })
    assert.equal(a.status, 200)
    const authz = ((await a.json()) as { authorization: string }).authorization
    plaintexts.push(cap, authz)
    return { cap, authz }
  }
  const attachCode = async (r: Runtime, sessionId: string, authz: string) => {
    const reply = await r.post("attach", { sessionId, authorizationSha256: sha256(authz).toString("hex") })
    return reply.status === 200 ? String(reply.body.outcome) : `${reply.status}:${reply.body.error}`
  }
  const attachDb = async (credentialId: string, secret: Buffer, sessionId: string, authz: string) =>
    db.runtimeStreamAttach(credentialId, secret, sessionId, sha256(authz)).then(() => "ATTACHED", (e: EntryAuthorityError) => e.code)
  const attachmentOf = async (authz: string) => (await su.query("SELECT * FROM world_stream_attachments WHERE authorization_sha256 = $1", [sha256(authz)])).rows[0]
  const digest = async () => {
    const tables = (await su.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('world_stream_capabilities', 'world_stream_attachments') ORDER BY 1`)).rows.map((r) => r.tablename as string)
    const out: Record<string, string> = {}
    for (const t of tables) out[t] = (await su.query(`SELECT md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) d FROM ${pg.escapeIdentifier(t)} x`)).rows[0].d
    return out
  }
  const issueCode = async (cookie: string) => {
    const c = newSecret()
    try {
      await db.streamCapabilityIssue(sha256(cookie), sha256(c))
      return "ISSUED"
    } catch (e) {
      return (e as EntryAuthorityError).code
    }
  }

  let A: Runtime
  let B: Runtime

  describe("migration 044 — renderer attachment authority (real Postgres)", () => {
    before(async () => {
      ;({ su, owner } = await createSupabaseShapedDb(url, dbName, { through040: true }))
      await owner.query(mig("043_world_stream_capability_authority.sql"))
      await owner.query(mig("044_world_stream_attachment_authority.sql"))
      await owner.query(`ALTER ROLE worldk_platform_entry_preview LOGIN PASSWORD '${scramVerifier(PLATFORM_PW)}'`)
      db = new PgEntryAuthorityDb(urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW), { allowLocal: true, ssl: false })
      A = await register("m14b4-renderer-a")
      B = await register("m14b4-renderer-b")
    })
    after(async () => {
      if (process.env.M14B4_EVIDENCE_FILE) writeFileSync(process.env.M14B4_EVIDENCE_FILE, JSON.stringify(evidence, null, 2) + "\n")
      if (process.env.M14B4_PLAINTEXT_FILE) writeFileSync(process.env.M14B4_PLAINTEXT_FILE, plaintexts.join("\n") + "\n", { mode: 0o600 })
      await db?.end()
      await owner?.end()
      await su?.end()
    })

    test("Q1(a) re-certification: issuance at CLAIMED (not before), still refused when unclaimed / leaving / ended; ARRIVAL only after media", async () => {
      const codes: Record<string, string> = {}
      const s = await subject()
      await A.rt.poll()
      await B.rt.poll()
      // Pin the allocation on A by making B momentarily ineligible.
      await su.query("UPDATE world_runtime_instances SET last_seen_at = now() - interval '1 hour' WHERE instance_id = $1", [B.instanceId])
      const res = await handleHandoff(await enter(s), { db })
      const cookie = res.headers.get("set-cookie")!.match(new RegExp(`${SESSION_COOKIE}=([A-Za-z0-9_-]{43})`))![1]
      codes.redeemedUnclaimed = await issueCode(cookie)
      await A.rt.step() // claim
      codes.claimedNotJoined = await issueCode(cookie)
      assert.equal((await su.query("SELECT count(*) n FROM world_visit_presence WHERE subject_id = $1", [s])).rows[0].n, "0", "claimed is not arrival")
      assert.equal((await su.query("SELECT count(*) n FROM world_visitor_lifecycle_events WHERE subject_id = $1", [s])).rows[0].n, "0")
      await handleLeave(new Request(`${ORIGIN}/world-entry/session/leave`, { method: "POST", headers: { cookie: `${SESSION_COOKIE}=${cookie}`, origin: ORIGIN, "sec-fetch-site": "same-origin" } }), { db })
      codes.claimedLeaveRequested = await issueCode(cookie)
      const c2 = await claimed(A)
      await A.rt.disconnect(c2.sessionId)
      codes.claimedThenEnded = await issueCode(c2.cookie)
      assert.deepEqual(codes, { redeemedUnclaimed: "STREAM_SESSION_NOT_IN_WORLD", claimedNotJoined: "ISSUED", claimedLeaveRequested: "STREAM_SESSION_NOT_IN_WORLD", claimedThenEnded: "STREAM_SESSION_NOT_IN_WORLD" })
      evidence.Q1a = codes
    })

    test("G1. allocated renderer attach PASS (pre-arrival): ATTACHED, hash-only row, window = consumed_at + 60 s, NOT arrival, digest unchanged; STREAM_JOINED then opens the Visit", async () => {
      const c = await claimed(A)
      const { authz } = await authorize(c.cookie)
      const before = await digest()
      const reply = await A.post("attach", { sessionId: c.sessionId, authorizationSha256: sha256(authz).toString("hex") })
      assert.equal(reply.status, 200)
      assert.deepEqual(reply.body, { outcome: "ATTACHED", sessionId: c.sessionId })
      const row = await attachmentOf(authz)
      assert.deepEqual(Object.keys(row).sort(), ["attach_window_ends_at", "attached_at", "authorization_sha256", "instance_id", "session_id"])
      assert.equal(row.instance_id, A.instanceId)
      assert.equal(row.session_id, c.sessionId)
      const k = (await su.query("SELECT consumed_at FROM world_stream_capabilities WHERE authorization_sha256 = $1", [sha256(authz)])).rows[0]
      assert.equal(row.attach_window_ends_at.getTime() - k.consumed_at.getTime(), 60_000)
      assert.deepEqual(await digest(), before, "attach wrote nothing outside the attachment store")
      assert.equal((await sessionOf(c.cookie)).joined_at, null, "attach is not arrival")
      assert.equal((await su.query("SELECT count(*) n FROM world_visit_presence WHERE subject_id = $1", [c.subject])).rows[0].n, "0")
      // media joined -> ARRIVAL (B1 unchanged)
      assert.equal(await A.rt.join(c.sessionId), "VISIT_OPENED")
      assert.equal((await su.query("SELECT visit_open FROM world_visitor_continuity WHERE subject_id = $1", [c.subject])).rows[0].visit_open, true)
      evidence.G1 = { reply: Object.keys(reply.body).sort(), row: Object.keys(row).sort(), windowSeconds: 60, arrivalAfterAttach: "VISIT_OPENED" }
    })

    test("G1b. reference runtime SDK path (attachStream) and a reconnect session inside grace attach too", async () => {
      const c = await claimed(A)
      const { authz } = await authorize(c.cookie)
      assert.equal(await A.rt.attachStream(c.sessionId, authz), "ATTACHED")
      await A.rt.join(c.sessionId)
      await A.rt.disconnect(c.sessionId) // STREAM_LOST -> grace
      const res = await handleHandoff(await enter(c.subject), { db })
      const cookie2 = res.headers.get("set-cookie")!.match(new RegExp(`${SESSION_COOKIE}=([A-Za-z0-9_-]{43})`))![1]
      await A.rt.step()
      const s2 = await sessionOf(cookie2)
      assert.equal(s2.reconnect, true)
      const { authz: authz2 } = await authorize(cookie2)
      assert.equal(await A.rt.attachStream(s2.session_id, authz2), "ATTACHED", "reconnect = new session, new capability, new attach")
      assert.equal(await attachCode(A, s2.session_id, authz), "403:STREAM_AUTHORIZATION_BINDING_MISMATCH", "the old session's authorization never attaches to the new session")
    })

    test("G2. wrong renderer REFUSED: another instance cannot attach a session it was not allocated, nor use its own session with a foreign authorization", async () => {
      const c = await claimed(A)
      const { authz } = await authorize(c.cookie)
      const codes: Record<string, string> = {}
      codes.foreignSession = await attachCode(B, c.sessionId, authz)
      await su.query("UPDATE world_runtime_instances SET last_seen_at = now() - interval '1 hour' WHERE instance_id = $1", [A.instanceId])
      const cb = await claimed(B)
      await A.rt.poll()
      codes.ownSessionForeignAuthorization = await attachCode(B, cb.sessionId, authz)
      codes.sdkLocalRefusal = String(await B.rt.attachStream(c.sessionId, authz)) // B never claimed it: refused locally, no I/O
      assert.deepEqual(codes, { foreignSession: "403:SESSION_NOT_BOUND", ownSessionForeignAuthorization: "403:STREAM_AUTHORIZATION_BINDING_MISMATCH", sdkLocalRefusal: "null" })
      assert.equal(await attachmentOf(authz), undefined)
      assert.equal(await A.rt.attachStream(c.sessionId, authz), "ATTACHED", "the allocated renderer still can")
      evidence.G2 = codes
    })

    test("G3. expired / revoked credential and revoked instance REFUSED (uniform 401)", async () => {
      const codes: Record<string, string> = {}
      const c = await claimed(A)
      const { authz } = await authorize(c.cookie)
      const tmp = newRuntimeCredential()
      await owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [tmp.credentialId, A.instanceId, tmp.sha256, 3600])
      await su.query("UPDATE world_runtime_credentials SET issued_at = now() - interval '2 hours', expires_at = now() - interval '1 second' WHERE credential_id = $1", [tmp.credentialId])
      codes.expiredDb = await attachDb(tmp.credentialId, tmp.sha256, c.sessionId, authz)
      const tmp2 = newRuntimeCredential()
      await owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [tmp2.credentialId, A.instanceId, tmp2.sha256, 3600])
      await owner.query("SELECT world_runtime_revoke_credential($1)", [tmp2.credentialId])
      codes.revokedDb = await attachDb(tmp2.credentialId, tmp2.sha256, c.sessionId, authz)
      codes.wrongSecretDb = await attachDb(A.credentialId, sha256("not-the-secret"), c.sessionId, authz)
      const http = await handleRuntimeIngress(new Request(`${ORIGIN}/api/runtime/v1/attach`, { method: "POST", headers: { authorization: `Bearer wkrt1.${tmp2.credentialId}.${tmp2.secret}`, "content-type": "application/json" }, body: JSON.stringify({ sessionId: c.sessionId, authorizationSha256: sha256(authz).toString("hex") }) }), "attach", { db, mode: "FIXTURE_PREVIEW", facts })
      codes.revokedHttp = String(http.status)
      // revoked instance
      const R = await register("m14b4-revoked")
      await su.query("UPDATE world_runtime_instances SET last_seen_at = now() - interval '1 hour' WHERE instance_id <> $1", [R.instanceId])
      const cr = await claimed(R)
      const { authz: authzR } = await authorize(cr.cookie)
      await owner.query("SELECT world_runtime_revoke_instance($1)", [R.instanceId])
      codes.instanceRevoked = await attachCode(R, cr.sessionId, authzR)
      await A.rt.poll()
      await B.rt.poll()
      assert.deepEqual(codes, { expiredDb: "RUNTIME_CREDENTIAL_EXPIRED", revokedDb: "RUNTIME_CREDENTIAL_REVOKED", wrongSecretDb: "RUNTIME_CREDENTIAL_INVALID", revokedHttp: "401", instanceRevoked: "401:RUNTIME_UNAUTHORIZED" })
      assert.equal(await attachmentOf(authz), undefined)
      assert.equal(await attachmentOf(authzR), undefined)
      evidence.G3 = codes
    })

    test("G4. replay / second attach REFUSED (same authorization, and a second authorization for an attached session)", async () => {
      await su.query("UPDATE world_runtime_instances SET last_seen_at = now() - interval '1 hour' WHERE instance_id <> $1", [A.instanceId])
      const c = await claimed(A)
      const { authz } = await authorize(c.cookie)
      assert.equal(await attachCode(A, c.sessionId, authz), "ATTACHED")
      const first = await attachmentOf(authz)
      assert.equal(await attachCode(A, c.sessionId, authz), "409:STREAM_ALREADY_ATTACHED")
      const { authz: authz2 } = await authorize(c.cookie)
      assert.equal(await attachCode(A, c.sessionId, authz2), "409:STREAM_ALREADY_ATTACHED", "one attachment per session")
      assert.deepEqual(await attachmentOf(authz), first)
      assert.equal(await attachmentOf(authz2), undefined)
      await B.rt.poll()
      evidence.G4 = { replay: "STREAM_ALREADY_ATTACHED", secondAuthorizationSameSession: "STREAM_ALREADY_ATTACHED" }
    })

    test("G5. concurrent attach: exactly one winner (held-lock proof + 16-way race)", async () => {
      await su.query("UPDATE world_runtime_instances SET last_seen_at = now() - interval '1 hour' WHERE instance_id <> $1", [A.instanceId])
      const c = await claimed(A)
      const { authz } = await authorize(c.cookie)
      const secret = sha256(A.bearer.split(".")[2])
      const t1 = new pg.Client({ connectionString: urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW) })
      const t2 = new pg.Client({ connectionString: urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW) })
      await t1.connect()
      await t2.connect()
      const q = "SELECT world_runtime_stream_attach($1, $2, $3, $4) AS r"
      const args = [A.credentialId, secret, c.sessionId, sha256(authz)]
      try {
        await t1.query("BEGIN")
        await t1.query(`SET LOCAL ROLE ${ENTRY_AUTHORITY_ROLE}`)
        assert.equal((await t1.query(q, args)).rows[0].r.outcome, "ATTACHED")
        await t2.query("BEGIN")
        await t2.query(`SET LOCAL ROLE ${ENTRY_AUTHORITY_ROLE}`)
        const pid2 = (await t2.query("SELECT pg_backend_pid() p")).rows[0].p
        const second = t2.query(q, args).then(() => "ATTACHED", (e) => e.message as string)
        let waiting = false
        for (let i = 0; i < 50 && !waiting; i++) {
          waiting = (await su.query("SELECT wait_event_type = 'Lock' w FROM pg_stat_activity WHERE pid = $1", [pid2])).rows[0]?.w === true
          if (!waiting) await new Promise((r) => setTimeout(r, 20))
        }
        assert.ok(waiting, "T2 blocked behind T1")
        await t1.query("COMMIT")
        assert.equal(await second, "STREAM_ALREADY_ATTACHED")
        await t2.query("ROLLBACK")
      } finally {
        await t1.end()
        await t2.end()
      }
      const c2 = await claimed(A)
      const { authz: authz2 } = await authorize(c2.cookie)
      const pools = Array.from({ length: 8 }, () => new PgEntryAuthorityDb(urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW), { allowLocal: true, ssl: false }))
      try {
        const results = await Promise.all(Array.from({ length: 16 }, (_, i) =>
          pools[i % 8].runtimeStreamAttach(A.credentialId, secret, c2.sessionId, sha256(authz2)).then(() => "ATTACHED", (e: EntryAuthorityError) => e.code)))
        assert.equal(results.filter((r) => r === "ATTACHED").length, 1, results.join(","))
        assert.equal(results.filter((r) => r === "STREAM_ALREADY_ATTACHED").length, 15, results.join(","))
        evidence.G5 = { heldLock: "T2 blocked on Lock, then STREAM_ALREADY_ATTACHED", race: { attempts: 16, attached: 1, alreadyAttached: 15 } }
      } finally {
        await Promise.all(pools.map((p) => p.end()))
      }
      await B.rt.poll()
    })

    test("G6. expired attachment window REFUSED (60 s after consumed_at)", async () => {
      await su.query("UPDATE world_runtime_instances SET last_seen_at = now() - interval '1 hour' WHERE instance_id <> $1", [A.instanceId])
      const c = await claimed(A)
      const { authz } = await authorize(c.cookie)
      await su.query("UPDATE world_stream_capabilities SET issued_at = issued_at - interval '61 seconds', expires_at = expires_at - interval '61 seconds', consumed_at = consumed_at - interval '61 seconds' WHERE authorization_sha256 = $1", [sha256(authz)])
      assert.equal(await attachCode(A, c.sessionId, authz), "409:STREAM_ATTACH_WINDOW_EXPIRED")
      // exactly at 59 s it still attaches
      const c2 = await claimed(A)
      const { authz: authz2 } = await authorize(c2.cookie)
      await su.query("UPDATE world_stream_capabilities SET issued_at = issued_at - interval '59 seconds', expires_at = expires_at - interval '59 seconds', consumed_at = consumed_at - interval '59 seconds' WHERE authorization_sha256 = $1", [sha256(authz2)])
      assert.equal(await attachCode(A, c2.sessionId, authz2), "ATTACHED")
      await B.rt.poll()
      evidence.G6 = { at61s: "STREAM_ATTACH_WINDOW_EXPIRED", at59s: "ATTACHED" }
    })

    test("G7. ended / departed / superseded / leaving / presence-expired session REFUSED", async () => {
      await su.query("UPDATE world_runtime_instances SET last_seen_at = now() - interval '1 hour' WHERE instance_id <> $1", [A.instanceId])
      const codes: Record<string, string> = {}
      // ended (STREAM_LOST before attach)
      const e = await claimed(A)
      const ea = await authorize(e.cookie)
      await A.rt.join(e.sessionId)
      await A.rt.disconnect(e.sessionId)
      codes.ended = await attachCode(A, e.sessionId, ea.authz)
      // superseded: the grace reconnect ends the old session
      const res = await handleHandoff(await enter(e.subject), { db })
      assert.equal(res.status, 303)
      await A.rt.step()
      codes.superseded = await attachCode(A, e.sessionId, ea.authz)
      // leave requested, then departed
      const d = await claimed(A)
      const da = await authorize(d.cookie)
      await A.rt.join(d.sessionId)
      await handleLeave(new Request(`${ORIGIN}/world-entry/session/leave`, { method: "POST", headers: { cookie: `${SESSION_COOKIE}=${d.cookie}`, origin: ORIGIN, "sec-fetch-site": "same-origin" } }), { db })
      codes.leaveRequested = await attachCode(A, d.sessionId, da.authz)
      await A.rt.leave(d.sessionId)
      codes.departed = await attachCode(A, d.sessionId, da.authz)
      // joined, presence past grace (unswept): read-only refusal
      const p = await claimed(A)
      const pa = await authorize(p.cookie)
      await A.rt.join(p.sessionId)
      await su.query("UPDATE world_visit_presence SET last_presence_at = now() - interval '121 seconds', opened_at = LEAST(opened_at, now() - interval '121 seconds') WHERE subject_id = $1 AND closed_at IS NULL", [p.subject])
      await su.query("UPDATE world_visitor_continuity SET last_entered_at = LEAST(last_entered_at, now() - interval '131 seconds') WHERE subject_id = $1", [p.subject])
      const before = await digest()
      codes.presenceExpired = await attachCode(A, p.sessionId, pa.authz)
      assert.deepEqual(await digest(), before, "no timeout inferred by attach")
      for (const [k, v] of Object.entries(codes)) assert.equal(v, "409:STREAM_SESSION_NOT_ELIGIBLE", k)
      await db.sweep(100)
      await B.rt.poll()
      evidence.G7 = codes
    })

    test("G8. cross-session / cross-subject authorization and a raw B3 capability REFUSED", async () => {
      await su.query("UPDATE world_runtime_instances SET last_seen_at = now() - interval '1 hour' WHERE instance_id <> $1", [A.instanceId])
      const x = await claimed(A)
      const y = await claimed(A) // another subject, same renderer
      const xa = await authorize(x.cookie)
      const ya = await authorize(y.cookie)
      const codes: Record<string, string> = {
        crossSubject: await attachCode(A, y.sessionId, xa.authz),
        crossSession: await attachCode(A, x.sessionId, ya.authz),
        rawCapability: await attachCode(A, x.sessionId, xa.cap),
        forged: await attachCode(A, x.sessionId, newSecret()),
        sessionCookieAsAuthorization: await attachCode(A, x.sessionId, x.cookie),
      }
      // an issued-but-unredeemed capability has no authorization at all
      const i = await handleStreamCapabilityIssue(postB(STREAM_CAPABILITY_PATH, x.cookie, {}), { db })
      const unredeemed = ((await i.json()) as { capability: string }).capability
      plaintexts.push(unredeemed)
      codes.unredeemedCapability = await attachCode(A, x.sessionId, unredeemed)
      assert.deepEqual(codes, {
        crossSubject: "403:STREAM_AUTHORIZATION_BINDING_MISMATCH", crossSession: "403:STREAM_AUTHORIZATION_BINDING_MISMATCH",
        rawCapability: "403:STREAM_AUTHORIZATION_INVALID", forged: "403:STREAM_AUTHORIZATION_INVALID",
        sessionCookieAsAuthorization: "403:STREAM_AUTHORIZATION_INVALID", unredeemedCapability: "403:STREAM_AUTHORIZATION_INVALID",
      })
      for (const bad of [{ sessionId: x.sessionId }, { sessionId: x.sessionId, authorizationSha256: "zz" }, { sessionId: x.sessionId, authorizationSha256: sha256(xa.authz).toString("hex").toUpperCase() }, { sessionId: x.sessionId, authorizationSha256: sha256(xa.authz).toString("hex"), extra: 1 }, { sessionId: "nope", authorizationSha256: sha256(xa.authz).toString("hex") }]) {
        assert.equal((await A.post("attach", bad)).status, 400, JSON.stringify(Object.keys(bad)))
      }
      assert.equal(await attachCode(A, x.sessionId, xa.authz), "ATTACHED")
      assert.equal(await attachCode(A, y.sessionId, ya.authz), "ATTACHED")
      await B.rt.poll()
      evidence.G8 = codes
    })

    test("G9. authorization material against lifecycle ingress and the gateway is REFUSED; nothing moves", async () => {
      await su.query("UPDATE world_runtime_instances SET last_seen_at = now() - interval '1 hour' WHERE instance_id <> $1", [A.instanceId])
      const c = await claimed(A)
      const { authz } = await authorize(c.cookie)
      const h = sha256(authz)
      const before = await digest()
      const codeOf = (p: Promise<unknown>) => p.then(() => "ACCEPTED", (e: EntryAuthorityError) => e.code)
      const codes: Record<string, string> = {
        asTicket: await codeOf(db.redeemTicket(h, sha256(newSecret()))),
        asSessionView: await codeOf(db.sessionView(h)),
        asLeave: await codeOf(db.requestLeave(h)),
        asRuntimeSecretArrival: await codeOf(db.runtimeArrival(A.credentialId, h, randomUUID(), c.sessionId, WORLD, 1)),
        asRuntimeSecretAttach: await codeOf(db.runtimeStreamAttach(A.credentialId, h, c.sessionId, h)),
        asStreamCapability: await codeOf(db.streamCapabilityRedeem(h, sha256(c.cookie), WORLD, sha256(newSecret()))),
      }
      const bearer = await handleRuntimeIngress(new Request(`${ORIGIN}/api/runtime/v1/arrival`, { method: "POST", headers: { authorization: `Bearer ${authz}`, "content-type": "application/json" }, body: "{}" }), "arrival", { db, mode: "FIXTURE_PREVIEW", facts })
      codes.asIngressBearer = String(bearer.status)
      assert.deepEqual(codes, { asTicket: "TICKET_INVALID", asSessionView: "SESSION_NOT_FOUND", asLeave: "SESSION_NOT_FOUND", asRuntimeSecretArrival: "RUNTIME_CREDENTIAL_INVALID", asRuntimeSecretAttach: "RUNTIME_CREDENTIAL_INVALID", asStreamCapability: "STREAM_CAPABILITY_INVALID", asIngressBearer: "401" })
      assert.deepEqual(await digest(), before)
      assert.equal(await attachmentOf(authz), undefined)
      await B.rt.poll()
      evidence.G9 = codes
    })

    test("G10. stub relay: browser authorization -> allocated renderer -> Platform attach -> ATTACHED; misrouting and foreign browsers cannot bind", async () => {
      await su.query("UPDATE world_runtime_instances SET last_seen_at = now() - interval '1 hour' WHERE instance_id <> $1", [A.instanceId])
      const relay = new StubAttachmentRelay()
      const stub = (cookie: string, body: unknown) => handleStubAttach(postB("/stub/attach", cookie, body), { db, relay })
      const c = await claimed(A)
      relay.register(c.sessionId, (auth) => A.rt.attachStream(c.sessionId, auth))
      const { authz } = await authorize(c.cookie)
      const ok = await stub(c.cookie, { authorization: authz })
      assert.equal(ok.status, 200)
      const okBody = await ok.json()
      assert.deepEqual(okBody, { status: "ATTACHED" }, "the browser learns only ATTACHED")
      assert.equal((await attachmentOf(authz)).instance_id, A.instanceId)
      // a second browser cannot route someone else's authorization
      const other = await claimed(A)
      relay.register(other.sessionId, (auth) => A.rt.attachStream(other.sessionId, auth))
      const oa = await authorize(other.cookie)
      assert.deepEqual([(await stub(c.cookie, { authorization: oa.authz })).status], [403])
      // misrouting: the relay hands the session to the WRONG renderer -> Platform refuses; nothing bound
      await B.rt.poll()
      relay.register(other.sessionId, (auth) => B.rt.attachStream(other.sessionId, auth))
      const mis = await stub(other.cookie, { authorization: oa.authz })
      assert.equal(mis.status, 403)
      assert.equal(await attachmentOf(oa.authz), undefined)
      // B never claimed it: its SDK refuses locally; force the wire call to show the Platform refusal too
      assert.equal(await attachCode(B, other.sessionId, oa.authz), "403:SESSION_NOT_BOUND")
      // no renderer registered -> refused
      relay.unregister(other.sessionId)
      assert.equal((await stub(other.cookie, { authorization: oa.authz })).status, 403)
      // malformed / origin
      assert.equal((await stub(other.cookie, { authorization: oa.authz, sessionId: other.sessionId })).status, 400)
      const cross = await handleStubAttach(new Request(`${ORIGIN}/stub/attach`, { method: "POST", headers: { origin: "https://evil.example", "sec-fetch-site": "cross-site", "content-type": "application/json", cookie: `${SESSION_COOKIE}=${other.cookie}` }, body: JSON.stringify({ authorization: oa.authz }) }), { db, relay })
      assert.equal(cross.status, 403)
      // the correct renderer still attaches afterwards
      relay.register(other.sessionId, (auth) => A.rt.attachStream(other.sessionId, auth))
      assert.equal((await stub(other.cookie, { authorization: oa.authz })).status, 200)
      evidence.G10 = { browserBody: okBody, foreignBrowser: 403, misroutedToWrongRenderer: 403, noRenderer: 403 }
    })

    test("G11. privileges: 038 hardening on the attachment store and functions; the B3 predicate stays unexecutable", async () => {
      const tableGrants = (await su.query(`SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'world_stream_attachments' AND grantee <> '${OWNER}'`)).rows
      assert.deepEqual(tableGrants, [])
      const rls = (await su.query("SELECT relrowsecurity r, (SELECT count(*) FROM pg_policies WHERE tablename = 'world_stream_attachments') p FROM pg_class WHERE relname = 'world_stream_attachments'")).rows[0]
      assert.equal(rls.r, true)
      assert.equal(Number(rls.p), 0)
      const fns = ["world_runtime_stream_attach(uuid,bytea,uuid,bytea)", "world_stream_attachment_route(bytea,bytea)", "world_m14b3_session_in_world(world_runtime_sessions)"]
      const matrix: Record<string, Record<string, boolean>> = {}
      for (const role of ["anon", "authenticated", "service_role", ENTRY_AUTHORITY_ROLE, "worldk_platform_entry_preview"]) {
        matrix[role] = { tableAny: (await su.query("SELECT has_table_privilege($1, 'world_stream_attachments', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') ok", [role])).rows[0].ok }
        for (const f of fns) matrix[role][f] = (await su.query("SELECT has_function_privilege($1, $2, 'EXECUTE') ok", [role, f])).rows[0].ok
      }
      for (const role of ["anon", "authenticated", "service_role", "worldk_platform_entry_preview"]) for (const [k, v] of Object.entries(matrix[role])) assert.equal(v, false, `${role} ${k}`)
      assert.deepEqual(matrix[ENTRY_AUTHORITY_ROLE], { tableAny: false, [fns[0]]: true, [fns[1]]: true, [fns[2]]: false })
      const pub = (await su.query(`SELECT p.proname, EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE') pub FROM pg_proc p WHERE p.proname IN ('world_runtime_stream_attach','world_stream_attachment_route','world_m14b3_session_in_world')`)).rows
      for (const r of pub) assert.equal(r.pub, false, r.proname)
      const defs = (await su.query(`SELECT proname, prosecdef, proconfig FROM pg_proc WHERE proname IN ('world_runtime_stream_attach','world_stream_attachment_route','world_m14b3_session_in_world')`)).rows
      for (const d of defs) {
        assert.equal(d.prosecdef, true, d.proname)
        assert.deepEqual(d.proconfig, ["search_path=pg_catalog, public"], d.proname)
      }
      await assert.rejects(owner.query("SELECT world_runtime_stream_attach($1, $2, $3, $4)", [randomUUID(), sha256("x"), randomUUID(), sha256("y")]), /AUTHORITY_INVALID/)
      const granted = (await su.query(`SELECT p.proname FROM pg_proc p, aclexplode(p.proacl) a WHERE a.grantee = $1::regrole AND a.privilege_type = 'EXECUTE' AND (p.proname LIKE 'world_stream_%' OR p.proname = 'world_runtime_stream_attach') ORDER BY 1`, [ENTRY_AUTHORITY_ROLE])).rows.map((r) => r.proname)
      assert.deepEqual(granted, ["world_runtime_stream_attach", "world_stream_attachment_route", "world_stream_capability_issue", "world_stream_capability_redeem"])
      // 044 writes only its own table
      const src = mig("044_world_stream_attachment_authority.sql").replace(/--.*$/gm, "")
      assert.deepEqual([...new Set([...src.matchAll(/\b(INSERT INTO|UPDATE|DELETE FROM|TRUNCATE)\s+([a-z_]+)/g)].map((m) => m[2]))], ["world_stream_attachments"])
      assert.doesNotMatch(src, /world_m14_(timeout_if_expired|apply_arrival|apply_departure|close_visit|release_abandoned)|record_world_|_v2\(/)
      evidence.G11 = { tableGrants, rls: { enabled: rls.r, policies: Number(rls.p) }, matrix, platformRoleStreamGrants: granted }
    })

    test("G12. plaintext capability / authorization absent from every table and pg_stat_activity", async () => {
      assert.ok(plaintexts.length >= 30, String(plaintexts.length))
      const tables = (await su.query(`SELECT schemaname s, tablename t FROM pg_tables WHERE schemaname IN ('public', 'auth')`)).rows
      const hits: string[] = []
      for (const t of tables) {
        const blob = (await su.query(`SELECT x::text v FROM ${pg.escapeIdentifier(t.s)}.${pg.escapeIdentifier(t.t)} x`)).rows.map((r) => r.v).join("\n")
        for (const p of plaintexts) if (blob.includes(p)) hits.push(t.t)
      }
      const act = (await su.query("SELECT string_agg(coalesce(query, ''), '\n') q FROM pg_stat_activity")).rows[0].q ?? ""
      for (const p of plaintexts) if (act.includes(p)) hits.push("pg_stat_activity")
      assert.deepEqual(hits, [])
      evidence.G12 = { plaintextsChecked: plaintexts.length, tablesScanned: tables.length, hits: 0 }
    })
  })
}
