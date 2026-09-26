// WORLDK-M14-B5: MEDIA_ESTABLISHED state machine (owner-frozen rules).
//
// One instance per attached RuntimeSession, created by the renderer at the
// moment B4 answered ATTACHED. Pure: no I/O, no clock (every input carries
// the renderer's monotonic time in ms), so the frozen timings are tested
// exactly. The renderer's bridge turns its outputs into B1 facts:
//
//   STREAM_JOINED  -> RuntimeBridge STREAM_JOINED -> ingress arrival (exactly once)
//   STREAM_LOST    -> RuntimeBridge STREAM_LOST   -> ingress disconnect (grace)
//   MEDIA_FAILED   -> no fact at all (pre-join failure: never an arrival; the
//                     session is not resurrected; retry = re-entry)
//
// MEDIA_ESTABLISHED requires ALL, within 30 s of ATTACHED:
//   1. ATTACHED (construction)                     2. ICE connected/completed
//   3. the media data channel open                  4+5. ONE browser first-frame ack
//   6+7. carrying exactly this attachment's nonce   (the browser sends it only after
//        framesDecoded > 0 and <video> "playing")
//   8. renderer-side corroboration: the renderer's own outbound video has
//      framesSent > 0 AND an RTCP receiver report from the browser arrived
//      (remote-inbound-rtp), so a browser ack alone never suffices.
// Not joined: WebSocket connected, playerConnected, ICE connected, data
// channel open, or any subset of the above.
//
// After join: ICE failed/closed -> STREAM_LOST now; ICE disconnected ->
// STREAM_LOST only if still disconnected 10 s later (a recovery inside 10 s
// is not a loss). Before join: ICE failed/closed or the 30 s window elapsing
// -> MEDIA_FAILED. A wrong nonce is a terminal MEDIA_FAILED (fail closed).
import { timingSafeEqual } from "node:crypto"

export const MEDIA_ESTABLISHMENT_WINDOW_MS = 30_000
export const ICE_DISCONNECT_DEBOUNCE_MS = 10_000

export type IceState = "new" | "checking" | "connected" | "completed" | "disconnected" | "failed" | "closed"

export type MediaInput =
  | { kind: "ICE_STATE"; state: IceState; at: number }
  | { kind: "DATA_CHANNEL"; open: boolean; at: number }
  | { kind: "ACK"; nonce: unknown; at: number }
  | { kind: "RENDERER_STATS"; framesSent: number; remoteInboundSeen: boolean; at: number }
  | { kind: "TICK"; at: number }

export type MediaOutput =
  | { kind: "STREAM_JOINED" }
  | { kind: "STREAM_LOST"; reason: "ICE_FAILED" | "ICE_CLOSED" | "ICE_DISCONNECTED_10S" }
  | { kind: "MEDIA_FAILED"; reason: "MEDIA_ESTABLISHMENT_TIMEOUT" | "ICE_FAILED_BEFORE_JOIN" | "ICE_CLOSED_BEFORE_JOIN" | "NONCE_INVALID" }

export type MediaPhase = "ESTABLISHING" | "JOINED" | "LOST" | "FAILED"

export class MediaEstablishment {
  private phaseValue: MediaPhase = "ESTABLISHING"
  private iceConnected = false
  private dataChannelOpen = false
  private ackAccepted = false
  private rendererFlowing = false
  private disconnectedSince: number | null = null
  private readonly nonceBuf: Buffer
  readonly attachedAt: number

  constructor(nonce: string, attachedAt: number) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(nonce)) throw new Error("nonce must be 32 random bytes, base64url")
    this.nonceBuf = Buffer.from(nonce, "utf8")
    this.attachedAt = attachedAt
  }

  get phase(): MediaPhase {
    return this.phaseValue
  }

  /** Diagnostic view (no secrets). */
  snapshot() {
    return { phase: this.phaseValue, iceConnected: this.iceConnected, dataChannelOpen: this.dataChannelOpen, ackAccepted: this.ackAccepted, rendererFlowing: this.rendererFlowing }
  }

  input(i: MediaInput): MediaOutput[] {
    if (this.phaseValue === "LOST" || this.phaseValue === "FAILED") return []
    const out: MediaOutput[] = []
    switch (i.kind) {
      case "ICE_STATE":
        if (i.state === "connected" || i.state === "completed") {
          this.iceConnected = true
          this.disconnectedSince = null
        } else if (i.state === "disconnected") {
          this.iceConnected = false
          if (this.disconnectedSince === null) this.disconnectedSince = i.at
        } else if (i.state === "failed" || i.state === "closed") {
          this.iceConnected = false
          if (this.phaseValue === "JOINED") return this.lose(i.state === "failed" ? "ICE_FAILED" : "ICE_CLOSED")
          return this.fail(i.state === "failed" ? "ICE_FAILED_BEFORE_JOIN" : "ICE_CLOSED_BEFORE_JOIN")
        } else {
          this.iceConnected = false
        }
        break
      case "DATA_CHANNEL":
        this.dataChannelOpen = i.open
        break
      case "ACK": {
        if (this.ackAccepted) break // a repeated correct ack is ignored (one-time)
        const ok = typeof i.nonce === "string" && i.nonce.length === this.nonceBuf.length && timingSafeEqual(Buffer.from(i.nonce, "utf8"), this.nonceBuf)
        if (!ok) return this.fail("NONCE_INVALID")
        if (this.phaseValue === "ESTABLISHING") this.ackAccepted = true
        break
      }
      case "RENDERER_STATS":
        if (i.framesSent > 0 && i.remoteInboundSeen) this.rendererFlowing = true
        break
      case "TICK":
        break
    }
    return out.concat(this.evaluate(i.at))
  }

  private evaluate(now: number): MediaOutput[] {
    if (this.phaseValue === "ESTABLISHING") {
      if (now - this.attachedAt > MEDIA_ESTABLISHMENT_WINDOW_MS) return this.fail("MEDIA_ESTABLISHMENT_TIMEOUT")
      if (this.iceConnected && this.dataChannelOpen && this.ackAccepted && this.rendererFlowing) {
        this.phaseValue = "JOINED"
        return [{ kind: "STREAM_JOINED" }]
      }
      return []
    }
    if (this.phaseValue === "JOINED" && this.disconnectedSince !== null && now - this.disconnectedSince >= ICE_DISCONNECT_DEBOUNCE_MS) {
      return this.lose("ICE_DISCONNECTED_10S")
    }
    return []
  }

  private lose(reason: "ICE_FAILED" | "ICE_CLOSED" | "ICE_DISCONNECTED_10S"): MediaOutput[] {
    this.phaseValue = "LOST"
    return [{ kind: "STREAM_LOST", reason }]
  }

  private fail(reason: "MEDIA_ESTABLISHMENT_TIMEOUT" | "ICE_FAILED_BEFORE_JOIN" | "ICE_CLOSED_BEFORE_JOIN" | "NONCE_INVALID"): MediaOutput[] {
    if (this.phaseValue === "JOINED") return [] // after join only ICE loss rules apply
    this.phaseValue = "FAILED"
    return [{ kind: "MEDIA_FAILED", reason }]
  }
}
