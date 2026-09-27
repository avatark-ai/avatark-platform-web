// WORLDK-M14-B6 unit suite (no database): RendererSessionSnapshot construction
// over the real deterministic Living Forest fixture facts, the ingress
// `snapshot` op, the SDK read path, the host gate and the B1 freeze.
import { test } from "node:test"
import assert from "node:assert/strict"
import { createHash, randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import Ajv from "ajv"
import addFormats from "ajv-formats"
import { RUNTIME_OPS as SDK_OPS, RuntimeBridge, SNAPSHOT_OP as SDK_SNAPSHOT_OP, type IngressReply } from "@avatark/runtime-bridge"
import { WORLD_BINDINGS, resolveWorldBinding, type WorldBinding } from "../worldConsumer/bindings.ts"
import { createLivingForestFixtureFactSource, type WorldFacts } from "../worldConsumer/facts.ts"
import { decideMachineIngress } from "../worldConsumer/machineIngress.ts"
import { EntryAuthorityError, type EntryAuthorityDb } from "../worldEntry/authorityDb.ts"
import { newRuntimeCredential, newSecret } from "../worldEntry/credentials.ts"
import {
  buildRendererSessionSnapshot, createRendererSnapshotPort, RENDERER_FORBIDDEN_FIELD_NAMES, RENDERER_PLACEHOLDER_IDENTITY, rendererForbiddenFieldsIn, RendererSnapshotUnavailable, type RenderContext,
} from "./rendererSessionSnapshot.ts"
import { handleRuntimeIngress, RUNTIME_OPS, SNAPSHOT_OP, type RuntimeSnapshotDb } from "../worldEntry/runtimeIngress.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const ORIGIN = "https://platform-preview.avatark.ai"
const facts = createLivingForestFixtureFactSource()
const binding = (() => { const r = resolveWorldBinding("living-forest", "FIXTURE_PREVIEW", WORLD_BINDINGS); assert.equal(r.kind, "FOUND"); return (r as { binding: WorldBinding }).binding })()
const loadFacts = async () => (await facts.load(binding.runtimeWorldId))!
const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)
const validate = ajv.compile(JSON.parse(readFileSync(path.join(here, "schemas/renderer-session-snapshot.schema.json"), "utf8")))
const ctx = (over: Partial<RenderContext> = {}): RenderContext => ({ worldId: "living-forest", reconnect: false, arrivalKind: "FIRST_VISIT", arrivalPlaceId: binding.places[0].projectionPlaceId, ...over })
const digest = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex")

test("snapshot: schema-valid for every place and context; explicit fields only; forbidden-field guard clean", async () => {
  const f = await loadFacts()
  for (const place of binding.places) {
    for (const c of [ctx({ arrivalPlaceId: place.projectionPlaceId }), ctx({ arrivalPlaceId: place.projectionPlaceId, reconnect: true, arrivalKind: "RETURNING" })]) {
      const s = buildRendererSessionSnapshot(randomUUID(), c, binding, f)
      assert.ok(validate(s), JSON.stringify(validate.errors))
      assert.deepEqual(rendererForbiddenFieldsIn(s), [])
      assert.deepEqual(Object.keys(s), ["schemaVersion", "contract", "worldId", "session", "visitor", "embodiment", "freshness"])
      assert.deepEqual(Object.keys(s.visitor), ["arrivalKind", "arrivalPlaceId"], "visitor block frozen to exactly two fields")
      assert.equal(s.schemaVersion, "1.0")
      assert.equal(s.contract, "renderer-session-snapshot")
      assert.equal(s.embodiment.current.locationId, place.runtimeLocationId)
      assert.ok(s.embodiment.reachable.length >= 1)
    }
  }
  assert.ok(RENDERER_FORBIDDEN_FIELD_NAMES.includes("userId") && RENDERER_FORBIDDEN_FIELD_NAMES.includes("visitorContext"))
})

test("snapshot: the placeholder never leaks, and no subject id is ever an input", async () => {
  const f = await loadFacts()
  const s = JSON.stringify(buildRendererSessionSnapshot(randomUUID(), ctx(), binding, f))
  assert.ok(!s.includes(RENDERER_PLACEHOLDER_IDENTITY), "visitorContext (where the placeholder lands) is never projected")
  assert.doesNotMatch(s, /visitorContext|protectedNarrative|userId|subjectId|visitId|lastLocationId/)
  // the construction code (everything before the forbidden-name list, which necessarily names them)
  const full = readFileSync(path.join(here, "rendererSessionSnapshot.ts"), "utf8").replace(/^\s*\/\/.*$/gm, "")
  const src = full.slice(0, full.indexOf("export const RENDERER_FORBIDDEN_FIELD_NAMES"))
  assert.doesNotMatch(src, /subjectId|visitId|userId\b/, "the builder module never handles identity")
  assert.doesNotMatch(src, /wakeLivingWorld|loadOrSeed|ensureWorldInstance|releasingWorldLeaseAfter|wakeWorldWithCanonicalEvents|getReturnRecognition|resolveDurable/, "no wake/seed/lease/durable path")
})

test("snapshot: deterministic bytes; freshness = facts tick/revision; generatedAt = validAsOf = observedAt; staleAfter = +60 s; facts untouched", async () => {
  const f = await loadFacts()
  const before = digest(f)
  const sid = randomUUID()
  const a = JSON.stringify(buildRendererSessionSnapshot(sid, ctx(), binding, f))
  const b = JSON.stringify(buildRendererSessionSnapshot(sid, ctx(), binding, (await facts.load(binding.runtimeWorldId))!))
  assert.equal(a, b, "byte-identical for the same sourceRevision + session context")
  assert.equal(digest(f), before, "fact source unchanged by building snapshots")
  const s = JSON.parse(a)
  assert.deepEqual(s.freshness.source, { worldTick: f.sharedState.clock.tick, worldVersion: f.sharedState.worldVersion, sourceRevision: f.sourceRevision })
  assert.equal(s.freshness.generatedAt, f.observedAt)
  assert.equal(s.freshness.validAsOf, f.observedAt)
  assert.equal(Date.parse(s.freshness.staleAfter) - Date.parse(f.observedAt), 60_000)
  assert.equal(s.embodiment.simulationTick, f.sharedState.clock.tick)
})

test("snapshot: unknown place, foreign binding, or a non-Forest world is unavailable (never a guess)", async () => {
  const f = await loadFacts()
  assert.throws(() => buildRendererSessionSnapshot(randomUUID(), ctx({ arrivalPlaceId: "nowhere" }), binding, f), RendererSnapshotUnavailable)
  assert.throws(() => buildRendererSessionSnapshot(randomUUID(), ctx({ worldId: "living-vrindavan" }), binding, f), RendererSnapshotUnavailable)
  assert.throws(() => buildRendererSessionSnapshot(randomUUID(), ctx(), { ...binding, runtimeWorldId: "other" }, { ...f, runtimeWorldId: "other" } as WorldFacts), RendererSnapshotUnavailable)
})

// ── ingress op ─────────────────────────────────────────────────────
const unused = async () => { throw new Error("unused") }
const baseDb = { resolve: unused, redeemTicket: unused, sessionView: unused, requestLeave: unused, runtimePoll: unused, runtimeClaim: unused, runtimeArrival: unused, runtimePresence: unused, runtimeDeparture: unused, runtimeDisconnect: unused, sweep: unused } as unknown as EntryAuthorityDb
function snapDb(fail?: string, c: RenderContext = ctx()) {
  const calls: { credentialId: string; sessionId: string }[] = []
  const db: EntryAuthorityDb & RuntimeSnapshotDb = { ...baseDb, async runtimeSessionRenderContext(credentialId, _s, sessionId) { calls.push({ credentialId, sessionId }); if (fail) throw new EntryAuthorityError(fail as never); return c } }
  return { db, calls }
}
const cred = newRuntimeCredential()
const ingress = (body: unknown, db: EntryAuthorityDb | null, headers: Record<string, string> = { authorization: `Bearer ${cred.bearer}` }) =>
  handleRuntimeIngress(new Request(`${ORIGIN}/api/runtime/v1/snapshot`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }), "snapshot", { db, mode: "FIXTURE_PREVIEW", facts, snapshots: createRendererSnapshotPort({ mode: "FIXTURE_PREVIEW", facts }) })

test("ingress snapshot: 200 with private,no-store + ETag = sourceRevision; 304 only after authorization", async () => {
  const f = await loadFacts()
  const { db, calls } = snapDb()
  const sid = randomUUID()
  const r = await ingress({ sessionId: sid }, db)
  assert.equal(r.status, 200)
  assert.equal(r.headers.get("cache-control"), "private, no-store")
  assert.equal(r.headers.get("etag"), `"${f.sourceRevision}"`)
  const body = (await r.json()) as { session: { sessionId: string } }
  assert.ok(validate(JSON.parse(JSON.stringify(body))))
  assert.equal(body.session.sessionId, sid)
  assert.deepEqual(calls, [{ credentialId: cred.credentialId, sessionId: sid }])
  const nm = await ingress({ sessionId: sid }, db, { authorization: `Bearer ${cred.bearer}`, "if-none-match": `"${f.sourceRevision}"` })
  assert.equal(nm.status, 304)
  assert.equal(await nm.text(), "")
  const refused = await ingress({ sessionId: sid }, snapDb("SESSION_NOT_ELIGIBLE").db, { authorization: `Bearer ${cred.bearer}`, "if-none-match": `"${f.sourceRevision}"` })
  assert.equal(refused.status, 409, "an ETag never bypasses authorization")
})

test("ingress snapshot: only {sessionId}; uniform 401 for any auth failure; 403 SESSION_NOT_BOUND; 409 SESSION_NOT_ELIGIBLE", async () => {
  const { db, calls } = snapDb()
  for (const body of [{}, { sessionId: "x" }, { sessionId: randomUUID(), subjectId: randomUUID() }, { sessionId: randomUUID(), worldId: "living-forest" }, { sessionId: randomUUID(), placeId: "forest-pond" }, { sessionId: randomUUID(), userId: "u" }]) {
    assert.equal((await ingress(body, db)).status, 400, JSON.stringify(body))
  }
  assert.equal(calls.length, 0)
  for (const h of [{}, { authorization: "Bearer " + newSecret() }, { authorization: "Bearer wkrt1.nope" }] as Record<string, string>[]) assert.equal((await ingress({ sessionId: randomUUID() }, db, h)).status, 401)
  for (const code of ["RUNTIME_CREDENTIAL_INVALID", "RUNTIME_CREDENTIAL_REVOKED", "RUNTIME_CREDENTIAL_EXPIRED", "RUNTIME_INSTANCE_REVOKED"]) {
    const r = await ingress({ sessionId: randomUUID() }, snapDb(code).db)
    assert.deepEqual([r.status, await r.json()], [401, { error: "RUNTIME_UNAUTHORIZED" }], code)
  }
  assert.deepEqual(await ingress({ sessionId: randomUUID() }, snapDb("SESSION_NOT_BOUND").db).then(async (r) => [r.status, await r.json()]), [403, { error: "SESSION_NOT_BOUND" }])
  assert.deepEqual(await ingress({ sessionId: randomUUID() }, snapDb("SESSION_NOT_ELIGIBLE").db).then(async (r) => [r.status, await r.json()]), [409, { error: "SESSION_NOT_ELIGIBLE" }])
  assert.equal((await ingress({ sessionId: randomUUID() }, baseDb)).status, 503, "a DB without the method answers honestly unavailable")
  const noPort = await handleRuntimeIngress(new Request(`${ORIGIN}/api/runtime/v1/snapshot`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${cred.bearer}` }, body: JSON.stringify({ sessionId: randomUUID() }) }), "snapshot", { db: snapDb().db, mode: "FIXTURE_PREVIEW", facts })
  assert.equal(noPort.status, 503, "no renderer projection wired -> honestly unavailable")
  assert.equal((await ingress({ sessionId: randomUUID() }, snapDb(undefined, ctx({ arrivalPlaceId: "nowhere" })).db)).status, 503)
})

test("SDK readSnapshot: only for a session this bridge claimed/joined; posts {sessionId} to `snapshot`; no local state change", async () => {
  const posted: { op: string; body: Record<string, unknown> }[] = []
  const bridge = new RuntimeBridge({ transport: { async post(op, body): Promise<IngressReply> {
    posted.push({ op, body })
    if (op === "claim") return { status: 200, body: { sessionId: body.sessionId, worldId: "living-forest", reconnect: false } }
    return { status: 200, body: { schemaVersion: "1.0" } }
  } } })
  const s = randomUUID()
  assert.equal(await bridge.readSnapshot(s), null, "UNCLAIMED: no I/O")
  assert.equal(posted.length, 0)
  await bridge.handle({ kind: "ALLOCATION_ACQUIRED", sessionId: s })
  assert.deepEqual(await bridge.readSnapshot(s), { status: 200, body: { schemaVersion: "1.0" } })
  assert.deepEqual(posted.at(-1), { op: "snapshot", body: { sessionId: s } })
  assert.equal(bridge.state(s), "CLAIMED")
})

test("M14-A boundary: lib/worldEntry never imports the renderer projection; only the Next route composes it", () => {
  const ingress = readFileSync(path.join(here, "../worldEntry/runtimeIngress.ts"), "utf8").replace(/^\s*\/\/.*$/gm, "")
  assert.doesNotMatch(ingress, /rendererProjection|rendererSessionSnapshot|world-embodiment/)
  const route = readFileSync(path.join(here, "../../app/api/runtime/v1/[op]/route.ts"), "utf8")
  assert.match(route, /snapshots: createRendererSnapshotPort\(deps\)/)
})

test("B1 freeze + host gate: snapshot is outside RUNTIME_OPS on both sides; exact ingress path is self-authenticating", () => {
  assert.deepEqual([...SDK_OPS], [...RUNTIME_OPS])
  assert.ok(!(RUNTIME_OPS as readonly string[]).includes("snapshot"))
  assert.equal(SNAPSHOT_OP, "snapshot")
  assert.equal(SDK_SNAPSHOT_OP, SNAPSHOT_OP)
  for (const f of ["../../packages/runtime-bridge/src/protocol.ts", "../../packages/runtime-bridge/spec/RUNTIME_BRIDGE_PROTOCOL_v1.md"]) assert.doesNotMatch(readFileSync(path.join(here, f), "utf8"), /snapshot/i, f)
  assert.deepEqual(decideMachineIngress({ pathname: "/api/runtime/v1/snapshot", suppliedKey: null, configuredKey: undefined }), { kind: "ALLOW_SELF_AUTHENTICATING" })
  assert.equal(decideMachineIngress({ pathname: "/api/runtime/v1/snapshot/x", suppliedKey: null, configuredKey: undefined }).kind, "DENY")
})
