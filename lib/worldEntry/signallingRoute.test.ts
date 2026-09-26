// WORLDK-M14-B5 unit suite: the signalling-facing route endpoint, the media
// player page, and the host gate (no database).
import { test } from "node:test"
import assert from "node:assert/strict"
import { createHash, randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { decideMachineIngress } from "../worldConsumer/machineIngress.ts"
import { EntryAuthorityError } from "./authorityDb.ts"
import { newSecret } from "./credentials.ts"
import { SESSION_COOKIE } from "./gateway.ts"
import { handleMediaPage, MEDIA_PAGE_PATH, mediaPageHeaders, mediaPageScript, signallingOrigin } from "./mediaPlayerPage.ts"
import { handleSignallingRoute, ROUTE_KEY_FORMAT, SIGNALLING_ROUTE_PATH, signallingKeyMatches, streamRouteKey } from "./signallingRoute.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const ORIGIN = "https://platform-preview.avatark.ai"
const KEY = newSecret()
const H = createHash("sha256").update("authz").digest("hex")

function routeDb(fail?: string) {
  const calls: Buffer[] = []
  return {
    calls,
    db: {
      async signallingRoute(h: Buffer) {
        calls.push(h)
        if (fail) throw new EntryAuthorityError(fail as never)
        return { routeKey: streamRouteKey(randomUUID()), attached: false }
      },
    },
  }
}
const req = (body: unknown, auth: string | null = `Bearer ${KEY}`) =>
  new Request(`${ORIGIN}${SIGNALLING_ROUTE_PATH}`, { method: "POST", headers: { "content-type": "application/json", ...(auth ? { authorization: auth } : {}) }, body: typeof body === "string" ? body : JSON.stringify(body) })

test("route key: 'wkr1-' + 40 hex of sha256('worldk-stream-route:v1:' + session id); deterministic, not the session id", () => {
  const s = randomUUID()
  const k = streamRouteKey(s)
  assert.match(k, ROUTE_KEY_FORMAT)
  assert.equal(k, "wkr1-" + createHash("sha256").update(`worldk-stream-route:v1:${s}`).digest("hex").slice(0, 40))
  assert.equal(streamRouteKey(s), k)
  assert.ok(!k.includes(s.replace(/-/g, "").slice(0, 8)))
})

test("route endpoint: signalling key required (timing-safe), exact body, digest only reaches the DB", async () => {
  const { db, calls } = routeDb()
  const ok = await handleSignallingRoute(req({ authorizationSha256: H }), { db, configuredKey: KEY })
  assert.equal(ok.status, 200)
  const body = await ok.json()
  assert.deepEqual(Object.keys(body).sort(), ["attached", "routeKey"])
  assert.match(body.routeKey, ROUTE_KEY_FORMAT)
  assert.deepEqual(calls[0], Buffer.from(H, "hex"))
  for (const auth of [null, "Bearer " + newSecret(), `Basic ${KEY}`, `Bearer ${KEY}x`, "Bearer short"]) assert.equal((await handleSignallingRoute(req({ authorizationSha256: H }, auth), { db, configuredKey: KEY })).status, 401, String(auth))
  for (const configured of [undefined, "", "short"]) assert.equal((await handleSignallingRoute(req({ authorizationSha256: H }), { db, configuredKey: configured })).status, 401, "a missing/malformed configured key fails closed")
  for (const b of [{}, { authorizationSha256: H.toUpperCase() }, { authorizationSha256: H, sessionId: "x" }, { authorization: "plaintext" }, "[]", "{"]) assert.equal((await handleSignallingRoute(req(b), { db, configuredKey: KEY })).status, 400, JSON.stringify(b))
  assert.equal(calls.length, 1)
  assert.equal(signallingKeyMatches(`Bearer ${KEY}`, KEY), true)
})

test("route endpoint: every authority refusal is the same 404; infrastructure failure 503; no DB 503", async () => {
  for (const code of ["STREAM_AUTHORIZATION_INVALID", "STREAM_ATTACH_WINDOW_EXPIRED", "STREAM_ALREADY_ATTACHED", "STREAM_SESSION_NOT_ELIGIBLE", "STREAM_AUTHORIZATION_BINDING_MISMATCH"]) {
    const r = await handleSignallingRoute(req({ authorizationSha256: H }), { db: routeDb(code).db, configuredKey: KEY })
    assert.deepEqual([r.status, await r.text()], [404, '{"error":"NOT_ROUTABLE"}'], code)
  }
  assert.equal((await handleSignallingRoute(req({ authorizationSha256: H }), { db: routeDb("PERMISSION_DENIED").db, configuredKey: KEY })).status, 503)
  assert.equal((await handleSignallingRoute(req({ authorizationSha256: H }), { db: null, configuredKey: KEY })).status, 503)
})

test("media page: signalling origin must be ws(s) origin-only (ws only on loopback); CSP pins the script and allows only self + signalling", async () => {
  assert.equal(signallingOrigin("wss://signal.platform-preview.avatark.ai"), "wss://signal.platform-preview.avatark.ai")
  assert.equal(signallingOrigin("ws://127.0.0.1:8880"), "ws://127.0.0.1:8880")
  for (const bad of [undefined, "", "https://x.example", "ws://evil.example:80", "wss://u:p@x.example", "wss://x.example/path", "wss://x.example/?q=1", "not a url"]) assert.equal(signallingOrigin(bad), null, String(bad))
  const view = newSecret()
  const r = await handleMediaPage(new Request(`${ORIGIN}${MEDIA_PAGE_PATH}`, { headers: { cookie: `${SESSION_COOKIE}=${view}` } }), { db: {}, signallingUrl: "wss://signal.example" })
  assert.equal(r.status, 200)
  const csp = r.headers.get("content-security-policy")!
  const script = mediaPageScript("wss://signal.example")
  assert.equal(csp, mediaPageHeaders("wss://signal.example", script)["Content-Security-Policy"])
  assert.match(csp, new RegExp(`script-src 'sha256-${createHash("sha256").update(script).digest("base64").replace(/[+/]/g, (c) => "\\" + c)}'`))
  assert.match(csp, /connect-src 'self' wss:\/\/signal\.example;/)
  assert.equal(r.headers.get("referrer-policy"), "same-origin")
  const html = await r.text()
  assert.ok(html.includes(`<script>${script}</script>`))
  assert.ok(!html.includes(view))
  // the browser sends no listStreamers/subscribe and carries the authorization only in the subprotocol list
  assert.doesNotMatch(script, /listStreamers|subscribe|streamerId/)
  assert.match(script, /new WebSocket\(S,\["wk-player-v1","wk-authz\."\+authz\]\)/)
  assert.match(script, /framesDecoded/)
  assert.match(script, /"playing"/)
  assert.equal((await handleMediaPage(new Request(`${ORIGIN}${MEDIA_PAGE_PATH}`), { db: {}, signallingUrl: "wss://signal.example" })).status, 404)
  assert.equal((await handleMediaPage(new Request(`${ORIGIN}${MEDIA_PAGE_PATH}`, { headers: { cookie: `${SESSION_COOKIE}=${view}` } }), { db: {}, signallingUrl: undefined })).status, 503, "unconfigured media plane answers honestly")
})

test("host gate + routes: both B5 surfaces are self-authenticating on the ingress host only; no signalling socket in the Next app", () => {
  for (const p of [SIGNALLING_ROUTE_PATH, MEDIA_PAGE_PATH]) assert.deepEqual(decideMachineIngress({ pathname: p, suppliedKey: null, configuredKey: undefined }), { kind: "ALLOW_SELF_AUTHENTICATING" }, p)
  for (const p of [`${SIGNALLING_ROUTE_PATH}/`, `${MEDIA_PAGE_PATH}/x`]) assert.equal(decideMachineIngress({ pathname: p, suppliedKey: null, configuredKey: undefined }).kind, "DENY", p)
  for (const [r, m] of [["app/api/signalling/v1/route/route.ts", "POST"], ["app/world-entry/stream/media/route.ts", "GET"]]) {
    const src = readFileSync(path.join(here, "../..", r), "utf8")
    assert.match(src, /if \(!isMachineIngressHost\(request\.headers\.get\('host'\)\)\) return new Response\(null, \{ status: 404 \}\)/, r)
    assert.deepEqual([...src.matchAll(/export async function (\w+)/g)].map((x) => x[1]), [m], r)
  }
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
  for (const f of walk(path.join(here, "../../app"))) assert.doesNotMatch(readFileSync(f, "utf8"), /WebSocketServer|worldk-signalling|lib-pixelstreaming/, f)
  const ts = JSON.parse(readFileSync(path.join(here, "../../tsconfig.json"), "utf8"))
  assert.ok(ts.exclude.includes("services"), "services/ is outside the Next build")
})
