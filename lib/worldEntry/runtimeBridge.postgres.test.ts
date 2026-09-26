// WORLDK-M14-B1 conformance: the RuntimeBridge fixtures executed against the
// REAL M14-A authority (037..040, real Postgres), through the real Runtime
// Ingress handler, entry resolver, handoff gateway and presence sweep.
//
// Every renderer step is an untrusted versioned message: it is parsed, mapped
// by commandFor (the ONLY translation), and only then sent to the ingress. The
// fixtures state the expected ingress op, reply outcome, bridge state and the
// resulting lifecycle. This proves the contract is compatible with A3 (entry,
// receipts, Leave), A5 (expiry) and the reconnect/disconnect semantics, with
// no change to any of them.
//
// Requires WORLD_CONSUMER_TEST_DATABASE_URL (superuser URL, DISPOSABLE local
// server). Skipped visibly when unset.
import { after, before, describe, test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"
import type { WorldEntryResult } from "@avatark/world-consumer-contracts"
import { createLivingForestFixtureFactSource } from "../worldConsumer/facts.ts"
import type { ContinuityRecord, VisitorContinuityLedger } from "../worldConsumer/continuityLedger.ts"
import { assertLocalUrl, createSupabaseShapedDb, urlFor } from "../worldConsumer/testing/supabaseShapedDb.ts"
import { PgEntryAuthorityDb, type RuntimePollResult } from "./authorityDb.ts"
import { newRuntimeCredential } from "./credentials.ts"
import { handleHandoff, handleLeave, SESSION_COOKIE } from "./gateway.ts"
import { handleWorldEntryRequest, HANDOFF_PATH_PREFIX } from "./resolver.ts"
import { handleRuntimeIngress, type RuntimeOp } from "./runtimeIngress.ts"
import { commandFor, parseBridgeMessage, RUNTIME_BRIDGE_PROTOCOL, RUNTIME_BRIDGE_SCHEMA_VERSION, stateAfterReply, type BridgeSessionState } from "./runtimeBridgeProtocol.ts"
import { scramVerifier } from "../../scripts/worldk-m14-runtime-registry.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const FIX = path.join(here, "runtimeBridgeFixtures")
const url = process.env.WORLD_CONSUMER_TEST_DATABASE_URL
// Shared with the other M14 suites: the role is cluster-wide and suites run in parallel.
const PLATFORM_PW = "m14-platform-credential-local-only"
const WORLD = "living-forest"
const ORIGIN = "https://platform-preview.avatark.ai"

interface Step {
  platform?: "ENTER_AND_REDEEM" | "GATEWAY_LEAVE" | "AGE_PAST_GRACE_AND_SWEEP"
  as?: string
  expectReconnect?: boolean
  expectTimedOut?: number
  renderer?: Record<string, unknown>
  session?: string
  expectOp?: RuntimeOp
  expectOutcome?: string
  expectState?: BridgeSessionState
  expectRefused?: string
  expectNoOp?: string
  expectEndedByPlatform?: boolean
  expectWorkLeaveRequested?: string
  expectLifecycle?: { visitOpen?: boolean; visitCount?: number; basis?: string; events?: string[]; sameVisit?: string[]; noContinuityRow?: boolean; departureAtLastPresence?: boolean }
}

if (!url) {
  test("M14-B1 RuntimeBridge conformance (skipped: WORLD_CONSUMER_TEST_DATABASE_URL not set)", { skip: true }, () => {})
} else {
  assertLocalUrl(url)
  const dbName = `m14b1_${Date.now()}`
  let su: pg.Client
  let owner: pg.Client
  let db: PgEntryAuthorityDb
  const facts = createLivingForestFixtureFactSource()
  const ledger: VisitorContinuityLedger = {
    async get(worldId, subjectId): Promise<ContinuityRecord | null> {
      const r = (await su.query("SELECT * FROM world_visitor_continuity WHERE world_id = $1 AND subject_id = $2", [worldId, subjectId])).rows[0]
      return r ? ({ worldId, subjectId, visitCount: r.visit_count, lastPlaceId: r.last_place_id } as ContinuityRecord) : null
    },
    recordConfirmedEntry: () => Promise.reject(new Error("read-only")),
    recordLeave: () => Promise.reject(new Error("read-only")),
  }

  async function runScenario(file: string) {
    const fx = JSON.parse(readFileSync(path.join(FIX, file), "utf8")) as { steps: Step[] }
    // A fresh subject and a fresh runtime instance; every other instance is made stale so the resolver allocates here.
    await su.query("UPDATE world_runtime_instances SET last_seen_at = now() - interval '1 hour' WHERE last_seen_at IS NOT NULL")
    const subject = randomUUID()
    await su.query("INSERT INTO auth.users (id) VALUES ($1)", [subject])
    const instanceId = randomUUID()
    const cred = newRuntimeCredential()
    await owner.query("SELECT world_runtime_register_instance($1, $2, $3, $4)", [instanceId, WORLD, `m14b1-${file.slice(0, 2)}`, 4])
    await owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [cred.credentialId, instanceId, cred.sha256, 3600])
    let ingressCalls = 0
    const post = async (op: RuntimeOp, body: Record<string, unknown>) => {
      ingressCalls++
      const res = await handleRuntimeIngress(new Request(`${ORIGIN}/api/runtime/v1/${op}`, { method: "POST", headers: { authorization: `Bearer ${cred.bearer}`, "content-type": "application/json" }, body: JSON.stringify(body) }), op, { db, mode: "FIXTURE_PREVIEW", facts })
      return { status: res.status, body: (await res.json()) as Record<string, unknown> }
    }
    const sessionOf: Record<string, string> = {}
    const cookieOf: Record<string, string> = {}
    const worldOf: Record<string, string> = {}
    const state: Record<string, BridgeSessionState> = {}
    const sessions = async () => (await su.query("SELECT * FROM world_runtime_sessions WHERE subject_id = $1 ORDER BY redeemed_at", [subject])).rows

    for (const [i, s] of fx.steps.entries()) {
      const at = `${file} step ${i}`
      if (s.platform === "ENTER_AND_REDEEM") {
        const res = await handleWorldEntryRequest(new Request(`${ORIGIN}/api/worlds/${WORLD}/entry`, { method: "POST", body: JSON.stringify({
          schemaVersion: "1.0", contract: "world-entry-intent", intentId: randomUUID(), worldId: WORLD, requestedPlaceId: null, narrativeContext: null,
          client: { surface: "WEB", capabilities: { webgl2: true, touchPrimary: false, viewportClass: "EXPANDED", reducedMotion: false } },
        }) }), WORLD, async () => ({ subjectId: subject }), { mode: "FIXTURE_PREVIEW", ledger, db, handoffOrigin: ORIGIN })
        const r = JSON.parse(await res.text()) as WorldEntryResult
        assert.equal(r.outcome, "READY", `${at}: ${JSON.stringify(r)}`)
        const red = await handleHandoff(r.handoff!.href.slice(`${ORIGIN}${HANDOFF_PATH_PREFIX}`.length), { db })
        assert.equal(red.status, 303, at)
        cookieOf[s.as!] = red.headers.get("set-cookie")!.match(new RegExp(`${SESSION_COOKIE}=([A-Za-z0-9_-]{43})`))![1]!
        const newest = (await sessions()).at(-1)
        sessionOf[s.as!] = newest.session_id
        if (s.expectReconnect !== undefined) assert.equal(newest.reconnect, s.expectReconnect, `${at}: reconnect`)
        continue
      }
      if (s.platform === "GATEWAY_LEAVE") {
        const res = await handleLeave(new Request(`${ORIGIN}/world-entry/session/leave`, { method: "POST", headers: { cookie: `${SESSION_COOKIE}=${cookieOf[s.session!]}`, origin: ORIGIN, "sec-fetch-site": "same-origin" } }), { db })
        assert.equal(res.status, 303, at)
        continue
      }
      if (s.platform === "AGE_PAST_GRACE_AND_SWEEP") {
        await su.query("UPDATE world_visit_presence SET last_presence_at = now() - interval '125 seconds', opened_at = LEAST(opened_at, now() - interval '125 seconds') WHERE subject_id = $1 AND closed_at IS NULL", [subject])
        await su.query("UPDATE world_visitor_continuity SET last_entered_at = LEAST(last_entered_at, now() - interval '135 seconds') WHERE subject_id = $1", [subject])
        assert.equal(await db.sweep(100), s.expectTimedOut, `${at}: the Platform sweep (A5 authority)`)
        continue
      }
      if (s.renderer) {
        const alias = s.session
        const message = { protocol: RUNTIME_BRIDGE_PROTOCOL, schemaVersion: RUNTIME_BRIDGE_SCHEMA_VERSION, event: { ...s.renderer, ...(alias ? { sessionId: sessionOf[alias] } : {}) } }
        const parsed = parseBridgeMessage(message)
        assert.equal(parsed.status, "ACCEPTED", at)
        if (parsed.status !== "ACCEPTED") continue
        const prior = alias ? (state[alias] ?? "UNCLAIMED") : "UNCLAIMED"
        const cmd = commandFor(parsed.event, prior, { receiptId: randomUUID(), worldId: alias ? worldOf[alias] : undefined })
        const before = ingressCalls
        if (s.expectRefused) {
          assert.deepEqual(cmd, { kind: "REFUSED", reason: s.expectRefused }, at)
          assert.equal(ingressCalls, before, `${at}: nothing sent`)
          continue
        }
        if (s.expectNoOp) {
          assert.deepEqual(cmd, { kind: "NO_OP", reason: s.expectNoOp }, at)
          continue
        }
        assert.equal(cmd.kind === "INGRESS" && cmd.op, s.expectOp, `${at}: ${JSON.stringify(cmd)}`)
        if (cmd.kind !== "INGRESS") continue
        const reply = await post(cmd.op, cmd.body)
        if (s.expectOutcome) assert.equal(reply.body.outcome, s.expectOutcome, `${at}: ${JSON.stringify(reply)}`)
        if (cmd.op === "claim" && reply.status === 200) worldOf[alias!] = String(reply.body.worldId) // the Platform's binding, never renderer-chosen
        if (s.expectWorkLeaveRequested) {
          const work = (reply.body as unknown as RuntimePollResult).sessions.find((w) => w.sessionId === sessionOf[s.expectWorkLeaveRequested!])
          assert.equal(work?.leaveRequested, true, `${at}: poll shows the Platform leave request`)
        }
        if (alias) state[alias] = stateAfterReply(cmd, prior, reply)
        if (s.expectState) assert.equal(state[alias!], s.expectState, `${at}: ${JSON.stringify(reply)}`)
        if (s.expectEndedByPlatform) assert.equal(state[alias!], "ENDED_BY_PLATFORM", at)
        continue
      }
      if (s.expectLifecycle) {
        const L = s.expectLifecycle
        const c = (await su.query("SELECT * FROM world_visitor_continuity WHERE world_id = $1 AND subject_id = $2", [WORLD, subject])).rows[0]
        const ev = (await su.query("SELECT * FROM world_visitor_lifecycle_events WHERE subject_id = $1 ORDER BY recorded_at, event_type", [subject])).rows
        if (L.noContinuityRow) assert.equal(c, undefined, `${at}: no continuity row`)
        if (L.visitOpen !== undefined) assert.equal(c.visit_open, L.visitOpen, `${at}: visit_open`)
        if (L.visitCount !== undefined) assert.equal(c.visit_count, L.visitCount, `${at}: visit_count`)
        if (L.basis) assert.equal(c.last_seen_basis, L.basis, `${at}: basis`)
        if (L.events) assert.deepEqual(ev.map((e) => `${e.event_type}/${e.authority_kind}`), L.events, `${at}: events`)
        if (L.sameVisit) {
          const rows = await sessions()
          const visits = L.sameVisit.map((a) => rows.find((r) => r.session_id === sessionOf[a])?.visit_id)
          assert.ok(visits[0] && visits.every((v) => v === visits[0]), `${at}: same visit ${visits}`)
        }
        if (L.departureAtLastPresence) {
          const pr = (await su.query("SELECT last_presence_at FROM world_visit_presence WHERE subject_id = $1 ORDER BY opened_at DESC LIMIT 1", [subject])).rows[0]
          assert.equal(new Date(ev.at(-1).occurred_at).getTime(), new Date(pr.last_presence_at).getTime(), `${at}: departure dated at the last accepted presence`)
        }
      }
    }
  }

  describe("M14-B1 RuntimeBridge conformance against the real M14-A authority", () => {
    before(async () => {
      ;({ su, owner } = await createSupabaseShapedDb(url, dbName, { through040: true }))
      await owner.query(`ALTER ROLE worldk_platform_entry_preview LOGIN PASSWORD '${scramVerifier(PLATFORM_PW)}'`)
      db = new PgEntryAuthorityDb(urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW), { allowLocal: true, ssl: false })
    })
    after(async () => {
      await db?.end()
      await owner?.end()
      await su?.end()
    })
    for (const file of readdirSync(FIX).filter((f) => /^0[1-7]-.*\.json$/.test(f)).sort()) {
      const fx = JSON.parse(readFileSync(path.join(FIX, file), "utf8")) as { scenario: string }
      test(`${file.slice(0, 2)}. ${fx.scenario}`, () => runScenario(file))
    }
  })
}
