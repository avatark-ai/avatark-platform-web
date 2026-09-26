// WORLDK-M14-A unit tests (no database): formats, strict intent parsing,
// Contract 03 mapping, gateway and ingress edge cases, target guard and
// module boundaries.
import { test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { WorldEntryResult } from "@avatark/world-consumer-contracts"
import { forbiddenFieldsIn } from "@avatark/world-consumer-contracts"
import { createLivingForestFixtureFactSource } from "../worldConsumer/facts.ts"
import type { VisitorContinuityLedger } from "../worldConsumer/continuityLedger.ts"
import { createContractValidator, SCHEMA } from "../worldConsumer/testing/schemaValidator.ts"
import { assertEntryAuthorityTarget, EntryAuthorityError, type EntryAuthorityDb, type ResolveInput, type Resolution } from "./authorityDb.ts"
import { formatRuntimeCredential, newRuntimeCredential, newTicket, parseRuntimeBearer, sha256 } from "./credentials.ts"
import { handleHandoff, handleLeave, handleSessionView, SESSION_COOKIE } from "./gateway.ts"
import { handleWorldEntryRequest, parseWorldEntryIntent, type WorldEntryDeps } from "./resolver.ts"
import { handleRuntimeIngress, sweeperKeyMatches } from "./runtimeIngress.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const ORIGIN = "https://platform-preview.avatark.ai"
const validator = createContractValidator()
const SUBJECT = "0b7d4c2e-5a1f-4c3d-9e8f-1a2b3c4d5e6f"

const intent = (over: Record<string, unknown> = {}) => ({
  schemaVersion: "1.0",
  contract: "world-entry-intent",
  intentId: randomUUID(),
  worldId: "living-forest",
  requestedPlaceId: null,
  narrativeContext: null,
  client: { surface: "WEB", capabilities: { webgl2: true, touchPrimary: false, viewportClass: "EXPANDED", reducedMotion: false } },
  ...over,
})

const ledger: VisitorContinuityLedger = {
  get: async () => null,
  recordConfirmedEntry: () => Promise.reject(new Error("read-only")),
  recordLeave: () => Promise.reject(new Error("read-only")),
}

function fakeDb(over: Partial<EntryAuthorityDb> = {}): EntryAuthorityDb & { calls: string[]; lastResolve?: ResolveInput } {
  const calls: string[] = []
  const base = {
    calls,
    lastResolve: undefined as ResolveInput | undefined,
    async resolve(i: ResolveInput): Promise<Resolution> {
      calls.push("resolve")
      base.lastResolve = i
      return { outcome: "READY", reason: null, retryAfterSeconds: null, visitId: randomUUID(), reconnect: false, ticketExpiresAt: new Date(Date.now() + 90_000).toISOString(), arrivalKind: i.arrivalKind, arrivalPlaceId: i.arrivalPlaceId, arrivalReason: i.arrivalReason, requestedPlaceHonored: i.requestedPlaceHonored }
    },
    redeemTicket: async () => (calls.push("redeem"), { outcome: "REDEEMED", sessionId: randomUUID(), worldId: "living-forest" }),
    sessionView: async () => (calls.push("view"), { state: "IN_WORLD" as const, worldId: "living-forest" }),
    requestLeave: async () => void calls.push("leave"),
    runtimePoll: async () => (calls.push("poll"), { heartbeatSeconds: 15, graceSeconds: 120, sessions: [] }),
    runtimeClaim: async () => { throw new Error("unused") },
    runtimeArrival: async (_c: string, _h: Buffer, _r: string, _s: string, _w: string, tick: number) => (calls.push(`arrival:${tick}`), { outcome: "VISIT_OPENED" }),
    runtimePresence: async () => ({ outcome: "PRESENCE_RECORDED" }),
    runtimeDeparture: async () => ({ outcome: "VISIT_CLOSED" }),
    runtimeDisconnect: async () => ({ outcome: "GRACE_RUNNING" }),
    sweep: async () => 0,
    ...over,
  }
  return base
}

const deps = (db: EntryAuthorityDb | null, over: Partial<WorldEntryDeps> = {}): WorldEntryDeps => ({ mode: "FIXTURE_PREVIEW", ledger, db, handoffOrigin: ORIGIN, ...over })
const post = (body: unknown) => new Request(`${ORIGIN}/api/worlds/living-forest/entry`, { method: "POST", body: JSON.stringify(body) })
const asVisitor = async () => ({ subjectId: SUBJECT })

async function enter(body: unknown, d: WorldEntryDeps, visitor: () => Promise<{ subjectId: string } | null> = asVisitor) {
  const res = await handleWorldEntryRequest(post(body), "living-forest", visitor, d)
  const text = await res.text()
  return { res, text, result: JSON.parse(text) as WorldEntryResult }
}

test("formats: tickets and runtime credentials are 256-bit, parse strictly, and only hashes leave the issuer", () => {
  const t = newTicket()
  assert.match(t.secret, /^[A-Za-z0-9_-]{43}$/)
  assert.ok(t.sha256.equals(sha256(t.secret)))
  const c = newRuntimeCredential()
  assert.equal(c.bearer, formatRuntimeCredential(c.credentialId, c.secret))
  const p = parseRuntimeBearer(`Bearer ${c.bearer}`)
  assert.equal(p?.credentialId, c.credentialId)
  assert.ok(p?.secretSha256.equals(c.sha256))
  for (const bad of [null, "", c.bearer, `Basic ${c.bearer}`, `Bearer wkrt2.${c.credentialId}.${c.secret}`, `Bearer wkrt1.${c.credentialId}.${c.secret}x`, `Bearer wkrt1.not-a-uuid.${c.secret}`, `Bearer wkrt1.${c.credentialId}`])
    assert.equal(parseRuntimeBearer(bad), null, String(bad))
})

test("intent parsing is strict: identity or unknown fields are refused", () => {
  assert.ok(parseWorldEntryIntent(intent()))
  for (const extra of [{ subjectId: SUBJECT }, { avatarKId: "x" }, { runtimeInstanceId: "x" }])
    assert.equal(parseWorldEntryIntent({ ...intent(), ...extra }), null)
  assert.equal(parseWorldEntryIntent(intent({ intentId: "nope" })), null)
  assert.equal(parseWorldEntryIntent(intent({ requestedPlaceId: "../x" })), null)
  assert.equal(parseWorldEntryIntent({ ...intent(), client: { surface: "WEB", capabilities: { webgl2: true, touchPrimary: false, viewportClass: "EXPANDED", reducedMotion: false, gpu: "x" } } }), null)
})

test("resolver: READY is Contract 03, opaque, Platform-origin and carries no runtime identifier", async () => {
  const db = fakeDb()
  const { res, text, result } = await enter(intent({ requestedPlaceId: "forest-clearing" }), deps(db))
  assert.equal(res.status, 200)
  assert.equal(res.headers.get("cache-control"), "private, no-store")
  assert.ok(validator.validate(SCHEMA.entry, result).ok, validator.validate(SCHEMA.entry, result).errors)
  assert.deepEqual(forbiddenFieldsIn(result), [])
  assert.equal(result.outcome, "READY")
  assert.match(result.handoff!.href, /^https:\/\/platform-preview\.avatark\.ai\/world-entry\/h\/[A-Za-z0-9_-]{43}$/)
  assert.equal(result.arrival?.kind, "FIRST_VISIT")
  assert.equal(result.arrival?.requestedPlaceHonored, true)
  assert.equal(db.lastResolve?.subjectId, SUBJECT, "subject from the verified session")
  assert.ok(!/visitId|allocation|instance|session/i.test(text))
  // the database receives only the ticket's hash, never the secret
  const secret = result.handoff!.href.split("/").pop()!
  assert.ok(db.lastResolve?.ticketSha256.equals(sha256(secret)))
})

test("resolver: unauthenticated, unknown world, unpublished, unconfigured, failing and conflicting cases", async () => {
  const anon = await enter(intent(), deps(fakeDb()), async () => null)
  assert.equal(anon.res.status, 401)
  assert.equal(anon.result.outcome, "AUTHENTICATION_REQUIRED")
  assert.ok(validator.validate(SCHEMA.entry, anon.result).ok)
  const other = await handleWorldEntryRequest(post(intent({ worldId: "not-a-world" })), "not-a-world", asVisitor, deps(fakeDb()))
  assert.equal(((await other.json()) as WorldEntryResult).unavailable?.reason, "WORLD_NOT_FOUND")
  assert.equal((await enter(intent(), deps(fakeDb(), { mode: "PRODUCTION" }))).result.unavailable?.reason, "NOT_YET_OPEN")
  assert.equal((await enter(intent(), deps(null))).result.unavailable?.reason, "RUNTIME_UNAVAILABLE")
  const failing = fakeDb({ resolve: async () => { throw new EntryAuthorityError("UNAVAILABLE") } })
  assert.equal((await enter(intent(), deps(failing))).result.unavailable?.reason, "RUNTIME_UNAVAILABLE")
  const conflict = fakeDb({ resolve: async () => { throw new EntryAuthorityError("INTENT_CONFLICT") } })
  assert.equal((await enter(intent(), deps(conflict))).res.status, 409)
  const pending = fakeDb({ resolve: async () => ({ outcome: "PENDING", reason: "PREPARING", retryAfterSeconds: 5, visitId: null, reconnect: false, ticketExpiresAt: null, arrivalKind: null, arrivalPlaceId: null, arrivalReason: null, requestedPlaceHonored: null }) })
  const p = await enter(intent(), deps(pending))
  assert.deepEqual(p.result.pending, { reason: "PREPARING", retryAfterSeconds: 5 })
  assert.equal(p.result.handoff, null)
  assert.ok(validator.validate(SCHEMA.entry, p.result).ok)
  // path/body world mismatch and malformed bodies never reach the database
  const guarded = fakeDb()
  assert.equal((await handleWorldEntryRequest(post(intent({ worldId: "other" })), "living-forest", asVisitor, deps(guarded))).status, 400)
  assert.equal((await handleWorldEntryRequest(new Request(`${ORIGIN}/x`, { method: "POST", body: "{" }), "living-forest", asVisitor, deps(guarded))).status, 400)
  assert.deepEqual(guarded.calls, [])
})

test("gateway: malformed tickets never reach the database; cookie is HttpOnly/Secure/Lax; leave is same-origin only", async () => {
  const db = fakeDb()
  assert.equal((await handleHandoff("x", { db })).status, 410)
  assert.equal(db.calls.length, 0)
  const ok = await handleHandoff(newTicket().secret, { db })
  assert.equal(ok.status, 303)
  assert.match(ok.headers.get("set-cookie")!, new RegExp(`^${SESSION_COOKIE}=[A-Za-z0-9_-]{43}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600$`))
  assert.equal(ok.headers.get("referrer-policy"), "no-referrer")
  const cookie = ok.headers.get("set-cookie")!.split(";")[0]
  const page = await handleSessionView(new Request(`${ORIGIN}/world-entry/session`, { headers: { cookie } }), { db })
  const html = await page.text()
  assert.match(html, /You are in Living Forest/)
  assert.match(page.headers.get("content-security-policy")!, /default-src 'none'/)
  const cross = await handleLeave(new Request(`${ORIGIN}/world-entry/session/leave`, { method: "POST", headers: { cookie, origin: "https://evil.example", "sec-fetch-site": "cross-site" } }), { db })
  assert.equal(cross.status, 403)
  assert.ok(!db.calls.includes("leave"))
  const same = await handleLeave(new Request(`${ORIGIN}/world-entry/session/leave`, { method: "POST", headers: { cookie, origin: ORIGIN, "sec-fetch-site": "same-origin" } }), { db })
  assert.equal(same.status, 303)
  assert.ok(db.calls.includes("leave"))
  const refused = fakeDb({ redeemTicket: async () => { throw new EntryAuthorityError("TICKET_ALREADY_REDEEMED") } })
  const r = await handleHandoff(newTicket().secret, { db: refused })
  assert.equal(r.status, 410)
  assert.doesNotMatch(await r.text(), /REDEEMED|TICKET/)
})

test("ingress: no bearer -> 401 before any database call; auth failures are uniform; the tick is the Platform's", async () => {
  const facts = createLivingForestFixtureFactSource()
  const db = fakeDb()
  const req = (op: string, body: unknown, auth?: string) =>
    new Request(`${ORIGIN}/api/runtime/v1/${op}`, { method: "POST", headers: auth ? { authorization: auth } : {}, body: JSON.stringify(body) })
  const cred = `Bearer ${newRuntimeCredential().bearer}`
  const d = { db, mode: "FIXTURE_PREVIEW" as const, facts }
  assert.equal((await handleRuntimeIngress(req("poll", { readiness: "READY" }), "poll", d)).status, 401)
  assert.deepEqual(db.calls, [])
  assert.equal((await handleRuntimeIngress(req("register", {}, cred), "register", d)).status, 404)
  // runtime-supplied tick/time/subject are ignored: only sessionId/receiptId/worldId are read
  const r = await handleRuntimeIngress(req("arrival", { receiptId: randomUUID(), sessionId: randomUUID(), worldId: "living-forest", worldTick: 999, subjectId: SUBJECT, occurredAt: "2000-01-01T00:00:00Z" }, cred), "arrival", d)
  assert.equal(r.status, 200)
  assert.deepEqual(db.calls, ["arrival:6"])
  assert.equal((await handleRuntimeIngress(req("arrival", { receiptId: randomUUID(), sessionId: randomUUID(), worldId: "living-forest-fixture" }, cred), "arrival", d)).status, 403, "runtime alias is not a consumer world")
  for (const code of ["RUNTIME_CREDENTIAL_INVALID", "RUNTIME_CREDENTIAL_REVOKED", "RUNTIME_CREDENTIAL_EXPIRED", "RUNTIME_INSTANCE_REVOKED"] as const) {
    const bad = fakeDb({ runtimePoll: async () => { throw new EntryAuthorityError(code) } })
    const res = await handleRuntimeIngress(req("poll", { readiness: "READY" }, cred), "poll", { ...d, db: bad })
    assert.equal(res.status, 401)
    assert.deepEqual(await res.json(), { error: "RUNTIME_UNAUTHORIZED" })
  }
  assert.equal(sweeperKeyMatches("a".repeat(43), "a".repeat(43)), true)
  assert.equal(sweeperKeyMatches("a".repeat(43), undefined), false)
  assert.equal(sweeperKeyMatches(null, "a".repeat(43)), false)
})

test("target guard: the entry authority refuses production refs, non-Preview targets and other credentials", () => {
  const ok = "postgres://worldk_platform_entry_preview.gxjdbfpyyrycvqzozyty:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
  assert.doesNotThrow(() => assertEntryAuthorityTarget(ok))
  for (const bad of [
    "postgres://worldk_platform_entry_preview.hapoerzbcnagyfafqojg:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
    "postgres://postgres.gxjdbfpyyrycvqzozyty:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
    "postgres://worldk_platform_entry_preview.abcdefghijklmnopqrst:pw@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
    "postgres://worldk_platform_entry_preview:pw@127.0.0.1:5432/postgres",
    "not a url",
  ]) assert.throws(() => assertEntryAuthorityTarget(bad), bad)
  assert.doesNotThrow(() => assertEntryAuthorityTarget("postgres://worldk_platform_entry_preview:pw@127.0.0.1:5432/x", { allowLocal: true }))
})

test("boundaries: world-entry modules never import renderer/Unreal/lease code, log, or reach 039 writers", () => {
  const files = readdirSync(here).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
  for (const f of files) {
    const src = readFileSync(path.join(here, f), "utf8")
    const code = src.replace(/^\s*\/\/.*$/gm, "")
    for (const m of code.matchAll(/from\s+"([^"]+)"/g)) assert.ok(!/world-embodiment|renderer|unreal|world-persistence|@dt4m\//i.test(m[1]), `${f} imports ${m[1]}`)
    assert.doesNotMatch(code, /console\.|record_world_lifecycle_(arrival|departure)_v2|service_role|SERVICE_ROLE/, f)
  }
})
