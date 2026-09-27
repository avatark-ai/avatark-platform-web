// @avatark/runtime-bridge — the SDK driver (WORLDK-M14-B2).
//
// Applies the B1 protocol (commandFor / stateAfterReply) to renderer facts and
// executes the resulting ingress commands through an INJECTED transport. The
// SDK performs no networking, holds no credential, knows no URL and keeps no
// lifecycle state: its per-session state is the bridge's local, non-
// authoritative view (B1 §1). The Platform stays the sole lifecycle authority.
import { commandFor, parseBridgeMessage, stateAfterReply, type BridgeCommand, type BridgeSessionState, type ParsedBridgeMessage, type RendererEvent, type RuntimeOp } from "./protocol.ts"
import { isTerminal } from "./protocol.ts"

/** What an ingress call returned. The adapter maps its transport (HTTP, test double...) to this. */
export interface IngressReply {
  status: number
  body: Record<string, unknown>
}

/**
 * The ONLY I/O boundary. The runtime adapter owns HTTP, the endpoint, the
 * instance credential, timeouts and retries; the SDK only hands it a command.
 */
export interface RuntimeBridgeTransport {
  post(op: RuntimeOp, body: Record<string, unknown>): Promise<IngressReply>
}

/**
 * WORLDK-M14-B4: the stream attachment Runtime Ingress operation. It is NOT a
 * B1 RendererEvent and not part of RUNTIME_OPS (B1 stays frozen): the bridge
 * host calls it explicitly with the digest of the authorization it received
 * for one of its claimed sessions. Attach is never arrival and never changes
 * the local session state. It reuses the injected transport unchanged: a
 * transport maps an op to its ingress path generically (/api/runtime/v1/<op>).
 */
export const ATTACH_OP = "attach"
/** WORLDK-M14-B6: the read-only renderer session snapshot op (also not a RendererEvent). */
export const SNAPSHOT_OP = "snapshot"
export type IngressOp = RuntimeOp | typeof ATTACH_OP | typeof SNAPSHOT_OP

const SHA256_HEX = /^[0-9a-f]{64}$/

/** The Platform's binding for a claimed session (from the claim reply). */
export interface SessionBinding {
  sessionId: string
  worldId: string
  reconnect: boolean
}

/** The subset of a poll work item the bridge reads (Platform-reported session facts). */
export interface PlatformSessionWork {
  sessionId: string
  claimed: boolean
  joined: boolean
  leaveRequested: boolean
  reconnect: boolean
}

export interface BridgeResult {
  command: BridgeCommand
  reply: IngressReply | null
  /** local state after the command (and reply) */
  state: BridgeSessionState
}

export interface RuntimeBridgeOptions {
  transport: RuntimeBridgeTransport
  /** a fresh receipt id per receipt (default: crypto.randomUUID) */
  newReceiptId?: () => string
}

/**
 * Platform-reported facts win over local memory: a session the Platform
 * reports as joined is JOINED locally (e.g. after a runtime process restart).
 * It never regresses, never leaves a terminal state, and never skips the claim:
 * the binding (worldId) comes only from the Platform's claim reply.
 */
export function reconcileWithWork(state: BridgeSessionState, work: PlatformSessionWork): BridgeSessionState {
  if (isTerminal(state)) return state
  if (state === "CLAIMED" && work.joined) return "JOINED"
  return state
}

export class RuntimeBridge {
  private readonly transport: RuntimeBridgeTransport
  private readonly newReceiptId: () => string
  private readonly states = new Map<string, BridgeSessionState>()
  private readonly bindings = new Map<string, SessionBinding>()

  constructor(opts: RuntimeBridgeOptions) {
    this.transport = opts.transport
    this.newReceiptId = opts.newReceiptId ?? (() => globalThis.crypto.randomUUID())
  }

  state(sessionId: string): BridgeSessionState {
    return this.states.get(sessionId) ?? "UNCLAIMED"
  }

  binding(sessionId: string): SessionBinding | null {
    return this.bindings.get(sessionId) ?? null
  }

  /** Reconciles local state with the Platform's work list (a poll reply). */
  observeWork(work: readonly PlatformSessionWork[]): void {
    for (const w of work) {
      const next = reconcileWithWork(this.state(w.sessionId), w)
      if (next !== this.state(w.sessionId)) this.states.set(w.sessionId, next)
    }
  }

  /** Handles one (already trusted/typed) renderer fact. */
  async handle(event: RendererEvent): Promise<BridgeResult> {
    const sessionId = "sessionId" in event ? event.sessionId : null
    const prior = sessionId ? this.state(sessionId) : "UNCLAIMED"
    const command = commandFor(event, prior, { receiptId: this.newReceiptId(), worldId: sessionId ? this.bindings.get(sessionId)?.worldId : undefined })
    if (command.kind !== "INGRESS") return { command, reply: null, state: prior }
    const reply = await this.transport.post(command.op, command.body)
    if (command.op === "claim" && reply.status === 200 && sessionId) {
      this.bindings.set(sessionId, { sessionId, worldId: String(reply.body.worldId), reconnect: reply.body.reconnect === true })
    }
    if (!sessionId) return { command, reply, state: prior }
    const next = stateAfterReply(command, prior, reply)
    this.states.set(sessionId, next)
    return { command, reply, state: next }
  }

  /**
   * Presents sha256(authorization) (lowercase hex; the adapter hashes) for a
   * session this bridge has claimed. Refused locally, without I/O, for a
   * session not claimed here or already terminal.
   */
  async attach(sessionId: string, authorizationSha256Hex: string): Promise<IngressReply | null> {
    const state = this.state(sessionId)
    if ((state !== "CLAIMED" && state !== "JOINED") || !SHA256_HEX.test(authorizationSha256Hex)) return null
    const post = this.transport.post.bind(this.transport) as (op: IngressOp, body: Record<string, unknown>) => Promise<IngressReply>
    return post(ATTACH_OP, { sessionId, authorizationSha256: authorizationSha256Hex })
  }

  /**
   * WORLDK-M14-B6: reads the RendererSessionSnapshot for a session this bridge
   * has claimed (or joined). Read-only; never changes local state. Refused
   * locally, without I/O, for any other session.
   */
  async readSnapshot(sessionId: string): Promise<IngressReply | null> {
    const state = this.state(sessionId)
    if (state !== "CLAIMED" && state !== "JOINED") return null
    const post = this.transport.post.bind(this.transport) as (op: IngressOp, body: Record<string, unknown>) => Promise<IngressReply>
    return post(SNAPSHOT_OP, { sessionId })
  }

  /** Handles an UNTRUSTED versioned message: parsed first, never throws on bad input. */
  async handleMessage(raw: unknown): Promise<{ parsed: ParsedBridgeMessage; result: BridgeResult | null }> {
    const parsed = parseBridgeMessage(raw)
    return { parsed, result: parsed.status === "ACCEPTED" ? await this.handle(parsed.event) : null }
  }
}
