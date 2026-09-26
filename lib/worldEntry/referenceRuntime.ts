// WORLDK-M14-A: non-Unreal REFERENCE RUNTIME (D6), re-based on the
// @avatark/runtime-bridge SDK in WORLDK-M14-B2 (compatibility migration:
// identical wire behavior, proven against the frozen pre-B2 copy in
// testing/referenceRuntime.legacy.ts).
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
// Every ingress command comes from the SDK (commandFor / stateAfterReply).
// This adapter owns only what the SDK deliberately does not: the transport
// (HTTP + the per-instance credential), the step loop, heartbeat timing and
// the renderer's own decisions (auto-join, simulated hang/drop).
//
// It is NOT the M13 Preview Lifecycle Harness: it holds no database
// credential, cannot choose a subject, visit, time, tick or place, and can
// act only on sessions the Platform created from a redeemed ticket and
// bound to its own allocation. Its only credential is its Platform-issued
// per-instance runtime credential, sent only to the Runtime Ingress.
import { createHash } from "node:crypto"
import { RuntimeBridge, type BridgeResult, type IngressReply, type RendererEvent, type RuntimeBridgeTransport } from "@avatark/runtime-bridge"
import type { RuntimePollResult, RuntimeSessionWork } from "./authorityDb.ts"
import type { RuntimeOp } from "./runtimeIngress.ts"

export type { IngressReply }

/** The injected Runtime Ingress transport (the SDK's transport boundary). */
export type IngressTransport = RuntimeBridgeTransport

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
  | { kind: "REFUSED"; op: RuntimeOp | "attach"; status: number; error: string }

export interface ReferenceRuntimeOptions {
  readiness?: "STARTING" | "READY"
  /** Accept the visitor automatically once a session is claimed (default true). */
  autoJoin?: boolean
  now?: () => number
  onEvent?: (e: RuntimeEvent) => void
}

export class ReferenceRuntime {
  private readonly bridge: RuntimeBridge
  private readonly opts: Required<Omit<ReferenceRuntimeOptions, "onEvent">> & { onEvent: (e: RuntimeEvent) => void }
  private readonly lastHeartbeatAt = new Map<string, number>()
  private heartbeatSeconds = 15
  private heartbeatsSuspended = false

  constructor(transport: IngressTransport, opts: ReferenceRuntimeOptions = {}) {
    this.bridge = new RuntimeBridge({ transport })
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

  /** Whether a claimed session is accepted (ARRIVAL sent) automatically. */
  setAutoJoin(on: boolean) {
    this.opts.autoJoin = on
  }

  /** Simulates a runtime that stops producing presence evidence (e.g. hung or dying). */
  suspendHeartbeats() {
    this.heartbeatsSuspended = true
  }

  /** Runs one renderer fact through the SDK; reports a Platform refusal like the pre-SDK runtime did. */
  private async fact(event: RendererEvent): Promise<BridgeResult> {
    const r = await this.bridge.handle(event)
    if (r.reply && r.reply.status !== 200 && r.command.kind === "INGRESS") {
      this.opts.onEvent({ kind: "REFUSED", op: r.command.op, status: r.reply.status, error: String(r.reply.body.error ?? "") })
    }
    return r
  }

  private ok(r: BridgeResult): IngressReply | null {
    return r.reply && r.reply.status === 200 ? r.reply : null
  }

  async poll(): Promise<RuntimePollResult | null> {
    const r = this.ok(await this.fact({ kind: "RENDERER_AVAILABLE", readiness: this.opts.readiness }))
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

  private async advance(w: RuntimeSessionWork): Promise<void> {
    const state = this.bridge.state(w.sessionId)
    if (state === "DEPARTED" || state === "DROPPED" || state === "ENDED_BY_PLATFORM") return
    if (state === "UNCLAIMED") {
      const r = this.ok(await this.fact({ kind: "ALLOCATION_ACQUIRED", sessionId: w.sessionId }))
      if (!r) return
      this.opts.onEvent({ kind: "CLAIMED", sessionId: w.sessionId, reconnect: this.bridge.binding(w.sessionId)?.reconnect === true })
    }
    // The Platform's facts win over local memory (e.g. a restarted runtime process).
    this.bridge.observeWork([w])
    if (!w.joined) {
      if (this.opts.autoJoin) await this.join(w.sessionId)
      return
    }
    if (w.leaveRequested) {
      await this.leave(w.sessionId)
      return
    }
    if (!this.heartbeatsSuspended && this.opts.now() - (this.lastHeartbeatAt.get(w.sessionId) ?? 0) >= this.heartbeatSeconds * 1000) await this.heartbeat(w.sessionId)
  }

  private async receipt(event: RendererEvent, kind: "ARRIVAL" | "PRESENCE" | "DEPARTURE" | "DISCONNECT", sessionId: string): Promise<string | null> {
    const r = this.ok(await this.fact(event))
    if (!r) return null
    const outcome = String(r.body.outcome)
    if (kind === "ARRIVAL" || kind === "PRESENCE") this.lastHeartbeatAt.set(sessionId, this.opts.now())
    this.opts.onEvent({ kind, sessionId, outcome })
    return outcome
  }

  /**
   * WORLDK-M14-B4: the stub signalling relay handed this runtime a visitor's
   * stream authorization for one of its sessions. Verified by the Platform
   * (Runtime Ingress `attach`); never an arrival. Returns the outcome or null.
   */
  async attachStream(sessionId: string, authorization: string): Promise<string | null> {
    const reply = await this.bridge.attach(sessionId, createHash("sha256").update(authorization, "utf8").digest("hex"))
    if (!reply) return null
    if (reply.status !== 200) {
      this.opts.onEvent({ kind: "REFUSED", op: "attach", status: reply.status, error: String(reply.body.error) })
      return null
    }
    return String(reply.body.outcome)
  }

  /** The visitor joined this runtime session. */
  join(sessionId: string): Promise<string | null> {
    return this.receipt({ kind: "STREAM_JOINED", sessionId }, "ARRIVAL", sessionId)
  }

  heartbeat(sessionId: string): Promise<string | null> {
    return this.receipt({ kind: "PRESENCE_TICK", sessionId }, "PRESENCE", sessionId)
  }

  /** The visitor left (explicit leave-world). */
  leave(sessionId: string): Promise<string | null> {
    return this.receipt({ kind: "VISITOR_LEFT", sessionId }, "DEPARTURE", sessionId)
  }

  /** The stream dropped. Not a departure: the grace window runs. */
  disconnect(sessionId: string): Promise<string | null> {
    return this.receipt({ kind: "STREAM_LOST", sessionId }, "DISCONNECT", sessionId)
  }
}
