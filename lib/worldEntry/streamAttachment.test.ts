// WORLDK-M14-B4 unit suite (no database): Runtime Ingress `attach`, the SDK
// attach path, the stub relay's browser boundary, and the B1 freeze.
import { test } from "node:test"
import assert from "node:assert/strict"
import { createHash, randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { ATTACH_OP as SDK_ATTACH_OP, RUNTIME_OPS as SDK_OPS, RuntimeBridge, type IngressReply } from "@avatark/runtime-bridge"
import { createLivingForestFixtureFactSource } from "../worldConsumer/facts.ts"
import { decideMachineIngress } from "../worldConsumer/machineIngress.ts"
import { EntryAuthorityError, type EntryAuthorityDb } from "./authorityDb.ts"
import { newRuntimeCredential, newSecret, sha256 } from "./credentials.ts"
import { SESSION_COOKIE } from "./gateway.ts"
import { ATTACH_OP, handleRuntimeIngress, RUNTIME_OPS, type RuntimeAttachDb } from "./runtimeIngress.ts"
import { handleStubAttach, StubAttachmentRelay } from "./stubAttachmentRelay.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const ORIGIN = "https://platform-preview.avatark.ai"
const facts = createLivingForestFixtureFactSource()
const unused = async () => { throw new Error("unused") }
const baseDb = { resolve: unused, redeemTicket: unused, sessionView: unused, requestLeave: unused, runtimePoll: unused, runtimeClaim: unused, runtimeArrival: unused, runtimePresence: unused, runtimeDeparture: unused, runtimeDisconnect: unused, sweep: unused } as unknown as EntryAuthorityDb

function attachDb(fail?: string) {
  const calls: { credentialId: string; secret: Buffer; sessionId: string; auth: Buffer }[] = []
  const db: EntryAuthorityDb & RuntimeAttachDb = {
    ...baseDb,
    async runtimeStreamAttach(credentialId, secret, sessionId, auth) {
      calls.push({ credentialId, secret, sessionId, auth })
      if (fail) throw new EntryAuthorityError(fail as never)
      return { outcome: "ATTACHED", sessionId }
    },
  }
  return { db, calls }
}
const cred = newRuntimeCredential()
const ingress = (body: unknown, db: EntryAuthorityDb | null, bearer: string | null = cred.bearer) =>
  handleRuntimeIngress(new Request(`${ORIGIN}/api/runtime/v1/attach`, { method: "POST", headers: { ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), "content-type": "application/json" }, body: JSON.stringify(body) }), "attach", { db, mode: "FIXTURE_PREVIEW", facts })

test("B1 freeze: attach is outside RUNTIME_OPS on both sides; the SDK and Platform op sets stay identical", () => {
  assert.deepEqual([...SDK_OPS], [...RUNTIME_OPS])
  assert.ok(!(RUNTIME_OPS as readonly string[]).includes("attach"))
  assert.equal(ATTACH_OP, "attach")
  assert.equal(SDK_ATTACH_OP, ATTACH_OP)
  const protocol = readFileSync(path.join(here, "../../packages/runtime-bridge/src/protocol.ts"), "utf8")
  assert.doesNotMatch(protocol, /attach/i, "no attach in the B1 protocol module")
  const spec = readFileSync(path.join(here, "../../packages/runtime-bridge/spec/RUNTIME_BRIDGE_PROTOCOL_v1.md"), "utf8")
  assert.doesNotMatch(spec, /attach/i, "no attach in the B1 spec")
})

test("ingress attach: authenticated runtime + {sessionId, authorizationSha256 (lowercase hex)} -> DB gets the credential hash, session and 32-byte digest", async () => {
  const { db, calls } = attachDb()
  const sessionId = randomUUID()
  const auth = newSecret()
  const res = await ingress({ sessionId, authorizationSha256: sha256(auth).toString("hex") }, db)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { outcome: "ATTACHED", sessionId })
  assert.equal(calls.length, 1)
  assert.equal(calls[0].credentialId, cred.credentialId)
  assert.deepEqual(calls[0].secret, cred.sha256)
  assert.deepEqual(calls[0].auth, sha256(auth))
})

test("ingress attach: malformed bodies are 400 before the DB; no bearer is 401; auth failures are a uniform 401", async () => {
  const { db, calls } = attachDb()
  const h = sha256("x").toString("hex")
  for (const body of [{}, { sessionId: randomUUID() }, { sessionId: "x", authorizationSha256: h }, { sessionId: randomUUID(), authorizationSha256: h.toUpperCase() }, { sessionId: randomUUID(), authorizationSha256: h.slice(1) }, { sessionId: randomUUID(), authorizationSha256: h, extra: true }, { sessionId: randomUUID(), authorizationSha256: newSecret() }]) {
    assert.equal((await ingress(body, db)).status, 400, JSON.stringify(body))
  }
  assert.equal(calls.length, 0)
  assert.equal((await ingress({ sessionId: randomUUID(), authorizationSha256: h }, db, null)).status, 401)
  assert.equal((await ingress({ sessionId: randomUUID(), authorizationSha256: h }, db, newSecret())).status, 401, "an authorization is not a runtime bearer")
  for (const code of ["RUNTIME_CREDENTIAL_INVALID", "RUNTIME_CREDENTIAL_REVOKED", "RUNTIME_CREDENTIAL_EXPIRED", "RUNTIME_INSTANCE_REVOKED"]) {
    const r = await ingress({ sessionId: randomUUID(), authorizationSha256: h }, attachDb(code).db)
    assert.deepEqual([r.status, await r.json()], [401, { error: "RUNTIME_UNAUTHORIZED" }], code)
  }
  const expected: Record<string, number> = { SESSION_NOT_BOUND: 403, STREAM_AUTHORIZATION_INVALID: 403, STREAM_AUTHORIZATION_BINDING_MISMATCH: 403, STREAM_ALREADY_ATTACHED: 409, STREAM_ATTACH_WINDOW_EXPIRED: 409, STREAM_SESSION_NOT_ELIGIBLE: 409 }
  for (const [code, status] of Object.entries(expected)) assert.equal((await ingress({ sessionId: randomUUID(), authorizationSha256: h }, attachDb(code).db)).status, status, code)
  // a DB implementation without the attach method answers honestly unavailable
  assert.equal((await ingress({ sessionId: randomUUID(), authorizationSha256: h }, baseDb)).status, 503)
})

test("SDK attach: only for a session this bridge claimed (or joined); refused locally otherwise; never changes local state", async () => {
  const posted: { op: string; body: Record<string, unknown> }[] = []
  const bridge = new RuntimeBridge({ transport: { async post(op, body): Promise<IngressReply> {
    posted.push({ op, body })
    if (op === "claim") return { status: 200, body: { sessionId: body.sessionId, worldId: "living-forest", reconnect: false } }
    return { status: 200, body: { outcome: "ATTACHED", sessionId: body.sessionId } }
  } } })
  const s = randomUUID()
  const h = createHash("sha256").update("authz").digest("hex")
  assert.equal(await bridge.attach(s, h), null, "UNCLAIMED: no I/O")
  assert.equal(posted.length, 0)
  await bridge.handle({ kind: "ALLOCATION_ACQUIRED", sessionId: s })
  assert.equal(bridge.state(s), "CLAIMED")
  assert.equal(await bridge.attach(s, "ZZ"), null, "malformed digest: no I/O")
  const r = await bridge.attach(s, h)
  assert.deepEqual(r, { status: 200, body: { outcome: "ATTACHED", sessionId: s } })
  assert.deepEqual(posted.at(-1), { op: "attach", body: { sessionId: s, authorizationSha256: h } })
  assert.equal(bridge.state(s), "CLAIMED", "attach is not STREAM_JOINED")
})

test("stub relay browser boundary: strict Origin, exact body, the browser learns only ATTACHED/REFUSED", async () => {
  const view = newSecret()
  const authz = newSecret()
  const sessionId = randomUUID()
  const relay = new StubAttachmentRelay()
  const routed: Buffer[][] = []
  const db = { async streamAttachmentRoute(v: Buffer, a: Buffer) { routed.push([v, a]); if (!v.equals(sha256(view)) || !a.equals(sha256(authz))) throw new EntryAuthorityError("STREAM_AUTHORIZATION_INVALID"); return sessionId } }
  const req = (body: unknown, h: Record<string, string> = {}) => new Request(`${ORIGIN}/stub/attach`, { method: "POST", headers: { origin: ORIGIN, "sec-fetch-site": "same-origin", "content-type": "application/json", cookie: `${SESSION_COOKIE}=${view}`, ...h }, body: JSON.stringify(body) })
  assert.equal((await handleStubAttach(req({ authorization: authz }), { db, relay })).status, 403, "no renderer registered")
  relay.register(sessionId, async (a) => (a === authz ? "ATTACHED" : null))
  const ok = await handleStubAttach(req({ authorization: authz }), { db, relay })
  assert.equal(ok.status, 200)
  const text = await ok.text()
  assert.equal(text, '{"status":"ATTACHED"}')
  assert.ok(!text.includes(sessionId))
  assert.deepEqual(routed.at(-1), [sha256(view), sha256(authz)], "only hashes reach the Platform")
  for (const h of [{ origin: "null" }, { origin: "https://evil.example" }, { "sec-fetch-site": "cross-site" }] as Record<string, string>[]) assert.equal((await handleStubAttach(req({ authorization: authz }, h), { db, relay })).status, 403)
  for (const body of [{}, { authorization: authz, sessionId }, [authz]]) assert.equal((await handleStubAttach(req(body), { db, relay })).status, 400)
  assert.equal((await handleStubAttach(req({ authorization: "short" }), { db, relay })).status, 403)
  assert.equal((await handleStubAttach(req({ authorization: newSecret() }), { db, relay })).status, 403)
  assert.equal((await handleStubAttach(req({ authorization: authz }), { db: null, relay })).status, 503)
})

test("host gate: /api/runtime/v1/attach is self-authenticating on the ingress host; no stub relay route is deployed", () => {
  assert.deepEqual(decideMachineIngress({ pathname: "/api/runtime/v1/attach", suppliedKey: null, configuredKey: undefined }), { kind: "ALLOW_SELF_AUTHENTICATING" })
  assert.equal(decideMachineIngress({ pathname: "/api/runtime/v1/attach/", suppliedKey: null, configuredKey: undefined }).kind, "DENY")
  const src = readFileSync(path.join(here, "stubAttachmentRelay.ts"), "utf8").replace(/^\s*\/\/.*$/gm, "")
  assert.doesNotMatch(src, /console\.|process\.env|turn:|stun:|wss?:\/\/|RTCPeer|webrtc/i)
  for (const m of src.matchAll(/from\s+"([^"]+)"/g)) assert.ok(/^\.\/(authorityDb|credentials|gateway|streamCapability)\.ts$/.test(m[1]), m[1])
  const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
  for (const f of walk(path.join(here, "../../app"))) assert.doesNotMatch(readFileSync(f, "utf8"), /stubAttachmentRelay|handleStubAttach/, f)
})
