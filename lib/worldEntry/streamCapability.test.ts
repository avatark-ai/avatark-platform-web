// WORLDK-M14-B3 unit suite: stream capability gateway handlers (no database).
//
// The database is a recording fake: it proves what reaches the authority
// (hashes only, never plaintext), that refusals short-circuit before it, and
// that every authority refusal is answered identically.
import { test } from "node:test"
import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { decideMachineIngress } from "../worldConsumer/machineIngress.ts"
import { EntryAuthorityError, type EntryAuthorityCode } from "./authorityDb.ts"
import { newSecret, sha256 } from "./credentials.ts"
import { SESSION_COOKIE } from "./gateway.ts"
import {
  handleStreamAuthorize, handleStreamCapabilityIssue, handleStreamPage, isStrictSameOrigin,
  STREAM_AUTHORIZE_PATH, STREAM_CAPABILITY_PATH, STREAM_PAGE_HEADERS, STREAM_PAGE_PATH, STREAM_PAGE_SCRIPT, type StreamCapabilityDb,
} from "./streamCapability.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const ORIGIN = "https://platform-preview.avatark.ai"
const VIEW = newSecret()

interface Call { op: string; args: Buffer[]; worldId?: string }
function fakeDb(fail?: EntryAuthorityCode | Error): { db: StreamCapabilityDb; calls: Call[] } {
  const calls: Call[] = []
  return {
    calls,
    db: {
      async streamCapabilityIssue(view, cap) {
        calls.push({ op: "issue", args: [view, cap] })
        if (fail) throw typeof fail === "string" ? new EntryAuthorityError(fail) : fail
        return { worldId: "living-forest", expiresAt: new Date(Date.now() + 60_000).toISOString() }
      },
      async streamCapabilityRedeem(cap, view, worldId, auth) {
        calls.push({ op: "redeem", args: [cap, view, auth], worldId })
        if (fail) throw typeof fail === "string" ? new EntryAuthorityError(fail) : fail
        return { outcome: "AUTHORIZED" }
      },
    },
  }
}
const req = (p: string, body: unknown, headers: Record<string, string | null> = {}) => {
  const h: Record<string, string> = {}
  for (const [k, v] of Object.entries({ origin: ORIGIN, "sec-fetch-site": "same-origin", "content-type": "application/json", cookie: `${SESSION_COOKIE}=${VIEW}`, ...headers })) if (v !== null) h[k] = v
  return new Request(`${ORIGIN}${p}`, { method: "POST", headers: h, body: typeof body === "string" ? body : JSON.stringify(body) })
}

test("issue: strict same-origin POST with the session cookie and an empty body -> 201; the DB sees only hashes", async () => {
  const { db, calls } = fakeDb()
  const res = await handleStreamCapabilityIssue(req(STREAM_CAPABILITY_PATH, {}), { db })
  assert.equal(res.status, 201)
  assert.equal(res.headers.get("cache-control"), "private, no-store")
  const body = await res.json()
  assert.deepEqual(Object.keys(body).sort(), ["capability", "expiresInSeconds", "status", "worldId"])
  assert.equal(body.expiresInSeconds, 60)
  assert.match(body.capability, /^[A-Za-z0-9_-]{43}$/)
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0].args[0], sha256(VIEW))
  assert.deepEqual(calls[0].args[1], sha256(body.capability))
  for (const b of calls[0].args) assert.equal(b.length, 32)
})

test("authorize: -> 200 {status, authorization}; the DB sees hashes of capability, session and authorization", async () => {
  const { db, calls } = fakeDb()
  const cap = newSecret()
  const res = await handleStreamAuthorize(req(STREAM_AUTHORIZE_PATH, { capability: cap, worldId: "living-forest" }), { db })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.deepEqual(Object.keys(body).sort(), ["authorization", "status"])
  assert.equal(body.status, "AUTHORIZED")
  assert.deepEqual(calls[0].args, [sha256(cap), sha256(VIEW), sha256(body.authorization)])
  assert.equal(calls[0].worldId, "living-forest")
  assert.notEqual(body.authorization, cap)
})

test("strict Origin: absent, null, foreign, http, or non-same-origin Sec-Fetch-Site are refused before the DB", async () => {
  const bad: Record<string, string | null>[] = [
    { origin: null }, { origin: "null" }, { origin: "https://evil.example" }, { origin: "http://platform-preview.avatark.ai" },
    { origin: "https://platform-preview.avatark.ai:444" }, { origin: "https://worldk.avatark.ai" },
    { "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "same-site" }, { "sec-fetch-site": "none" },
  ]
  for (const h of bad) {
    const { db, calls } = fakeDb()
    const a = await handleStreamCapabilityIssue(req(STREAM_CAPABILITY_PATH, {}, h), { db })
    const b = await handleStreamAuthorize(req(STREAM_AUTHORIZE_PATH, { capability: newSecret(), worldId: "living-forest" }, h), { db })
    assert.deepEqual([a.status, b.status], [403, 403], JSON.stringify(h))
    assert.deepEqual(await a.json(), { status: "REFUSED" })
    assert.equal(calls.length, 0)
  }
  // Sec-Fetch-Site absent (older clients) is allowed when Origin matches
  assert.equal(isStrictSameOrigin(new Request(`${ORIGIN}/x`, { method: "POST", headers: { origin: ORIGIN } })), true)
})

test("missing / malformed session cookie and malformed bodies never reach the DB", async () => {
  const { db, calls } = fakeDb()
  for (const cookie of [null, `${SESSION_COOKIE}=short`, `other=${VIEW}`]) {
    assert.equal((await handleStreamCapabilityIssue(req(STREAM_CAPABILITY_PATH, {}, { cookie }), { db })).status, 403)
    assert.equal((await handleStreamAuthorize(req(STREAM_AUTHORIZE_PATH, { capability: newSecret(), worldId: "living-forest" }, { cookie }), { db })).status, 403)
  }
  for (const body of [{ subjectId: "x" }, [], "null", "", "{", "x".repeat(2000)]) assert.equal((await handleStreamCapabilityIssue(req(STREAM_CAPABILITY_PATH, body), { db })).status, 400, JSON.stringify(body))
  assert.equal((await handleStreamCapabilityIssue(req(STREAM_CAPABILITY_PATH, {}, { "content-type": "text/plain" }), { db })).status, 400)
  assert.equal((await handleStreamCapabilityIssue(req(STREAM_CAPABILITY_PATH, {}, { "content-type": "application/x-www-form-urlencoded" }), { db })).status, 400)
  for (const body of [{ capability: newSecret() }, { capability: newSecret(), worldId: "living-forest", sessionId: "x" }, { capability: newSecret(), worldId: "Living Forest" }, { capability: newSecret(), worldId: 1 }]) {
    assert.equal((await handleStreamAuthorize(req(STREAM_AUTHORIZE_PATH, body), { db })).status, 400, JSON.stringify(body))
  }
  for (const capability of ["", "x", newSecret().slice(1), `${newSecret()}A`, null, 7]) {
    assert.equal((await handleStreamAuthorize(req(STREAM_AUTHORIZE_PATH, { capability, worldId: "living-forest" }), { db })).status, 403)
  }
  assert.equal(calls.length, 0)
})

test("every authority refusal is the same opaque 403; infrastructure failures are 503; no DB -> 503", async () => {
  for (const code of ["SESSION_NOT_FOUND", "STREAM_CAPABILITY_INVALID", "STREAM_CAPABILITY_EXPIRED", "STREAM_CAPABILITY_CONSUMED", "STREAM_CAPABILITY_BINDING_MISMATCH", "STREAM_SESSION_NOT_IN_WORLD", "STREAM_CAPABILITY_LIMIT"] as const) {
    const { db } = fakeDb(code)
    const a = await handleStreamCapabilityIssue(req(STREAM_CAPABILITY_PATH, {}), { db })
    const b = await handleStreamAuthorize(req(STREAM_AUTHORIZE_PATH, { capability: newSecret(), worldId: "living-forest" }), { db })
    assert.deepEqual([a.status, await a.text(), b.status, await b.text()], [403, '{"status":"REFUSED"}', 403, '{"status":"REFUSED"}'], code)
  }
  for (const f of ["PERMISSION_DENIED", "UNAVAILABLE", new Error("connection reset")] as const) {
    const { db } = fakeDb(f as EntryAuthorityCode | Error)
    assert.equal((await handleStreamCapabilityIssue(req(STREAM_CAPABILITY_PATH, {}), { db })).status, 503)
  }
  assert.equal((await handleStreamCapabilityIssue(req(STREAM_CAPABILITY_PATH, {}), { db: null })).status, 503)
  assert.equal((await handleStreamAuthorize(req(STREAM_AUTHORIZE_PATH, { capability: newSecret(), worldId: "living-forest" }), { db: null })).status, 503)
})

test("stub page: CSP pins the inline script by hash, Referrer-Policy same-origin, no secret or identifier in the markup", async () => {
  const hash = createHash("sha256").update(STREAM_PAGE_SCRIPT, "utf8").digest("base64")
  assert.match(STREAM_PAGE_HEADERS["Content-Security-Policy"], new RegExp(`script-src 'sha256-${hash.replace(/[+/]/g, (c) => `\\${c}`)}'`))
  assert.match(STREAM_PAGE_HEADERS["Content-Security-Policy"], /default-src 'none'.*connect-src 'self'.*form-action 'none'.*frame-ancestors 'none'/)
  assert.equal(STREAM_PAGE_HEADERS["Referrer-Policy"], "same-origin")
  const { db } = fakeDb()
  const res = await handleStreamPage(new Request(`${ORIGIN}${STREAM_PAGE_PATH}`, { headers: { cookie: `${SESSION_COOKIE}=${VIEW}` } }), { db })
  assert.equal(res.status, 200)
  const html = await res.text()
  assert.ok(html.includes(`<script>${STREAM_PAGE_SCRIPT}</script>`))
  assert.ok(!html.includes(VIEW))
  assert.doesNotMatch(html, /turn:|stun:|wss?:\/\/|unreal|pixel|gpu|[0-9a-f]{8}-[0-9a-f]{4}-/i)
  assert.equal((await handleStreamPage(new Request(`${ORIGIN}${STREAM_PAGE_PATH}`), { db })).status, 404)
  assert.equal((await handleStreamPage(new Request(`${ORIGIN}${STREAM_PAGE_PATH}`, { headers: { cookie: `${SESSION_COOKIE}=${VIEW}` } }), { db: null })).status, 404)
})

test("host gate: exactly the three stream paths are self-authenticating on the ingress host; routes answer only there", () => {
  const decide = (p: string) => decideMachineIngress({ pathname: p, suppliedKey: null, configuredKey: undefined })
  for (const p of [STREAM_PAGE_PATH, STREAM_CAPABILITY_PATH, STREAM_AUTHORIZE_PATH]) assert.deepEqual(decide(p), { kind: "ALLOW_SELF_AUTHENTICATING" }, p)
  for (const p of ["/world-entry/stream/", "/world-entry/streamX", "/world-entry/stream/x", "/world-entry/stream/capability/", "/world-entry/stream/authorize/x"]) {
    assert.equal(decide(p).kind, "DENY", p)
  }
  for (const [r, method] of [["app/world-entry/stream/route.ts", "GET"], ["app/world-entry/stream/capability/route.ts", "POST"], ["app/world-entry/stream/authorize/route.ts", "POST"]]) {
    const src = readFileSync(path.join(here, "../..", r), "utf8")
    assert.match(src, /if \(!isMachineIngressHost\(request\.headers\.get\('host'\)\)\) return new Response\(null, \{ status: 404 \}\)/, r)
    assert.deepEqual([...src.matchAll(/export async function (\w+)/g)].map((m) => m[1]), [method], r)
  }
})

test("boundary: the stream module logs nothing, names no renderer/signalling/TURN host, and calls no lifecycle function", () => {
  const src = readFileSync(path.join(here, "streamCapability.ts"), "utf8").replace(/^\s*\/\/.*$/gm, "")
  assert.doesNotMatch(src, /console\.|process\.env|turn:|stun:|wss?:\/\/|runtimeArrival|runtimeDeparture|requestLeave|redeemTicket|world_runtime_|world_entry_/)
  for (const m of src.matchAll(/from\s+"([^"]+)"/g)) assert.ok(/^(node:crypto|\.\/(authorityDb|credentials|gateway)\.ts)$/.test(m[1]), m[1])
})
