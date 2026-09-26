// @avatark/runtime-bridge unit tests (no database, no network) — WORLDK-M14-B1, extracted in M14-B2: the RuntimeBridge mapping, the
// lifecycle firewall, versioning, the canonical JSON Schema and the fixtures.
import { test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import Ajv from "ajv"
import {
  AUTHORITY_MATRIX, commandFor, FORBIDDEN_BRIDGE_FIELDS, parseBridgeMessage, RENDERER_EVENT_KINDS, RUNTIME_BRIDGE_PROTOCOL, RUNTIME_BRIDGE_SCHEMA_VERSION, stateAfterReply,
  type BridgeSessionState, type RendererEvent,
} from "./protocol.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const FIX = path.join(here, "../fixtures/v1")
const ajv = new Ajv({ allErrors: true, strict: false })
const validateSchema = ajv.compile(JSON.parse(readFileSync(path.join(here, "../schemas/v1/runtime-bridge-message.schema.json"), "utf8")))
const STATES: BridgeSessionState[] = ["UNCLAIMED", "CLAIMED", "JOINED", "DEPARTED", "DROPPED", "ENDED_BY_PLATFORM"]
const S = randomUUID()
const ctx = { receiptId: randomUUID(), worldId: "living-forest" }
const sample = (kind: RendererEvent["kind"]): RendererEvent =>
  kind === "RENDERER_AVAILABLE" ? { kind, readiness: "READY" } : kind === "RENDERER_ABANDONED" ? { kind } : kind === "WORLD_INTERACTION" ? { kind, intent: { type: "enter-world" } } : { kind, sessionId: S }

test("mapping: the canonical renderer-fact -> ingress table", () => {
  const expect: Record<string, string> = {
    "RENDERER_AVAILABLE/*": "poll",
    "ALLOCATION_ACQUIRED/UNCLAIMED": "claim",
    "STREAM_JOINED/CLAIMED": "arrival",
    "PRESENCE_TICK/JOINED": "presence",
    "STREAM_LOST/JOINED": "disconnect",
    "STREAM_LOST/CLAIMED": "disconnect",
    "VISITOR_LEFT/JOINED": "departure",
  }
  for (const kind of RENDERER_EVENT_KINDS) for (const state of STATES) {
    const cmd = commandFor(sample(kind), state, ctx)
    const want = expect[`${kind}/${state}`] ?? expect[`${kind}/*`]
    if (want) assert.equal(cmd.kind === "INGRESS" && cmd.op, want, `${kind} in ${state}`)
    else assert.notEqual(cmd.kind, "INGRESS", `${kind} in ${state} must not reach the ingress`)
  }
})

test("firewall: WebRTC loss is never a departure; abandonment and world interactions never reach the ingress", () => {
  for (const state of STATES) {
    const lost = commandFor({ kind: "STREAM_LOST", sessionId: S }, state, ctx)
    assert.ok(lost.kind !== "INGRESS" || lost.op === "disconnect", `STREAM_LOST in ${state}`)
    assert.equal(commandFor({ kind: "RENDERER_ABANDONED" }, state, ctx).kind, "NO_OP")
    for (const type of ["enter-world", "leave-world", "visit-location", "select-encounter", "begin-reflection", "anything-else"]) {
      const c = commandFor({ kind: "WORLD_INTERACTION", intent: { type, worldId: "living-forest" } }, state, ctx)
      assert.deepEqual(c, { kind: "NO_OP", reason: "LIFECYCLE_INERT_WORLD_INTERACTION" }, `${type} in ${state}`)
    }
  }
  // Only an explicit VISITOR_LEFT can produce a departure.
  for (const kind of RENDERER_EVENT_KINDS) for (const state of STATES) {
    const c = commandFor(sample(kind), state, ctx)
    if (c.kind === "INGRESS" && c.op === "departure") assert.equal(kind, "VISITOR_LEFT")
    if (c.kind === "INGRESS" && c.op === "arrival") assert.equal(kind, "STREAM_JOINED")
  }
})

test("bodies: a bridge command carries only what the ingress reads, never an authority field", () => {
  const allowed: Record<string, string[]> = { poll: ["readiness"], claim: ["sessionId"], arrival: ["receiptId", "sessionId", "worldId"], presence: ["receiptId", "sessionId", "worldId"], disconnect: ["receiptId", "sessionId", "worldId"], departure: ["receiptId", "sessionId", "worldId"] }
  for (const kind of RENDERER_EVENT_KINDS) for (const state of STATES) {
    const c = commandFor(sample(kind), state, ctx)
    if (c.kind !== "INGRESS") continue
    assert.deepEqual(Object.keys(c.body).sort(), [...allowed[c.op]!].sort(), `${kind}/${state}`)
    for (const f of FORBIDDEN_BRIDGE_FIELDS) assert.ok(!(f in c.body), f)
  }
  assert.deepEqual(commandFor({ kind: "STREAM_JOINED", sessionId: S }, "CLAIMED"), { kind: "REFUSED", reason: "RECEIPT_CONTEXT_REQUIRED" }, "no receipt without a fresh receiptId and the Platform's worldId")
})

test("replies: the Platform can end a session on its own authority; the bridge never argues", () => {
  const arrival = commandFor({ kind: "STREAM_JOINED", sessionId: S }, "CLAIMED", ctx)
  assert.equal(stateAfterReply(arrival, "CLAIMED", { status: 200, body: { outcome: "VISIT_OPENED" } }), "JOINED")
  assert.equal(stateAfterReply(arrival, "CLAIMED", { status: 200, body: { outcome: "SESSION_RESUMED" } }), "JOINED")
  assert.equal(stateAfterReply(arrival, "CLAIMED", { status: 409, body: { error: "ALLOCATION_RELEASED" } }), "ENDED_BY_PLATFORM")
  const hb = commandFor({ kind: "PRESENCE_TICK", sessionId: S }, "JOINED", ctx)
  assert.equal(stateAfterReply(hb, "JOINED", { status: 200, body: { outcome: "VISIT_TIMED_OUT" } }), "ENDED_BY_PLATFORM")
  assert.equal(stateAfterReply(hb, "JOINED", { status: 409, body: { error: "VISIT_CLOSED" } }), "ENDED_BY_PLATFORM")
  assert.equal(stateAfterReply(hb, "JOINED", { status: 503, body: { error: "UNAVAILABLE" } }), "JOINED", "transient failure: retry later, state unchanged")
  const dep = commandFor({ kind: "VISITOR_LEFT", sessionId: S }, "JOINED", ctx)
  assert.equal(stateAfterReply(dep, "JOINED", { status: 200, body: { outcome: "ALREADY_CLOSED_PRESENCE_TIMEOUT" } }), "ENDED_BY_PLATFORM")
  assert.equal(stateAfterReply(dep, "JOINED", { status: 200, body: { outcome: "VISIT_CLOSED" } }), "DEPARTED")
  const drop = commandFor({ kind: "STREAM_LOST", sessionId: S }, "JOINED", ctx)
  assert.equal(stateAfterReply(drop, "JOINED", { status: 200, body: { outcome: "GRACE_RUNNING" } }), "DROPPED")
})

test("authority matrix: every lifecycle fact is decided by the Platform, and matches the mapping", () => {
  for (const [fact, row] of Object.entries(AUTHORITY_MATRIX)) {
    assert.equal(row.decidedBy, "PLATFORM", fact)
    if (row.rendererEvent) {
      const state: BridgeSessionState = row.rendererEvent === "STREAM_JOINED" ? "CLAIMED" : "JOINED"
      const c = commandFor(sample(row.rendererEvent), state, ctx)
      assert.equal(c.kind === "INGRESS" && c.op, row.ingressOp, fact)
    }
  }
  assert.equal(AUTHORITY_MATRIX.VISIT_CLOSE_TIMEOUT.rendererEvent, null, "timeout closure needs no renderer")
  assert.equal(AUTHORITY_MATRIX.VISIT_CLOSE_TIMEOUT.ingressOp, null)
})

test("versioning fixture: parser and canonical schema agree; major mismatch fails closed; newer minor accepted", () => {
  const fx = JSON.parse(readFileSync(path.join(FIX, "08-versioning.json"), "utf8")) as { messages: { message: unknown; expect: string; reason?: string; minorAhead?: boolean; schemaValid: boolean }[] }
  assert.ok(fx.messages.length >= 10)
  for (const m of fx.messages) {
    const p = parseBridgeMessage(m.message)
    assert.equal(p.status, m.expect, JSON.stringify(m.message))
    if (m.reason) assert.equal((p as { reason: string }).reason, m.reason)
    if (m.minorAhead) assert.equal((p as { minorAhead: boolean }).minorAhead, true)
    assert.equal(validateSchema(m.message), m.schemaValid, `schema: ${JSON.stringify(m.message)}`)
  }
})

test("fixtures: every renderer message in every scenario is schema-valid and parses", () => {
  const files = readdirSync(FIX).filter((f) => /^0[1-79]-.*\.json$/.test(f))
  assert.equal(files.length, 8)
  for (const f of files) {
    const fx = JSON.parse(readFileSync(path.join(FIX, f), "utf8")) as { steps: { renderer?: Record<string, unknown>; session?: string }[] }
    for (const s of fx.steps.filter((x) => x.renderer)) {
      const event = { ...s.renderer, ...(s.session ? { sessionId: S } : {}) }
      const message = { protocol: RUNTIME_BRIDGE_PROTOCOL, schemaVersion: RUNTIME_BRIDGE_SCHEMA_VERSION, event }
      assert.equal(parseBridgeMessage(message).status, "ACCEPTED", `${f}: ${JSON.stringify(event)}`)
      assert.equal(validateSchema(message), true, `${f}: ${JSON.stringify(validateSchema.errors)}`)
    }
  }
})

test("robustness: the parser never throws on hostile input", () => {
  const hostile: unknown[] = [null, undefined, 0, "", [], [1], { protocol: RUNTIME_BRIDGE_PROTOCOL }, { protocol: RUNTIME_BRIDGE_PROTOCOL, schemaVersion: "1.0" }, { protocol: RUNTIME_BRIDGE_PROTOCOL, schemaVersion: "1.0", event: [] }, { protocol: RUNTIME_BRIDGE_PROTOCOL, schemaVersion: "1.0", event: { kind: 7 } }, { protocol: RUNTIME_BRIDGE_PROTOCOL, schemaVersion: "1.x", event: {} }, { protocol: RUNTIME_BRIDGE_PROTOCOL, schemaVersion: "99999999999999999999.0", event: {} }, { protocol: RUNTIME_BRIDGE_PROTOCOL, schemaVersion: "1.0", event: { kind: "WORLD_INTERACTION", intent: "x" } }]
  for (const h of hostile) assert.doesNotThrow(() => parseBridgeMessage(h))
  for (const h of hostile) assert.notEqual(parseBridgeMessage(h).status, "ACCEPTED", JSON.stringify(h))
})
