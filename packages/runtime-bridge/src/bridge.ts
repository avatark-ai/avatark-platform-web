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

  /** Handles an UNTRUSTED versioned message: parsed first, never throws on bad input. */
  async handleMessage(raw: unknown): Promise<{ parsed: ParsedBridgeMessage; result: BridgeResult | null }> {
    const parsed = parseBridgeMessage(raw)
    return { parsed, result: parsed.status === "ACCEPTED" ? await this.handle(parsed.event) : null }
  }
}
