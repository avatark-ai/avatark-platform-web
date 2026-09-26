// @avatark/runtime-bridge SDK driver tests (no network, no database) and the
// package boundary audit — WORLDK-M14-B2.
import { test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { reconcileWithWork, RuntimeBridge, type IngressReply, type RuntimeBridgeTransport } from "./bridge.ts"
import { RUNTIME_BRIDGE_PROTOCOL, type BridgeSessionState, type RuntimeOp } from "./protocol.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const S = randomUUID()

function fakeTransport(reply: (op: RuntimeOp, body: Record<string, unknown>) => IngressReply) {
  const calls: { op: RuntimeOp; body: Record<string, unknown> }[] = []
  const transport: RuntimeBridgeTransport = { post: async (op, body) => (calls.push({ op, body }), reply(op, body)) }
  return { transport, calls }
}
const okReplies = (op: RuntimeOp): IngressReply =>
  op === "claim" ? { status: 200, body: { sessionId: S, worldId: "living-forest", reconnect: false } }
    : op === "poll" ? { status: 200, body: { heartbeatSeconds: 15, graceSeconds: 120, sessions: [] } }
      : { status: 200, body: { outcome: op === "arrival" ? "VISIT_OPENED" : op === "disconnect" ? "GRACE_RUNNING" : "OK" } }

test("driver: a full session through an injected transport; worldId comes from the Platform's claim binding", async () => {
  const { transport, calls } = fakeTransport(okReplies)
  const ids = ["r1", "r2", "r3", "r4", "r5"]
  const b = new RuntimeBridge({ transport, newReceiptId: () => ids.shift()! })
  assert.equal((await b.handle({ kind: "RENDERER_AVAILABLE", readiness: "READY" })).command.kind, "INGRESS")
  assert.equal((await b.handle({ kind: "ALLOCATION_ACQUIRED", sessionId: S })).state, "CLAIMED")
  assert.deepEqual(b.binding(S), { sessionId: S, worldId: "living-forest", reconnect: false })
  assert.equal((await b.handle({ kind: "STREAM_JOINED", sessionId: S })).state, "JOINED")
  assert.equal((await b.handle({ kind: "PRESENCE_TICK", sessionId: S })).state, "JOINED")
  assert.equal((await b.handle({ kind: "VISITOR_LEFT", sessionId: S })).state, "DEPARTED")
  assert.deepEqual(calls.map((c) => c.op), ["poll", "claim", "arrival", "presence", "departure"])
  for (const c of calls.slice(2)) assert.equal(c.body.worldId, "living-forest")
  assert.deepEqual(calls.slice(2).map((c) => c.body.receiptId), ["r3", "r4", "r5"], "a fresh receipt id per command")
})

test("driver: refusals and firewall NO_OPs never touch the transport", async () => {
  const { transport, calls } = fakeTransport(okReplies)
  const b = new RuntimeBridge({ transport })
  for (const e of [
    { kind: "STREAM_JOINED", sessionId: S },
    { kind: "PRESENCE_TICK", sessionId: S },
    { kind: "VISITOR_LEFT", sessionId: S },
    { kind: "RENDERER_ABANDONED" },
    { kind: "WORLD_INTERACTION", intent: { type: "enter-world" } },
    { kind: "WORLD_INTERACTION", intent: { type: "leave-world" } },
  ] as const) assert.notEqual((await b.handle(e)).command.kind, "INGRESS", JSON.stringify(e))
  const bad = await b.handleMessage({ protocol: RUNTIME_BRIDGE_PROTOCOL, schemaVersion: "2.0", event: { kind: "STREAM_JOINED", sessionId: S } })
  assert.equal(bad.parsed.status, "RESYNC_REQUIRED")
  assert.equal(bad.result, null)
  const forged = await b.handleMessage({ protocol: RUNTIME_BRIDGE_PROTOCOL, schemaVersion: "1.0", event: { kind: "ALLOCATION_ACQUIRED", sessionId: S, visitId: S } })
  assert.equal(forged.parsed.status, "REJECTED")
  assert.equal(calls.length, 0)
})

test("driver: transient failures keep state; Platform-ended sessions stop", async () => {
  let fail: IngressReply | null = { status: 503, body: { error: "UNAVAILABLE" } }
  const { transport } = fakeTransport((op) => fail ?? okReplies(op))
  const b = new RuntimeBridge({ transport })
  assert.equal((await b.handle({ kind: "ALLOCATION_ACQUIRED", sessionId: S })).state, "UNCLAIMED", "retry later")
  assert.equal(b.binding(S), null)
  fail = null
  await b.handle({ kind: "ALLOCATION_ACQUIRED", sessionId: S })
  await b.handle({ kind: "STREAM_JOINED", sessionId: S })
  fail = { status: 409, body: { error: "VISIT_CLOSED" } }
  assert.equal((await b.handle({ kind: "PRESENCE_TICK", sessionId: S })).state, "ENDED_BY_PLATFORM")
  assert.equal((await b.handle({ kind: "PRESENCE_TICK", sessionId: S })).command.kind, "REFUSED")
})

test("reconcile: Platform-reported joined advances CLAIMED only; never regresses, never leaves terminal, never skips the claim", () => {
  const w = (joined: boolean) => ({ sessionId: S, claimed: true, joined, leaveRequested: false, reconnect: false })
  assert.equal(reconcileWithWork("CLAIMED", w(true)), "JOINED")
  assert.equal(reconcileWithWork("CLAIMED", w(false)), "CLAIMED")
  assert.equal(reconcileWithWork("UNCLAIMED", w(true)), "UNCLAIMED", "the binding must come from a claim")
  assert.equal(reconcileWithWork("JOINED", w(false)), "JOINED", "never regresses")
  for (const t of ["DEPARTED", "DROPPED", "ENDED_BY_PLATFORM"] as BridgeSessionState[]) assert.equal(reconcileWithWork(t, w(true)), t)
})

test("boundary: the package owns no networking, credentials, URLs, persistence or Platform authority", () => {
  const pkg = JSON.parse(readFileSync(path.join(here, "../package.json"), "utf8"))
  assert.equal(pkg.dependencies, undefined, "no runtime dependencies")
  for (const f of readdirSync(here).filter((x) => x.endsWith(".ts") && !x.endsWith(".test.ts"))) {
    const code = readFileSync(path.join(here, f), "utf8").replace(/^\s*\/\/.*$/gm, "")
    for (const m of code.matchAll(/from\s+"([^"]+)"/g)) assert.ok(m[1]!.startsWith("./"), `${f} imports ${m[1]} (only relative imports allowed)`)
    assert.doesNotMatch(code, /\bfetch\s*\(|XMLHttpRequest|WebSocket|process\.env|https?:\/\/|supabase|service_role|postgres|\bpg\b|DATABASE_URL|console\./i, f)
    assert.doesNotMatch(code, /pixel.?stream|signall?ing|\bgpu\b|unreal|webrtc\s*\(/i, `${f}: no renderer/streaming implementation`)
  }
})
