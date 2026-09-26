// WORLDK-M14-A: non-Unreal REFERENCE RUNTIME (D6).
//
// Protocol certification only: it implements exactly the Runtime Ingress
// protocol the later Unreal bridge will implement, and nothing else — no
// simulation, rendering, streaming, narrative or GPU.
//
//   poll (liveness + work) -> claim a redeemed session (receive the visitor
//   binding) -> ARRIVAL receipt when the visitor "joins" -> PRESENCE
//   heartbeats -> DEPARTURE receipt when the visitor leaves; DISCONNECT when
//   the (simulated) stream drops.
//
// It is NOT the M13 Preview Lifecycle Harness: it holds no database
// credential, cannot choose a subject, visit, time, tick or place, and can
// act only on sessions the Platform created from a redeemed ticket and
// bound to its own allocation. Its only credential is its Platform-issued
// per-instance runtime credential, sent only to the Runtime Ingress.
//
// In this reference runtime a visitor "joins" when the runtime accepts the
// claimed session; there is no media channel. The Unreal bridge will send
// the same ARRIVAL receipt when the visitor's stream session is established.
import { randomUUID } from "node:crypto"
import type { RuntimeBinding, RuntimePollResult, RuntimeSessionWork } from "./authorityDb.ts"
import type { RuntimeOp } from "./runtimeIngress.ts"

export interface IngressReply {
  status: number
  body: Record<string, unknown>
}

export interface IngressTransport {
  post(op: RuntimeOp, body: Record<string, unknown>): Promise<IngressReply>
}

/** HTTPS transport to the Platform Runtime Ingress. The bearer is sent nowhere else. */
export function httpIngressTransport(baseUrl: string, bearer: string, fetchImpl: typeof fetch = fetch): IngressTransport {
  const base = new URL(baseUrl)
  if (base.protocol !== "https:" && base.hostname !== "localhost" && base.hostname !== "127.0.0.1") throw new Error("runtime ingress must be https")
  return {
    async post(op, body) {
      const res = await fetchImpl(new URL(`/api/runtime/v1/${op}`, base), {
        method: "POST",
        headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
        body: JSON.stringify(body),
        redirect: "error",
      })
      let parsed: Record<string, unknown> = {}
      try {
        parsed = (await res.json()) as Record<string, unknown>
      } catch {}
      return { status: res.status, body: parsed }
    },
  }
}

export type RuntimeEvent =
  | { kind: "CLAIMED"; sessionId: string; reconnect: boolean }
  | { kind: "ARRIVAL"; sessionId: string; outcome: string }
  | { kind: "PRESENCE"; sessionId: string; outcome: string }
  | { kind: "DEPARTURE"; sessionId: string; outcome: string }
  | { kind: "DISCONNECT"; sessionId: string; outcome: string }
  | { kind: "REFUSED"; op: RuntimeOp; status: number; error: string }

interface Tracked {
  binding: RuntimeBinding | null
  lastHeartbeatAt: number
  departed: boolean
  dropped: boolean
}

export interface ReferenceRuntimeOptions {
  readiness?: "STARTING" | "READY"
  /** Accept the visitor automatically once a session is claimed (default true). */
  autoJoin?: boolean
  now?: () => number
  onEvent?: (e: RuntimeEvent) => void
}

export class ReferenceRuntime {
  private readonly transport: IngressTransport
  private readonly opts: Required<Omit<ReferenceRuntimeOptions, "onEvent">> & { onEvent: (e: RuntimeEvent) => void }
  private readonly sessions = new Map<string, Tracked>()
  private heartbeatSeconds = 15
  private heartbeatsSuspended = false

  constructor(transport: IngressTransport, opts: ReferenceRuntimeOptions = {}) {
    this.transport = transport
    this.opts = {
      readiness: opts.readiness ?? "READY",
      autoJoin: opts.autoJoin ?? true,
      now: opts.now ?? Date.now,
      onEvent: opts.onEvent ?? (() => {}),
    }
  }

  setReadiness(r: "STARTING" | "READY") {
    this.opts.readiness = r
  }

  /** Simulates a runtime that stops producing presence evidence (e.g. hung or dying). */
  suspendHeartbeats() {
    this.heartbeatsSuspended = true
  }

  private async send(op: RuntimeOp, body: Record<string, unknown>): Promise<IngressReply | null> {
    const r = await this.transport.post(op, body)
    if (r.status !== 200) {
      this.opts.onEvent({ kind: "REFUSED", op, status: r.status, error: String(r.body.error ?? "") })
      return null
    }
    return r
  }

  async poll(): Promise<RuntimePollResult | null> {
    const r = await this.send("poll", { readiness: this.opts.readiness })
    if (!r) return null
    const res = r.body as unknown as RuntimePollResult
    this.heartbeatSeconds = res.heartbeatSeconds
    return res
  }

  /** One protocol step: liveness, then every session's next action. */
  async step(): Promise<void> {
    const polled = await this.poll()
    if (!polled) return
    for (const w of polled.sessions) await this.advance(w)
  }

  private track(sessionId: string): Tracked {
    let t = this.sessions.get(sessionId)
    if (!t) {
      t = { binding: null, lastHeartbeatAt: 0, departed: false, dropped: false }
      this.sessions.set(sessionId, t)
    }
    return t
  }

  private async advance(w: RuntimeSessionWork): Promise<void> {
    const t = this.track(w.sessionId)
    if (t.departed || t.dropped) return
    if (!t.binding) {
      const r = await this.send("claim", { sessionId: w.sessionId })
      if (!r) return
      t.binding = r.body as unknown as RuntimeBinding
      this.opts.onEvent({ kind: "CLAIMED", sessionId: w.sessionId, reconnect: t.binding.reconnect })
    }
    if (!w.joined) {
      if (this.opts.autoJoin) await this.join(w.sessionId)
      return
    }
    if (w.leaveRequested) {
      await this.leave(w.sessionId)
      return
    }
    if (!this.heartbeatsSuspended && this.opts.now() - t.lastHeartbeatAt >= this.heartbeatSeconds * 1000) await this.heartbeat(w.sessionId)
  }

  private async receipt(op: "arrival" | "presence" | "departure" | "disconnect", sessionId: string): Promise<string | null> {
    const t = this.track(sessionId)
    if (!t.binding) return null
    const r = await this.send(op, { receiptId: randomUUID(), sessionId, worldId: t.binding.worldId })
    return r ? String(r.body.outcome) : null
  }

  /** The visitor joined this runtime session. */
  async join(sessionId: string): Promise<string | null> {
    const outcome = await this.receipt("arrival", sessionId)
    if (outcome) {
      this.track(sessionId).lastHeartbeatAt = this.opts.now()
      this.opts.onEvent({ kind: "ARRIVAL", sessionId, outcome })
    }
    return outcome
  }

  async heartbeat(sessionId: string): Promise<string | null> {
    const outcome = await this.receipt("presence", sessionId)
    if (outcome) {
      this.track(sessionId).lastHeartbeatAt = this.opts.now()
      this.opts.onEvent({ kind: "PRESENCE", sessionId, outcome })
    }
    return outcome
  }

  /** The visitor left (explicit leave-world). */
  async leave(sessionId: string): Promise<string | null> {
    const outcome = await this.receipt("departure", sessionId)
    if (outcome) {
      this.track(sessionId).departed = true
      this.opts.onEvent({ kind: "DEPARTURE", sessionId, outcome })
    }
    return outcome
  }

  /** The stream dropped. Not a departure: the grace window runs. */
  async disconnect(sessionId: string): Promise<string | null> {
    const outcome = await this.receipt("disconnect", sessionId)
    if (outcome) {
      this.track(sessionId).dropped = true
      this.opts.onEvent({ kind: "DISCONNECT", sessionId, outcome })
    }
    return outcome
  }
}
