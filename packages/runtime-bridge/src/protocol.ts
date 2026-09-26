// @avatark/runtime-bridge — WORLDK-M14-B1 RuntimeBridge protocol (extracted in M14-B2) — the renderer-neutral contract
// between a renderer runtime (the reference runtime today; an Unreal/Pixel
// Streaming bridge in M15) and the EXISTING Platform Runtime Ingress (M14-A).
//
// A renderer observes facts about ITS OWN sessions (stream joined, stream
// lost, visitor left...). This module is the ONLY translation from those
// facts to ingress operations. It is pure: no I/O, no clock, no credentials.
//
// Authority (frozen by owner decision B0):
//   * The Platform is the sole lifecycle authority. A renderer fact is evidence,
//     never lifecycle truth. The bridge never supplies subject, visit, time,
//     tick, place or authority; the ingress derives all of them.
//   * WebRTC loss -> DISCONNECT -> grace. It is never a DEPARTURE.
//   * A reconnect inside grace is a NEW Platform session (the visitor re-enters
//     through the Platform) with binding.reconnect = true. Its STREAM_JOINED is
//     an ARRIVAL receipt that the ingress answers SESSION_RESUMED: the same
//     Visit, and no second lifecycle ARRIVAL. A bridge never "revives" a dropped session.
//   * Explicit leave/session end -> DEPARTURE through the ingress.
//   * Abandonment (renderer or process gone) -> the bridge sends NOTHING.
//     Expiry is the Platform's scheduled presence sweep (M14-A5). Nothing is fabricated.
//   * InteractionIntent enter-world / leave-world are world-simulation
//     interaction semantics. They are NEVER a lifecycle path: no ingress op, ever.
/** The Runtime Ingress operations a bridge may request (the Platform owns their semantics). */
export const RUNTIME_OPS = ["poll", "claim", "arrival", "presence", "departure", "disconnect"] as const
export type RuntimeOp = (typeof RUNTIME_OPS)[number]

export const RUNTIME_BRIDGE_PROTOCOL = "worldk.runtime-bridge"
export const RUNTIME_BRIDGE_SCHEMA_VERSION = "1.0"
const MAJOR = 1

// ── Renderer facts (the bridge's inbound vocabulary) ───────────────────
export type RendererEvent =
  | { kind: "RENDERER_AVAILABLE"; readiness: "STARTING" | "READY" }
  | { kind: "ALLOCATION_ACQUIRED"; sessionId: string }
  | { kind: "STREAM_JOINED"; sessionId: string }
  | { kind: "PRESENCE_TICK"; sessionId: string }
  | { kind: "STREAM_LOST"; sessionId: string }
  | { kind: "VISITOR_LEFT"; sessionId: string }
  | { kind: "RENDERER_ABANDONED" }
  | { kind: "WORLD_INTERACTION"; intent: { type: string } & Record<string, unknown> }

export type RendererEventKind = RendererEvent["kind"]
export const RENDERER_EVENT_KINDS: readonly RendererEventKind[] = [
  "RENDERER_AVAILABLE", "ALLOCATION_ACQUIRED", "STREAM_JOINED", "PRESENCE_TICK", "STREAM_LOST", "VISITOR_LEFT", "RENDERER_ABANDONED", "WORLD_INTERACTION",
]

/** Versioned envelope every renderer-facing message carries. */
export interface RuntimeBridgeMessage {
  protocol: typeof RUNTIME_BRIDGE_PROTOCOL
  schemaVersion: string
  event: RendererEvent
}

/**
 * Fields a bridge must never supply. The ingress ignores them anyway; the
 * bridge boundary refuses them (fail closed) so a renderer cannot even try to
 * assert lifecycle facts.
 */
export const FORBIDDEN_BRIDGE_FIELDS = ["subjectId", "visitId", "allocationId", "instanceId", "occurredAt", "worldTick", "tick", "placeId", "authority", "authorityKind", "eventType", "basis"] as const

// ── Versioning ─────────────────────────────────────────────────────────
export type ParsedBridgeMessage =
  | { status: "ACCEPTED"; event: RendererEvent; minorAhead: boolean }
  | { status: "RESYNC_REQUIRED"; reason: "MAJOR_VERSION_MISMATCH"; received: string }
  | { status: "REJECTED"; reason: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v)

/**
 * Parses an untrusted bridge message. Never throws.
 *   same major, same/older minor -> ACCEPTED
 *   same major, newer minor      -> ACCEPTED (unknown fields ignored), minorAhead = true
 *   different major              -> RESYNC_REQUIRED (fail closed; nothing is reinterpreted)
 *   malformed / forbidden fields -> REJECTED
 */
export function parseBridgeMessage(raw: unknown): ParsedBridgeMessage {
  if (!isObj(raw)) return { status: "REJECTED", reason: "NOT_AN_OBJECT" }
  if (raw.protocol !== RUNTIME_BRIDGE_PROTOCOL) return { status: "REJECTED", reason: "UNKNOWN_PROTOCOL" }
  const v = typeof raw.schemaVersion === "string" ? /^(\d+)\.(\d+)$/.exec(raw.schemaVersion) : null
  if (!v) return { status: "REJECTED", reason: "INVALID_SCHEMA_VERSION" }
  const major = Number(v[1])
  const minor = Number(v[2])
  if (major !== MAJOR) return { status: "RESYNC_REQUIRED", reason: "MAJOR_VERSION_MISMATCH", received: raw.schemaVersion as string }
  const e = raw.event
  if (!isObj(e) || typeof e.kind !== "string") return { status: "REJECTED", reason: "INVALID_EVENT" }
  for (const f of FORBIDDEN_BRIDGE_FIELDS) if (f in e || f in raw) return { status: "REJECTED", reason: `FORBIDDEN_FIELD:${f}` }
  const minorAhead = minor > Number(RUNTIME_BRIDGE_SCHEMA_VERSION.split(".")[1])
  const session = () => (typeof e.sessionId === "string" && UUID.test(e.sessionId) ? e.sessionId : null)
  switch (e.kind) {
    case "RENDERER_AVAILABLE":
      return e.readiness === "STARTING" || e.readiness === "READY" ? { status: "ACCEPTED", event: { kind: e.kind, readiness: e.readiness }, minorAhead } : { status: "REJECTED", reason: "INVALID_READINESS" }
    case "ALLOCATION_ACQUIRED":
    case "STREAM_JOINED":
    case "PRESENCE_TICK":
    case "STREAM_LOST":
    case "VISITOR_LEFT": {
      const sessionId = session()
      return sessionId ? { status: "ACCEPTED", event: { kind: e.kind, sessionId }, minorAhead } : { status: "REJECTED", reason: "INVALID_SESSION_ID" }
    }
    case "RENDERER_ABANDONED":
      return { status: "ACCEPTED", event: { kind: e.kind }, minorAhead }
    case "WORLD_INTERACTION":
      return isObj(e.intent) && typeof e.intent.type === "string"
        ? { status: "ACCEPTED", event: { kind: e.kind, intent: e.intent as { type: string } }, minorAhead }
        : { status: "REJECTED", reason: "INVALID_INTENT" }
    default:
      return minorAhead ? { status: "REJECTED", reason: "UNKNOWN_EVENT_FROM_NEWER_MINOR" } : { status: "REJECTED", reason: "UNKNOWN_EVENT" }
  }
}

// ── Per-session bridge state ───────────────────────────────────────────
/** The bridge's LOCAL view of one Platform session. It is not lifecycle state and is never authoritative. */
export type BridgeSessionState = "UNCLAIMED" | "CLAIMED" | "JOINED" | "DEPARTED" | "DROPPED" | "ENDED_BY_PLATFORM"
const TERMINAL: ReadonlySet<BridgeSessionState> = new Set(["DEPARTED", "DROPPED", "ENDED_BY_PLATFORM"])
export const isTerminal = (s: BridgeSessionState) => TERMINAL.has(s)

export type BridgeCommand =
  | { kind: "INGRESS"; op: RuntimeOp; body: Record<string, unknown>; onSuccess: BridgeSessionState | null }
  | { kind: "NO_OP"; reason: "LIFECYCLE_INERT_WORLD_INTERACTION" | "ABANDONMENT_IS_PLATFORM_EXPIRY" }
  | { kind: "REFUSED"; reason: string }

/**
 * THE mapping. Given the bridge's local state for the event's session, return
 * the single ingress operation (or none) the bridge may send. `receiptId` and
 * `worldId` come from the caller: a fresh uuid per receipt, and the worldId from
 * the Platform's own binding (never renderer-chosen).
 */
export function commandFor(event: RendererEvent, state: BridgeSessionState, ctx: { receiptId?: string; worldId?: string } = {}): BridgeCommand {
  const receipt = (op: RuntimeOp, sessionId: string, onSuccess: BridgeSessionState | null): BridgeCommand =>
    ctx.receiptId && ctx.worldId ? { kind: "INGRESS", op, body: { receiptId: ctx.receiptId, sessionId, worldId: ctx.worldId }, onSuccess } : { kind: "REFUSED", reason: "RECEIPT_CONTEXT_REQUIRED" }
  switch (event.kind) {
    case "RENDERER_AVAILABLE":
      return { kind: "INGRESS", op: "poll", body: { readiness: event.readiness }, onSuccess: null }
    case "WORLD_INTERACTION":
      // enter-world / leave-world included: world-simulation semantics only.
      return { kind: "NO_OP", reason: "LIFECYCLE_INERT_WORLD_INTERACTION" }
    case "RENDERER_ABANDONED":
      return { kind: "NO_OP", reason: "ABANDONMENT_IS_PLATFORM_EXPIRY" }
  }
  if (isTerminal(state)) return { kind: "REFUSED", reason: `SESSION_${state}` }
  switch (event.kind) {
    case "ALLOCATION_ACQUIRED":
      return state === "UNCLAIMED" ? { kind: "INGRESS", op: "claim", body: { sessionId: event.sessionId }, onSuccess: "CLAIMED" } : { kind: "REFUSED", reason: "ALREADY_CLAIMED" }
    case "STREAM_JOINED":
      return state === "CLAIMED" ? receipt("arrival", event.sessionId, "JOINED") : { kind: "REFUSED", reason: state === "JOINED" ? "ALREADY_JOINED" : "NOT_CLAIMED" }
    case "PRESENCE_TICK":
      return state === "JOINED" ? receipt("presence", event.sessionId, null) : { kind: "REFUSED", reason: "NOT_JOINED" }
    case "STREAM_LOST":
      // A renderer fact: grace starts. Never a departure.
      return state === "JOINED" || state === "CLAIMED" ? receipt("disconnect", event.sessionId, "DROPPED") : { kind: "REFUSED", reason: "NOT_CLAIMED" }
    case "VISITOR_LEFT":
      return state === "JOINED" ? receipt("departure", event.sessionId, "DEPARTED") : { kind: "REFUSED", reason: "NOT_JOINED" }
  }
}

/**
 * Interprets the ingress reply to a bridge command. The Platform can end a
 * session on its own authority (timeout, release, supersede). The bridge then
 * stops acting on it (ENDED_BY_PLATFORM) and never argues.
 */
export function stateAfterReply(cmd: BridgeCommand, prior: BridgeSessionState, reply: { status: number; body: Record<string, unknown> }): BridgeSessionState {
  if (cmd.kind !== "INGRESS") return prior
  const outcome = String(reply.body.outcome ?? reply.body.error ?? "")
  if (reply.status === 200) {
    if (cmd.op === "presence" && outcome === "VISIT_TIMED_OUT") return "ENDED_BY_PLATFORM"
    if (cmd.op === "departure" && outcome.startsWith("ALREADY_CLOSED_")) return "ENDED_BY_PLATFORM"
    return cmd.onSuccess ?? prior
  }
  if (["SESSION_ENDED", "VISIT_CLOSED", "ALLOCATION_RELEASED", "NO_OPEN_VISIT"].includes(outcome)) return "ENDED_BY_PLATFORM"
  return prior
}

// ── Authority matrix (who may cause what) ──────────────────────────────
export type LifecycleFact = "VISIT_OPEN" | "PRESENCE" | "GRACE" | "VISIT_CLOSE_EXPLICIT" | "VISIT_CLOSE_TIMEOUT" | "RECONNECT_SAME_VISIT"
export const AUTHORITY_MATRIX: Readonly<Record<LifecycleFact, { decidedBy: "PLATFORM"; evidence: string; rendererEvent: RendererEventKind | null; ingressOp: RuntimeOp | null }>> = {
  VISIT_OPEN: { decidedBy: "PLATFORM", evidence: "verified ARRIVAL receipt on a claimed session of the allocated instance", rendererEvent: "STREAM_JOINED", ingressOp: "arrival" },
  PRESENCE: { decidedBy: "PLATFORM", evidence: "verified PRESENCE receipt on a joined session", rendererEvent: "PRESENCE_TICK", ingressOp: "presence" },
  GRACE: { decidedBy: "PLATFORM", evidence: "DISCONNECT receipt (renderer fact); the Visit stays open", rendererEvent: "STREAM_LOST", ingressOp: "disconnect" },
  VISIT_CLOSE_EXPLICIT: { decidedBy: "PLATFORM", evidence: "verified DEPARTURE receipt (explicit leave / session completion)", rendererEvent: "VISITOR_LEFT", ingressOp: "departure" },
  VISIT_CLOSE_TIMEOUT: { decidedBy: "PLATFORM", evidence: "scheduled presence sweep (M14-A5); no renderer involvement", rendererEvent: null, ingressOp: null },
  RECONNECT_SAME_VISIT: { decidedBy: "PLATFORM", evidence: "Platform re-entry inside grace mints a reconnect session; its ARRIVAL receipt answers SESSION_RESUMED", rendererEvent: "STREAM_JOINED", ingressOp: "arrival" },
}
