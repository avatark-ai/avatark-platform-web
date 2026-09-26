// WORLDK-M14-B3 certification suite: stream connection capability authority
// (043) against real Postgres (037..040 + 043 as the non-superuser owner, on
// a Supabase-shaped database whose default privileges grant anon /
// authenticated / service_role everything, the 038 lesson).
//
// Real path throughout: WorldK-shaped ENTER -> handoff gateway -> reference
// runtime ARRIVAL (IN_WORLD) -> stream capability issue -> stub signalling
// redemption, all through the real handlers and the Platform credential
// (worldk_platform_entry_preview -> SET ROLE worldk_platform_entry_authority).
// Time is simulated by ageing DB-recorded timestamps as the superuser.
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
import { handleHandoff, handleLeave, handleSessionView, SESSION_COOKIE } from "./gateway.ts"
import { ReferenceRuntime, type IngressTransport } from "./referenceRuntime.ts"
import { handleWorldEntryRequest, HANDOFF_PATH_PREFIX } from "./resolver.ts"
import { handleRuntimeIngress } from "./runtimeIngress.ts"
import { handleStreamAuthorize, handleStreamCapabilityIssue, STREAM_AUTHORIZE_PATH, STREAM_CAPABILITY_PATH } from "./streamCapability.ts"
import { scramVerifier } from "../../scripts/worldk-m14-runtime-registry.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const url = process.env.WORLD_CONSUMER_TEST_DATABASE_URL
// Shared with the other M14 suites: the role is cluster-wide and suites run in parallel.
const PLATFORM_PW = "m14-platform-credential-local-only"
const WORLD = "living-forest"
const ORIGIN = "https://platform-preview.avatark.ai"
/** Every plaintext capability / authorization this suite ever saw, for the persistence scan. */
const plaintexts: string[] = []

if (!url) {
  test("043 stream capability authority (skipped: WORLD_CONSUMER_TEST_DATABASE_URL not set)", { skip: true }, () => {})
} else {
  assertLocalUrl(url)
  const dbName = `m14b3_${Date.now()}`
  let su: pg.Client
  let owner: pg.Client
  let db: PgEntryAuthorityDb
  const facts = createLivingForestFixtureFactSource()

  const subject = async () => {
    const id = randomUUID()
    await su.query("INSERT INTO auth.users (id) VALUES ($1)", [id])
    return id
  }
  const ledger: VisitorContinuityLedger = {
    async get(worldId, subjectId): Promise<ContinuityRecord | null> {
      const r = (await su.query("SELECT * FROM world_visitor_continuity WHERE world_id = $1 AND subject_id = $2", [worldId, subjectId])).rows[0]
      return r ? ({ worldId, subjectId, visitCount: r.visit_count, lastPlaceId: r.last_place_id } as ContinuityRecord) : null
    },
    recordConfirmedEntry: () => Promise.reject(new Error("read-only")),
    recordLeave: () => Promise.reject(new Error("read-only")),
  }

  interface Runtime { instanceId: string; bearer: string; rt: ReferenceRuntime }
  const register = async (label: string): Promise<Runtime> => {
    const instanceId = randomUUID()
    const cred = newRuntimeCredential()
    await owner.query("SELECT world_runtime_register_instance($1, $2, $3, $4)", [instanceId, WORLD, label, 16])
    await owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [cred.credentialId, instanceId, cred.sha256, 3600])
    const post: IngressTransport["post"] = async (op, body) => {
      const res = await handleRuntimeIngress(
        new Request(`${ORIGIN}/api/runtime/v1/${op}`, { method: "POST", headers: { authorization: `Bearer ${cred.bearer}`, "content-type": "application/json" }, body: JSON.stringify(body) }),
        op,
        { db, mode: "FIXTURE_PREVIEW", facts },
      )
      return { status: res.status, body: (await res.json()) as Record<string, unknown> }
    }
    return { instanceId, bearer: cred.bearer, rt: new ReferenceRuntime({ post }) }
  }
  const enter = async (subjectId: string) => {
    const res = await handleWorldEntryRequest(
      new Request(`${ORIGIN}/api/worlds/${WORLD}/entry`, { method: "POST", body: JSON.stringify({
        schemaVersion: "1.0", contract: "world-entry-intent", intentId: randomUUID(), worldId: WORLD, requestedPlaceId: null, narrativeContext: null,
        client: { surface: "WEB", capabilities: { webgl2: true, touchPrimary: false, viewportClass: "EXPANDED", reducedMotion: false } },
      }) }),
      WORLD, async () => ({ subjectId }), { mode: "FIXTURE_PREVIEW", ledger, db, handoffOrigin: ORIGIN },
    )
    const result = JSON.parse(await res.text()) as WorldEntryResult
    assert.equal(result.outcome, "READY", JSON.stringify(result))
    return result.handoff!.href.slice(`${ORIGIN}${HANDOFF_PATH_PREFIX}`.length)
  }
  const redeemTicket = async (ticket: string) => {
    const res = await handleHandoff(ticket, { db })
    const cookie = res.headers.get("set-cookie")?.match(new RegExp(`${SESSION_COOKIE}=([A-Za-z0-9_-]{43})`))?.[1]
    assert.ok(cookie, "ticket redeemed")
    return cookie
  }
  /** ENTER -> handoff -> runtime claim + ARRIVAL: an authoritative IN_WORLD RuntimeSession. */
  const inWorld = async (r: Runtime, s?: string) => {
    const subj = s ?? (await subject())
    await r.rt.poll()
    const cookie = await redeemTicket(await enter(subj))
    await r.rt.step()
    const v = await handleSessionView(new Request(`${ORIGIN}/world-entry/session`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), { db })
    assert.match(await v.text(), /You are in /, "IN_WORLD")
    return { subject: subj, cookie }
  }

  const post = (p: string, cookie: string | null, body: unknown, headers: Record<string, string> = {}) =>
    new Request(`${ORIGIN}${p}`, {
      method: "POST",
      headers: { origin: ORIGIN, "sec-fetch-site": "same-origin", "content-type": "application/json", ...(cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {}), ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  const issueHttp = async (cookie: string | null, body: unknown = {}, headers: Record<string, string> = {}) => {
    const res = await handleStreamCapabilityIssue(post(STREAM_CAPABILITY_PATH, cookie, body, headers), { db })
    const j = (await res.json()) as Record<string, unknown>
    if (typeof j.capability === "string") plaintexts.push(j.capability)
    return { status: res.status, body: j }
  }
  const issue = async (cookie: string) => {
    const r = await issueHttp(cookie)
    assert.equal(r.status, 201, JSON.stringify(r.body))
    return r.body.capability as string
  }
  const authorizeHttp = async (cookie: string | null, capability: unknown, worldId: unknown = WORLD, headers: Record<string, string> = {}) => {
    const res = await handleStreamAuthorize(post(STREAM_AUTHORIZE_PATH, cookie, { capability, worldId }, headers), { db })
    const j = (await res.json()) as Record<string, unknown>
    if (typeof j.authorization === "string") plaintexts.push(j.authorization)
    return { status: res.status, body: j }
  }
  /** Direct DB call as the Platform credential: exposes the precise refusal code. */
  const redeemCode = async (capability: string, cookie: string, worldId = WORLD) => {
    try {
      await db.streamCapabilityRedeem(sha256(capability), sha256(cookie), worldId, sha256(newSecret()))
      return "AUTHORIZED"
    } catch (e) {
      return (e as EntryAuthorityError).code
    }
  }
  const issueCode = async (cookie: string) => {
    const c = newSecret()
    try {
      await db.streamCapabilityIssue(sha256(cookie), sha256(c))
      plaintexts.push(c)
      return "ISSUED"
    } catch (e) {
      return (e as EntryAuthorityError).code
    }
  }
  const capRow = async (capability: string) => (await su.query("SELECT * FROM world_stream_capabilities WHERE capability_sha256 = $1", [sha256(capability)])).rows[0]
  const capCount = async () => Number((await su.query("SELECT count(*) n FROM world_stream_capabilities")).rows[0].n)
  const sessionOf = async (cookie: string) => (await su.query("SELECT * FROM world_runtime_sessions WHERE view_sha256 = $1", [sha256(cookie)])).rows[0]
  /** md5 of every public table's full contents except the capability store. */
  const stateDigest = async () => {
    const tables = (await su.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'world_stream_capabilities' ORDER BY 1`)).rows.map((r) => r.tablename as string)
    const out: Record<string, string> = {}
    for (const t of tables) out[t] = (await su.query(`SELECT md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) d FROM ${pg.escapeIdentifier(t)} x`)).rows[0].d
    return out
  }

  /** Presence evidence (and, consistently, the arrival) older than the 120 s grace. */
  const agePastGrace = async (s: string) => {
    await su.query("UPDATE world_visit_presence SET last_presence_at = now() - interval '121 seconds', opened_at = LEAST(opened_at, now() - interval '121 seconds') WHERE subject_id = $1 AND closed_at IS NULL", [s])
    await su.query("UPDATE world_visitor_continuity SET last_entered_at = LEAST(last_entered_at, now() - interval '131 seconds') WHERE subject_id = $1", [s])
  }

  let rt: Runtime
  const evidence: Record<string, unknown> = {}

  describe("migration 043 — stream connection capability authority (real Postgres)", () => {
    before(async () => {
      ;({ su, owner } = await createSupabaseShapedDb(url, dbName, { through040: true }))
      await owner.query(readFileSync(path.join(here, "../../supabase/migrations/043_world_stream_capability_authority.sql"), "utf8"))
      await owner.query(`ALTER ROLE worldk_platform_entry_preview LOGIN PASSWORD '${scramVerifier(PLATFORM_PW)}'`)
      db = new PgEntryAuthorityDb(urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW), { allowLocal: true, ssl: false })
      rt = await register("m14b3-runtime")
    })
    after(async () => {
      if (process.env.M14B3_EVIDENCE_FILE) writeFileSync(process.env.M14B3_EVIDENCE_FILE, JSON.stringify(evidence, null, 2) + "\n")
      await db?.end()
      await owner?.end()
      await su?.end()
    })

    test("P1. IN_WORLD -> issue (60 s, hash only, bound to session/subject/world) -> redeem once -> opaque AUTHORIZED", async () => {
      const { subject: s, cookie } = await inWorld(rt)
      const before = await stateDigest()
      const issued = await issueHttp(cookie)
      assert.equal(issued.status, 201)
      assert.deepEqual(Object.keys(issued.body).sort(), ["capability", "expiresInSeconds", "status", "worldId"])
      assert.equal(issued.body.status, "ISSUED")
      assert.equal(issued.body.expiresInSeconds, 60)
      assert.equal(issued.body.worldId, WORLD)
      const cap = issued.body.capability as string
      const row = await capRow(cap)
      const sess = await sessionOf(cookie)
      assert.equal(row.session_id, sess.session_id)
      assert.equal(row.subject_id, s)
      assert.equal(row.world_id, WORLD)
      assert.equal((row.expires_at.getTime() - row.issued_at.getTime()) / 1000, 60)
      assert.equal(row.consumed_at, null)
      assert.deepEqual(Object.keys(row).sort(), ["authorization_sha256", "capability_sha256", "consumed_at", "expires_at", "issued_at", "session_id", "subject_id", "world_id"], "no plaintext column")
      const ok = await authorizeHttp(cookie, cap)
      assert.equal(ok.status, 200)
      assert.deepEqual(Object.keys(ok.body).sort(), ["authorization", "status"], "opaque result only")
      assert.equal(ok.body.status, "AUTHORIZED")
      assert.match(ok.body.authorization as string, /^[A-Za-z0-9_-]{43}$/)
      const consumed = await capRow(cap)
      assert.ok(consumed.consumed_at)
      assert.deepEqual(consumed.authorization_sha256, sha256(ok.body.authorization as string))
      // no infrastructure / DB identifier in either response
      const text = JSON.stringify([issued.body, ok.body])
      for (const id of [sess.session_id, sess.allocation_id, sess.instance_id, sess.visit_id, s, rt.instanceId]) assert.ok(!text.includes(id), `response leaks ${id}`)
      assert.doesNotMatch(text, /turn:|stun:|wss?:|https?:|\d+\.\d+\.\d+\.\d+|sessionId|visitId|instanceId|allocationId|subjectId|credential|password|service_role/i)
      assert.deepEqual(await stateDigest(), before, "issue + redeem wrote nothing outside the capability store")
      evidence.P1 = { issuedKeys: Object.keys(issued.body).sort(), authorizedKeys: Object.keys(ok.body).sort(), ttlSeconds: 60 }
    })

    test("N1. issuance without an authoritative IN_WORLD session is refused (WAITING, CLAIMED, LEAVING, ENDED, LEFT, expired presence)", async () => {
      const codes: Record<string, string> = {}
      // WAITING: redeemed ticket, runtime has not claimed.
      const s1 = await subject()
      await rt.rt.poll()
      const waiting = await redeemTicket(await enter(s1))
      codes.WAITING = await issueCode(waiting)
      // CLAIMED but not joined (no ARRIVAL accepted).
      rt.rt.setAutoJoin(false)
      await rt.rt.step()
      assert.ok((await sessionOf(waiting)).claimed_at)
      assert.equal((await sessionOf(waiting)).joined_at, null)
      codes.CLAIMED_NOT_JOINED = await issueCode(waiting)
      rt.rt.setAutoJoin(true)
      await rt.rt.step()
      // LEAVING: the visitor asked to leave; the runtime has not departed yet.
      const leaving = await inWorld(rt)
      const lv = await handleLeave(new Request(`${ORIGIN}/world-entry/session/leave`, { method: "POST", headers: { cookie: `${SESSION_COOKIE}=${leaving.cookie}`, origin: ORIGIN, "sec-fetch-site": "same-origin" } }), { db })
      assert.equal(lv.status, 303)
      codes.LEAVING = await issueCode(leaving.cookie)
      // LEFT: the runtime evidenced the departure.
      await rt.rt.step()
      assert.ok((await su.query("SELECT closed_at FROM world_visit_presence WHERE subject_id = $1", [leaving.subject])).rows[0].closed_at)
      codes.LEFT = await issueCode(leaving.cookie)
      // ENDED: superseded by a reconnect (the old session's cookie).
      const recon = await inWorld(rt)
      await rt.rt.disconnect((await sessionOf(recon.cookie)).session_id)
      codes.ENDED_DISCONNECTED = await issueCode(recon.cookie)
      // Presence past grace but not yet swept: read-only refusal, and nothing is written.
      const stale = await inWorld(rt)
      await agePastGrace(stale.subject)
      const digest = await stateDigest()
      codes.PRESENCE_EXPIRED_UNSWEPT = await issueCode(stale.cookie)
      assert.deepEqual(await stateDigest(), digest, "the refusal inferred no timeout (not a lifecycle writer)")
      // Unknown / forged session capability.
      codes.UNKNOWN_SESSION = await issueCode(newSecret())
      for (const [k, v] of Object.entries(codes)) assert.equal(v, k === "UNKNOWN_SESSION" ? "SESSION_NOT_FOUND" : "STREAM_SESSION_NOT_IN_WORLD", k)
      // HTTP: every such refusal is the same opaque 403.
      for (const c of [leaving.cookie, recon.cookie, stale.cookie, newSecret()]) assert.deepEqual(await issueHttp(c), { status: 403, body: { status: "REFUSED" } })
      assert.deepEqual(await issueHttp(null), { status: 403, body: { status: "REFUSED" } })
      evidence.N1 = codes
    })

    test("N2. issuance cannot name another subject: the body names nothing, the function takes no subject, bindings come from the session", async () => {
      const a = await inWorld(rt)
      const b = await inWorld(rt)
      const n = await capCount()
      for (const body of [{ subjectId: b.subject }, { sessionId: randomUUID() }, { worldId: WORLD }, [], "null", "{", ""]) {
        const r = await issueHttp(a.cookie, body)
        assert.equal(r.status, 400, JSON.stringify(body))
      }
      const wrongType = await handleStreamCapabilityIssue(post(STREAM_CAPABILITY_PATH, a.cookie, {}, { "content-type": "text/plain" }), { db })
      assert.equal(wrongType.status, 400)
      assert.equal(await capCount(), n, "no capability issued")
      const args = (await su.query("SELECT pg_get_function_identity_arguments('world_stream_capability_issue(bytea,bytea)'::regprocedure) a")).rows[0].a
      assert.equal(args, "p_view_sha256 bytea, p_capability_sha256 bytea", "no subject/session/world parameter")
      const capA = await issue(a.cookie)
      assert.equal((await capRow(capA)).subject_id, a.subject)
      assert.notEqual((await capRow(capA)).subject_id, b.subject)
      evidence.N2 = { issueArgs: args }
    })

    test("N3. redemption from a wrong / absent / null Origin or a cross-site fetch is refused and does not consume", async () => {
      const a = await inWorld(rt)
      const cap = await issue(a.cookie)
      const cases: Record<string, Record<string, string>> = {
        foreignOrigin: { origin: "https://worldk.avatark.ai" },
        attackerOrigin: { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
        nullOrigin: { origin: "null" },
        httpDowngrade: { origin: "http://platform-preview.avatark.ai" },
        sameSiteNotSameOrigin: { "sec-fetch-site": "same-site" },
      }
      const statuses: Record<string, number> = {}
      for (const [k, h] of Object.entries(cases)) statuses[k] = (await authorizeHttp(a.cookie, cap, WORLD, h)).status
      const noOrigin = await handleStreamAuthorize(new Request(`${ORIGIN}${STREAM_AUTHORIZE_PATH}`, { method: "POST", headers: { cookie: `${SESSION_COOKIE}=${a.cookie}`, "content-type": "application/json" }, body: JSON.stringify({ capability: cap, worldId: WORLD }) }), { db })
      statuses.absentOrigin = noOrigin.status
      for (const [k, v] of Object.entries(statuses)) assert.equal(v, 403, k)
      // the same checks guard issuance
      for (const h of Object.values(cases)) assert.equal((await issueHttp(a.cookie, {}, h)).status, 403)
      assert.equal((await capRow(cap)).consumed_at, null, "refusals did not consume")
      assert.equal((await authorizeHttp(a.cookie, cap)).status, 200, "the capability is still usable by its owner")
      evidence.N3 = statuses
    })

    test("N4. malformed and forged capabilities are refused", async () => {
      const a = await inWorld(rt)
      const real = await issue(a.cookie)
      const codes: Record<string, string> = {}
      codes.forgedWellFormed = await redeemCode(newSecret(), a.cookie)
      codes.hashOfSessionCookie = await redeemCode(a.cookie, a.cookie) // the session capability is not a stream capability
      for (const bad of ["", "x", real.slice(0, 42), real + "A", real.replace(/.$/, "!"), 42, null, { capability: real }]) {
        const r = await authorizeHttp(a.cookie, bad)
        assert.ok(r.status === 403 || r.status === 400, `${JSON.stringify(bad)} -> ${r.status}`)
        assert.notEqual(r.body.status, "AUTHORIZED")
      }
      for (const bad of ["{", "[]", JSON.stringify({ capability: real }), JSON.stringify({ capability: real, worldId: WORLD, extra: 1 })]) {
        const res = await handleStreamAuthorize(post(STREAM_AUTHORIZE_PATH, a.cookie, bad), { db })
        assert.equal(res.status, 400, bad)
      }
      // wrong-length hashes at the DB boundary
      await assert.rejects(db.streamCapabilityRedeem(Buffer.alloc(31), sha256(a.cookie), WORLD, sha256(newSecret())), (e: EntryAuthorityError) => e.code === "STREAM_CAPABILITY_INVALID")
      await assert.rejects(db.streamCapabilityRedeem(sha256(real), sha256(a.cookie), WORLD, Buffer.alloc(0)), (e: EntryAuthorityError) => e.code === "STREAM_CAPABILITY_INVALID")
      await assert.rejects(db.streamCapabilityIssue(sha256(a.cookie), Buffer.alloc(16)), (e: EntryAuthorityError) => e.code === "STREAM_CAPABILITY_INVALID")
      assert.equal(codes.forgedWellFormed, "STREAM_CAPABILITY_INVALID")
      assert.equal(codes.hashOfSessionCookie, "STREAM_CAPABILITY_INVALID")
      assert.equal((await capRow(real)).consumed_at, null)
      evidence.N4 = codes
    })

    test("N5. an expired capability is refused (TTL 60 s is enforced by the schema)", async () => {
      const a = await inWorld(rt)
      const cap = await issue(a.cookie)
      await su.query("UPDATE world_stream_capabilities SET issued_at = issued_at - interval '61 seconds', expires_at = expires_at - interval '61 seconds' WHERE capability_sha256 = $1", [sha256(cap)])
      assert.equal(await redeemCode(cap, a.cookie), "STREAM_CAPABILITY_EXPIRED")
      assert.deepEqual(await authorizeHttp(a.cookie, cap), { status: 403, body: { status: "REFUSED" } })
      assert.equal((await capRow(cap)).consumed_at, null)
      // a longer lifetime cannot be stored
      await assert.rejects(su.query("UPDATE world_stream_capabilities SET expires_at = expires_at + interval '1 second' WHERE capability_sha256 = $1", [sha256(cap)]), /world_stream_capabilities_ttl/)
      evidence.N5 = { expired: "STREAM_CAPABILITY_EXPIRED" }
    })

    test("N6. a second redemption is refused", async () => {
      const a = await inWorld(rt)
      const cap = await issue(a.cookie)
      assert.equal((await authorizeHttp(a.cookie, cap)).status, 200)
      const firstConsumed = (await capRow(cap)).consumed_at
      assert.equal(await redeemCode(cap, a.cookie), "STREAM_CAPABILITY_CONSUMED")
      assert.deepEqual(await authorizeHttp(a.cookie, cap), { status: 403, body: { status: "REFUSED" } })
      assert.deepEqual((await capRow(cap)).consumed_at, firstConsumed, "replay changed nothing")
      evidence.N6 = { replay: "STREAM_CAPABILITY_CONSUMED" }
    })

    test("N7. concurrent double redemption -> exactly one succeeds (held-lock proof + 16-way race)", async () => {
      const a = await inWorld(rt)
      // (a) deterministic: T1 redeems inside an open transaction; T2 must block, then see CONSUMED.
      const cap = await issue(a.cookie)
      const t1 = new pg.Client({ connectionString: urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW) })
      const t2 = new pg.Client({ connectionString: urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW) })
      await t1.connect()
      await t2.connect()
      const q = "SELECT * FROM world_stream_capability_redeem($1, $2, $3, $4)"
      try {
        await t1.query("BEGIN")
        await t1.query(`SET LOCAL ROLE ${ENTRY_AUTHORITY_ROLE}`)
        assert.equal((await t1.query(q, [sha256(cap), sha256(a.cookie), WORLD, sha256(newSecret())])).rows[0].outcome, "AUTHORIZED")
        await t2.query("BEGIN")
        await t2.query(`SET LOCAL ROLE ${ENTRY_AUTHORITY_ROLE}`)
        const pid2 = (await t2.query("SELECT pg_backend_pid() p")).rows[0].p
        const second = t2.query(q, [sha256(cap), sha256(a.cookie), WORLD, sha256(newSecret())]).then(() => "AUTHORIZED", (e) => e.message as string)
        let waiting = false
        for (let i = 0; i < 50 && !waiting; i++) {
          waiting = (await su.query("SELECT wait_event_type = 'Lock' w FROM pg_stat_activity WHERE pid = $1", [pid2])).rows[0]?.w === true
          if (!waiting) await new Promise((r) => setTimeout(r, 20))
        }
        assert.ok(waiting, "T2 is blocked behind T1")
        await t1.query("COMMIT")
        assert.equal(await second, "STREAM_CAPABILITY_CONSUMED")
        await t2.query("ROLLBACK")
      } finally {
        await t1.end()
        await t2.end()
      }
      // (b) race: 16 independent connections redeem one fresh capability at once.
      const cap2 = await issue(a.cookie)
      const pools = Array.from({ length: 8 }, () => new PgEntryAuthorityDb(urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW), { allowLocal: true, ssl: false }))
      try {
        const results = await Promise.all(Array.from({ length: 16 }, (_, i) =>
          pools[i % 8].streamCapabilityRedeem(sha256(cap2), sha256(a.cookie), WORLD, sha256(newSecret())).then(() => "AUTHORIZED", (e: EntryAuthorityError) => e.code)))
        assert.equal(results.filter((r) => r === "AUTHORIZED").length, 1, results.join(","))
        assert.equal(results.filter((r) => r === "STREAM_CAPABILITY_CONSUMED").length, 15, results.join(","))
        evidence.N7 = { heldLock: "T2 blocked on Lock, then STREAM_CAPABILITY_CONSUMED", race: { attempts: 16, authorized: 1, consumed: 15 } }
      } finally {
        await Promise.all(pools.map((p) => p.end()))
      }
    })

    test("N8. subject / session / world mismatch is refused (and a refusal neither consumes nor burns)", async () => {
      const a = await inWorld(rt)
      const b = await inWorld(rt)
      const capA = await issue(a.cookie)
      const codes: Record<string, string> = {}
      codes.wrongSubject = await redeemCode(capA, b.cookie) // B's live session presents A's capability
      codes.wrongWorld = await redeemCode(capA, a.cookie, "living-vrindavan")
      codes.noSession = await redeemCode(capA, newSecret())
      // same subject, different session: A reconnects; the capability from the old session is not the new session's.
      const oldCookie = a.cookie
      await rt.rt.disconnect((await sessionOf(oldCookie)).session_id)
      const capOld = capA
      const newCookie = await redeemTicket(await enter(a.subject))
      await rt.rt.step()
      assert.equal((await sessionOf(newCookie)).subject_id, a.subject)
      codes.wrongSessionSameSubject = await redeemCode(capOld, newCookie)
      for (const [k, v] of Object.entries(codes)) assert.equal(v, "STREAM_CAPABILITY_BINDING_MISMATCH", k)
      assert.deepEqual(await authorizeHttp(b.cookie, capA), { status: 403, body: { status: "REFUSED" } })
      assert.deepEqual(await authorizeHttp(a.cookie, capA, "living-vrindavan"), { status: 403, body: { status: "REFUSED" } })
      assert.equal((await capRow(capA)).consumed_at, null, "mismatches wrote nothing")
      // reconnect needs a NEW capability from the current session
      assert.equal(await redeemCode(capOld, oldCookie), "STREAM_SESSION_NOT_IN_WORLD", "the old session is no longer IN_WORLD")
      const capNew = await issue(newCookie)
      assert.equal((await capRow(capNew)).session_id, (await sessionOf(newCookie)).session_id)
      assert.equal((await authorizeHttp(newCookie, capNew)).status, 200)
      // B's own capability works for B only
      const capB = await issue(b.cookie)
      assert.equal(await redeemCode(capB, newCookie), "STREAM_CAPABILITY_BINDING_MISMATCH")
      assert.equal((await authorizeHttp(b.cookie, capB)).status, 200)
      evidence.N8 = codes
    })

    test("N9. an ended / departed session cannot obtain or use a capability", async () => {
      const codes: Record<string, string> = {}
      // issued while IN_WORLD, then the visitor departs before redeeming
      const a = await inWorld(rt)
      const capA = await issue(a.cookie)
      await handleLeave(new Request(`${ORIGIN}/world-entry/session/leave`, { method: "POST", headers: { cookie: `${SESSION_COOKIE}=${a.cookie}`, origin: ORIGIN, "sec-fetch-site": "same-origin" } }), { db })
      codes.leaveRequestedUse = await redeemCode(capA, a.cookie)
      await rt.rt.step() // runtime DEPARTURE
      codes.departedUse = await redeemCode(capA, a.cookie)
      codes.departedIssue = await issueCode(a.cookie)
      // presence timeout closed by the sweeper
      const b = await inWorld(rt)
      const capB = await issue(b.cookie)
      await agePastGrace(b.subject)
      codes.presenceExpiredUse = await redeemCode(capB, b.cookie)
      assert.equal(await db.sweep(100) >= 1, true)
      codes.timedOutUse = await redeemCode(capB, b.cookie)
      codes.timedOutIssue = await issueCode(b.cookie)
      // runtime disconnect ends the session
      const c = await inWorld(rt)
      const capC = await issue(c.cookie)
      await rt.rt.disconnect((await sessionOf(c.cookie)).session_id)
      codes.disconnectedUse = await redeemCode(capC, c.cookie)
      // runtime instance revoked
      const other = await register("m14b3-revoked")
      // make the shared runtime momentarily ineligible so ENTER allocates on `other`
      await su.query("UPDATE world_runtime_instances SET last_seen_at = now() - interval '1 hour' WHERE instance_id = $1", [rt.instanceId])
      const d = await inWorld(other)
      assert.equal((await sessionOf(d.cookie)).instance_id, other.instanceId)
      const capD = await issue(d.cookie)
      await owner.query("SELECT world_runtime_revoke_instance($1)", [other.instanceId])
      codes.instanceRevokedUse = await redeemCode(capD, d.cookie)
      for (const [k, v] of Object.entries(codes)) assert.equal(v, "STREAM_SESSION_NOT_IN_WORLD", k)
      for (const cap of [capA, capB, capC, capD]) assert.equal((await capRow(cap)).consumed_at, null)
      evidence.N9 = codes
    })

    test("N10. a capability is not M14 lifecycle authority: every lifecycle entry point refuses it", async () => {
      const a = await inWorld(rt)
      const cap = await issue(a.cookie)
      const h = sha256(cap)
      const before = await stateDigest()
      const codeOf = (p: Promise<unknown>) => p.then(() => "ACCEPTED", (e: EntryAuthorityError) => e.code)
      const codes: Record<string, string> = {
        redeemTicket: await codeOf(db.redeemTicket(h, sha256(newSecret()))),
        sessionView: await codeOf(db.sessionView(h)),
        requestLeave: await codeOf(db.requestLeave(h)),
        runtimePollAsSecret: await codeOf(db.runtimePoll(randomUUID(), h, "READY")),
        runtimeArrivalAsSecret: await codeOf(db.runtimeArrival(randomUUID(), h, randomUUID(), (await sessionOf(a.cookie)).session_id, WORLD, 1)),
        runtimeDepartureAsSecret: await codeOf(db.runtimeDeparture(randomUUID(), h, randomUUID(), (await sessionOf(a.cookie)).session_id, WORLD, 1)),
      }
      assert.equal(codes.redeemTicket, "TICKET_INVALID")
      assert.equal(codes.sessionView, "SESSION_NOT_FOUND")
      assert.equal(codes.requestLeave, "SESSION_NOT_FOUND")
      for (const k of ["runtimePollAsSecret", "runtimeArrivalAsSecret", "runtimeDepartureAsSecret"]) assert.equal(codes[k], "RUNTIME_CREDENTIAL_INVALID", k)
      // as a Runtime Ingress bearer and as a gateway session cookie
      const ingress = await handleRuntimeIngress(new Request(`${ORIGIN}/api/runtime/v1/departure`, { method: "POST", headers: { authorization: `Bearer ${cap}`, "content-type": "application/json" }, body: "{}" }), "departure", { db, mode: "FIXTURE_PREVIEW", facts })
      codes.ingressBearer = String(ingress.status)
      assert.equal(ingress.status, 401)
      const asCookie = await handleLeave(new Request(`${ORIGIN}/world-entry/session/leave`, { method: "POST", headers: { cookie: `${SESSION_COOKIE}=${cap}`, origin: ORIGIN, "sec-fetch-site": "same-origin" } }), { db })
      codes.leaveWithCapabilityAsCookie = String(asCookie.status)
      assert.equal(asCookie.status, 404)
      assert.deepEqual(await stateDigest(), before, "nothing moved")
      assert.equal((await capRow(cap)).consumed_at, null)
      evidence.N10 = codes
    })

    test("N11. issue/redeem cannot mutate world state or visitor continuity (full public-schema digest)", async () => {
      const a = await inWorld(rt)
      const cont = (await su.query("SELECT * FROM world_visitor_continuity WHERE subject_id = $1", [a.subject])).rows[0]
      const before = await stateDigest()
      for (let i = 0; i < 3; i++) {
        const cap = await issue(a.cookie)
        assert.equal((await authorizeHttp(a.cookie, cap)).status, 200)
        await redeemCode(cap, a.cookie) // replay
      }
      await issueCode(newSecret())
      const after = await stateDigest()
      assert.deepEqual(after, before)
      assert.deepEqual((await su.query("SELECT * FROM world_visitor_continuity WHERE subject_id = $1", [a.subject])).rows[0], cont)
      // the functions contain no write to any other table
      const src = readFileSync(path.join(here, "../../supabase/migrations/043_world_stream_capability_authority.sql"), "utf8").replace(/--.*$/gm, "")
      const writes = [...src.matchAll(/\b(INSERT INTO|UPDATE|DELETE FROM|TRUNCATE)\s+([a-z_]+)/g)].map((m) => m[2])
      assert.deepEqual([...new Set(writes)], ["world_stream_capabilities"])
      assert.doesNotMatch(src, /world_m14_(timeout_if_expired|apply_arrival|apply_departure|close_visit|release_abandoned)|record_world_|_v2\(/)
      evidence.N11 = { tablesDigested: Object.keys(after).length, writesIn043: [...new Set(writes)] }
    })

    test("N12. privileges: no API role can read/write the store or call the functions; the Platform role gains EXECUTE on exactly two", async () => {
      const priv = async (sql: string) => (await su.query(sql)).rows
      const tableGrants = await priv(`SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'world_stream_capabilities' AND grantee <> '${OWNER}'`)
      assert.deepEqual(tableGrants, [], "no table grants to anyone but the owner")
      const rls = (await su.query("SELECT relrowsecurity r, (SELECT count(*) FROM pg_policies WHERE tablename = 'world_stream_capabilities') p FROM pg_class WHERE relname = 'world_stream_capabilities'")).rows[0]
      assert.equal(rls.r, true)
      assert.equal(Number(rls.p), 0)
      const fns = ["world_stream_capability_issue(bytea,bytea)", "world_stream_capability_redeem(bytea,bytea,text,bytea)", "world_m14b3_session_in_world(world_runtime_sessions)"]
      const matrix: Record<string, Record<string, boolean>> = {}
      for (const role of ["anon", "authenticated", "service_role", "public", ENTRY_AUTHORITY_ROLE, "worldk_platform_entry_preview"]) {
        matrix[role] = {}
        for (const f of fns) {
          const r = role === "public"
            ? (await su.query(`SELECT EXISTS (SELECT 1 FROM pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE p.oid = $1::regprocedure AND a.grantee = 0 AND a.privilege_type = 'EXECUTE') ok`, [f])).rows[0].ok
            : (await su.query("SELECT has_function_privilege($1, $2, 'EXECUTE') ok", [role, f])).rows[0].ok
          matrix[role][f] = r
        }
        if (role !== "public") matrix[role].tableSelect = (await su.query("SELECT has_table_privilege($1, 'world_stream_capabilities', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') ok", [role])).rows[0].ok
      }
      for (const role of ["anon", "authenticated", "service_role", "public"]) for (const [k, v] of Object.entries(matrix[role])) assert.equal(v, false, `${role} ${k}`)
      assert.equal(matrix[ENTRY_AUTHORITY_ROLE][fns[0]], true)
      assert.equal(matrix[ENTRY_AUTHORITY_ROLE][fns[1]], true)
      assert.equal(matrix[ENTRY_AUTHORITY_ROLE][fns[2]], false)
      assert.equal(matrix[ENTRY_AUTHORITY_ROLE].tableSelect, false)
      // NOINHERIT credential: only via SET ROLE
      assert.equal(matrix.worldk_platform_entry_preview[fns[0]], false)
      assert.equal(matrix.worldk_platform_entry_preview.tableSelect, false)
      // definer discipline
      const defs = (await su.query(`SELECT proname, prosecdef, proconfig FROM pg_proc WHERE proname IN ('world_stream_capability_issue','world_stream_capability_redeem','world_m14b3_session_in_world') ORDER BY 1`)).rows
      for (const d of defs) {
        assert.equal(d.prosecdef, true, d.proname)
        assert.deepEqual(d.proconfig, ["search_path=pg_catalog, public"], d.proname)
      }
      // an API role cannot reach it even by SET ROLE on the owner-less path
      for (const role of ["anon", "authenticated", "service_role"]) {
        const c = new pg.Client({ connectionString: urlFor(url, dbName) })
        await c.connect()
        try {
          await c.query("BEGIN")
          await c.query(`SET LOCAL ROLE ${role}`)
          await assert.rejects(c.query("SELECT * FROM world_stream_capabilities"), /permission denied/)
          await c.query("ROLLBACK")
          await c.query("BEGIN")
          await c.query(`SET LOCAL ROLE ${role}`)
          await assert.rejects(c.query("SELECT * FROM world_stream_capability_issue($1, $2)", [sha256("x"), sha256("y")]), /permission denied/)
          await c.query("ROLLBACK")
        } finally {
          await c.end()
        }
      }
      // the postgres/owner session is not the Platform credential: the gate refuses it
      await assert.rejects(owner.query("SELECT * FROM world_stream_capability_issue($1, $2)", [sha256("x"), sha256("y")]), /AUTHORITY_INVALID/)
      // the Platform role gained EXECUTE on exactly the two 043 entry points (vs the 040 set)
      const granted = (await su.query(`SELECT p.proname FROM pg_proc p, aclexplode(p.proacl) a WHERE a.grantee = $1::regrole AND a.privilege_type = 'EXECUTE' AND p.proname LIKE 'world_stream_%' ORDER BY 1`, [ENTRY_AUTHORITY_ROLE])).rows.map((r) => r.proname)
      assert.deepEqual(granted, ["world_stream_capability_issue", "world_stream_capability_redeem"])
      evidence.N12 = { tableGrants, rls: { enabled: rls.r, policies: Number(rls.p) }, matrix }
    })

    test("N13. capability / authorization plaintext is absent from every table and from the DB server's statement/activity views", async () => {
      assert.ok(plaintexts.length >= 20, `collected ${plaintexts.length}`)
      const tables = (await su.query(`SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('public', 'auth') ORDER BY 1, 2`)).rows
      const hits: string[] = []
      for (const t of tables) {
        const rows = (await su.query(`SELECT x::text t FROM ${pg.escapeIdentifier(t.schemaname)}.${pg.escapeIdentifier(t.tablename)} x`)).rows
        const blob = rows.map((r) => r.t).join("\n")
        for (const p of plaintexts) if (blob.includes(p) || blob.includes(Buffer.from(p).toString("hex"))) hits.push(`${t.tablename}`)
      }
      const act = (await su.query("SELECT string_agg(coalesce(query, ''), '\n') q FROM pg_stat_activity")).rows[0].q ?? ""
      for (const p of plaintexts) if (act.includes(p)) hits.push("pg_stat_activity")
      assert.deepEqual(hits, [])
      // the hashes are what is stored
      const stored = Number((await su.query("SELECT count(*) n FROM world_stream_capabilities WHERE capability_sha256 = ANY($1)", [plaintexts.map((p) => sha256(p))])).rows[0].n)
      assert.ok(stored > 0)
      evidence.N13 = { plaintextsChecked: plaintexts.length, tablesScanned: tables.length, hits: hits.length, hashedRowsMatched: stored }
      if (process.env.M14B3_PLAINTEXT_FILE) writeFileSync(process.env.M14B3_PLAINTEXT_FILE, plaintexts.join("\n") + "\n", { mode: 0o600 })
    })
  })
}
