import { test } from "node:test"
import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  MACHINE_INGRESS_HOST,
  MACHINE_KEY_HEADER,
  decideMachineIngress,
  denialResponse,
  isMachineIngressHost,
  machineKeyMatches,
  normalizeHost,
  withoutMachineKey,
} from "./machineIngress.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const KEY = randomBytes(32).toString("base64url")
const OTHER = randomBytes(32).toString("base64url")
const PUB = "/api/worlds/living-forest/public-projection"
const VIS = "/api/worlds/living-forest/visitor-projection"
const decide = (pathname: string, suppliedKey: string | null, ...cfg: [string | undefined] | []) =>
  decideMachineIngress({ pathname, suppliedKey, configuredKey: cfg.length ? cfg[0] : KEY })

test("host recognition: exact ingress host only (case, port, trailing dot normalised)", () => {
  for (const h of ["platform-preview.avatark.ai", "PLATFORM-PREVIEW.avatark.AI", "platform-preview.avatark.ai:443", "platform-preview.avatark.ai."]) {
    assert.equal(isMachineIngressHost(h), true, h)
  }
  for (const h of [null, "", "next.avatark.ai", "avatark-platform-web.vercel.app", "avatark-platform-web-git-feature-worldk-p11b-pla-37cf9a-avatark.vercel.app", "x.platform-preview.avatark.ai", "platform-preview.avatark.ai.evil.test", "[::1]:3000", "localhost:3000"]) {
    assert.equal(isMachineIngressHost(h), false, String(h))
  }
  assert.equal(normalizeHost(" Platform-Preview.Avatark.ai:8080 "), MACHINE_INGRESS_HOST)
})

test("A: valid key + public projection => allowed", () => {
  assert.deepEqual(decide(PUB, KEY), { kind: "ALLOW" })
})

test("B: valid key + visitor projection => allowed (visitor auth still enforced by the route)", () => {
  assert.deepEqual(decide(VIS, KEY), { kind: "ALLOW" })
})

test("C/D: missing, empty, wrong or malformed key => 401 on every path", () => {
  for (const k of [null, "", "   ", OTHER, KEY.slice(0, 42), KEY + "!", `${KEY} `, "a".repeat(129), KEY.slice(0, -1) + (KEY.endsWith("A") ? "B" : "A")]) {
    for (const p of [PUB, VIS, "/", "/login", "/api/account/profile"]) {
      assert.deepEqual(decide(p, k), { kind: "DENY", status: 401, code: "MACHINE_UNAUTHORIZED" }, `${JSON.stringify(k)} ${p}`)
    }
  }
})

test("misconfiguration: absent or malformed configured key denies everything, even a matching header", () => {
  for (const cfg of [undefined, "", "short", "has spaces in it but is long enough to pass length checks ok"]) {
    assert.equal(decide(PUB, cfg ?? null, cfg).kind, "DENY")
    assert.equal(decide(PUB, KEY, cfg).kind, "DENY")
  }
})

test("E: valid key + any other path => 404", () => {
  const denied = [
    "/", "/login", "/signup", "/account", "/admin", "/dev/account", "/api/dev/account/x",
    "/api/account/profile", "/api/admin/status", "/api/worlds/living-forest", "/api/worlds/living-forest/entry",
    "/api/worlds/living-forest/public-projection/", "/api/worlds/living-forest/public-projection/x",
    "/api/worlds//public-projection", "/api/worlds/a/b/public-projection", "/_next/static/chunks/main.js",
    "/favicon.ico", "/robots.txt", "/api/worlds/living-forest/public-projectionX",
  ]
  for (const p of denied) assert.deepEqual(decide(p, KEY), { kind: "DENY", status: 404, code: "NOT_FOUND" }, p)
})

test("F: non-GET on a projection path passes through so the route's own 405 applies", () => {
  // The routes export GET only; Next answers other methods with 405.
  for (const r of ["public-projection", "visitor-projection"]) {
    const src = readFileSync(path.join(here, "../../app/api/worlds/[worldId]", r, "route.ts"), "utf8")
    assert.match(src, /export async function GET\(/)
    assert.doesNotMatch(src, /export (async )?function (POST|PUT|PATCH|DELETE)\(/)
  }
  assert.deepEqual(decide(PUB, KEY), { kind: "ALLOW" })
})

test("I/J: denial bodies are fixed, secret-free and not cacheable", async () => {
  for (const d of [decide(PUB, OTHER), decide("/", KEY)]) {
    assert.equal(d.kind, "DENY")
    if (d.kind !== "DENY") continue
    const r = denialResponse(d)
    const body = await r.text()
    assert.ok(!body.includes(KEY) && !body.includes(OTHER))
    assert.equal(r.headers.get("cache-control"), "private, no-store")
    assert.deepEqual(Object.keys(JSON.parse(body)), ["error"])
  }
})

test("I/K: the machine credential is stripped before any route handler sees it; visitor cookies are kept", () => {
  const h = new Headers({ [MACHINE_KEY_HEADER]: KEY, cookie: "sb-gxjdbfpyyrycvqzozyty-auth-token=abc", host: MACHINE_INGRESS_HOST })
  const out = withoutMachineKey(h)
  assert.equal(out.get(MACHINE_KEY_HEADER), null)
  assert.equal(out.get("cookie"), "sb-gxjdbfpyyrycvqzozyty-auth-token=abc")
  assert.equal(h.get(MACHINE_KEY_HEADER), KEY, "input headers not mutated")
})

test("K/L: the gate never derives or carries visitor identity", () => {
  const src = readFileSync(path.join(here, "machineIngress.ts"), "utf8").replace(/^\s*\/\/.*$/gm, "")
  assert.doesNotMatch(src, /subjectId|getUser|supabase|console\./)
  assert.equal(machineKeyMatches(KEY, KEY), true)
})

test("G/H: proxy gates only the ingress host and keeps the pre-M12 matcher for every other host", () => {
  const proxy = readFileSync(path.join(here, "../../proxy.ts"), "utf8")
  assert.match(proxy, /if \(isMachineIngressHost\(request\.headers\.get\('host'\)\)\) \{/)
  assert.match(proxy, /return updateSession\(request\)\n\}/)
  // original matcher string preserved byte-for-byte
  assert.ok(proxy.includes("'/((?!_next/static|_next/image|favicon.ico|dev(?:/|$)|api/dev(?:/|$)|api/worlds/[^/]+/public-projection$|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',"))
  // host-scoped catch-all matcher mirrors the constant
  assert.ok(proxy.includes("has: [{ type: 'host', value: 'platform-preview\\\\.avatark\\\\.ai\\\\.?' }]"))
  const re = new RegExp("^platform-preview\\.avatark\\.ai\\.?$")
  assert.ok(re.test(MACHINE_INGRESS_HOST) && re.test(`${MACHINE_INGRESS_HOST}.`) && !re.test("next.avatark.ai"))
})
