// WORLDK-M14-B5 test tooling: a GPU-free mock renderer (JSStreamer-derived
// approach: Epic's Extras/JSStreamer is "a mock of Unreal Engine Pixel
// Streaming for testing ... in CI without requiring UE"; no Epic file is
// copied here, the same streamer-side protocol is implemented minimally).
//
// Split exactly like a real render worker (RuntimeInstance = one render
// process + its RuntimeBridge):
//   * Node controller (this module): the B2 RuntimeBridge / ReferenceRuntime
//     holding the RUNTIME credential, B4 attach, nonce minting, the
//     MEDIA_ESTABLISHED state machine, and the B1 facts it produces.
//   * Chromium page (media engine): one streamer WebSocket per claimed
//     RuntimeSession (streamer id = that session's route key), real
//     RTCPeerConnection, a canvas test-pattern video track, the
//     "worldk-media-v1" data channel. It has no credential and decides nothing:
//     it offers ONLY after the controller answers ATTACHED (attach-before-offer).
//
// Adversarial modes for certification: `rogue` (skips attach and offers anyway),
// `video: false` (no media track, so no renderer-side corroboration).
import { randomBytes } from "node:crypto"
import http from "node:http"
import type { AddressInfo } from "node:net"
import type { Page } from "@playwright/test"
import { MediaEstablishment, type MediaInput, type MediaOutput } from "../mediaEstablishment.ts"
import type { ReferenceRuntime } from "../referenceRuntime.ts"
import { streamRouteKey } from "../signallingRoute.ts"
import { MEDIA_DATA_CHANNEL } from "../mediaPlayerPage.ts"

export type RendererLog =
  | { kind: "REGISTERED"; sessionId: string; committed: boolean }
  | { kind: "PLAYER_CONNECTED"; sessionId: string }
  | { kind: "ATTACH"; sessionId: string; outcome: string | null }
  | { kind: "OFFER_SENT"; sessionId: string; attached: boolean }
  | { kind: "PLAYER_REFUSED"; sessionId: string }
  | { kind: "MEDIA"; sessionId: string; input: MediaInput["kind"]; detail?: string }
  | { kind: "OUTPUT"; sessionId: string; output: MediaOutput }
  | { kind: "FACT"; sessionId: string; fact: "STREAM_JOINED" | "STREAM_LOST"; outcome: string | null }

export interface MockRendererOptions {
  rt: ReferenceRuntime
  page: Page
  streamerUrl: string
  streamerKey: string
  video?: boolean
  rogue?: boolean
  now?: () => number
}

interface SessionState {
  sessionId: string
  routeKey: string
  machine: MediaEstablishment | null
  nonce: string | null
}

const PAGE_ENGINE = String(function engine(cfg: { dc: string; video: boolean; rogue: boolean }) {
  const w = window as unknown as Record<string, any>
  const sessions: Record<string, any> = {}
  const call = (m: Record<string, unknown>) => w.wkRenderer(m)
  function canvasTrack() {
    const c = document.createElement("canvas")
    c.width = 320
    c.height = 180
    const g = c.getContext("2d")!
    let n = 0
    setInterval(() => {
      g.fillStyle = `hsl(${(n++ * 9) % 360},70%,45%)`
      g.fillRect(0, 0, 320, 180)
    }, 33)
    return c.captureStream(30)
  }
  w.wk = {
    open(sessionId: string, routeKey: string, url: string, key: string) {
      const s: any = { sessionId, routeKey, ws: new WebSocket(url, ["wk-streamer-v1", "wk-skey." + key]), pc: null, dc: null, playerId: null, peerOptions: {} }
      sessions[sessionId] = s
      const send = (m: unknown) => s.ws.readyState === 1 && s.ws.send(JSON.stringify(m))
      s.send = send
      s.ws.onclose = () => call({ op: "streamerClosed", sessionId })
      s.ws.onmessage = async (ev: MessageEvent) => {
        const m = JSON.parse(ev.data as string)
        if (m.type === "config") s.peerOptions = m.peerConnectionOptions || {}
        else if (m.type === "identify") send({ type: "endpointId", id: routeKey, protocolVersion: "1.0.0" })
        else if (m.type === "endpointIdConfirm") call({ op: "registered", sessionId, committed: m.committedId === routeKey })
        else if (m.type === "playerConnected") {
          s.playerId = m.playerId
          const digest = m.worldk && m.worldk.authorizationSha256
          const r = await call({ op: "attach", sessionId, digest })
          if (r.outcome !== "ATTACHED" && !cfg.rogue) {
            send({ type: "disconnectPlayer", playerId: m.playerId, reason: "not attached" })
            return
          }
          const pc = new RTCPeerConnection(s.peerOptions)
          s.pc = pc
          if (cfg.video) canvasTrack().getTracks().forEach((t) => pc.addTrack(t))
          const dc = pc.createDataChannel(cfg.dc)
          s.dc = dc
          dc.onopen = () => {
            call({ op: "media", sessionId, input: { kind: "DATA_CHANNEL", open: true } })
            if (r.nonce) dc.send(JSON.stringify({ t: "nonce", n: r.nonce }))
          }
          dc.onclose = () => call({ op: "media", sessionId, input: { kind: "DATA_CHANNEL", open: false } })
          dc.onmessage = (x) => {
            let d: any
            try { d = JSON.parse(x.data) } catch { return }
            if (d && d.t === "first-frame") call({ op: "media", sessionId, input: { kind: "ACK", nonce: d.n } })
          }
          pc.oniceconnectionstatechange = () => call({ op: "media", sessionId, input: { kind: "ICE_STATE", state: pc.iceConnectionState } })
          pc.onicecandidate = (e) => e.candidate && send({ type: "iceCandidate", playerId: s.playerId, candidate: e.candidate.toJSON() })
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          send({ type: "offer", playerId: s.playerId, sdp: pc.localDescription!.sdp })
          call({ op: "offerSent", sessionId, attached: r.outcome === "ATTACHED" })
        } else if (m.type === "answer" && s.pc) await s.pc.setRemoteDescription({ type: "answer", sdp: m.sdp })
        else if (m.type === "iceCandidate" && s.pc) await s.pc.addIceCandidate(m.candidate).catch(() => {})
        else if (m.type === "playerDisconnected" && s.pc) {
          s.pc.close()
          call({ op: "media", sessionId, input: { kind: "ICE_STATE", state: "closed" } })
        }
      }
    },
    async stats(sessionId: string) {
      const s = sessions[sessionId]
      if (!s || !s.pc) return null
      const st: RTCStatsReport = await s.pc.getStats()
      let framesSent = 0, remoteInboundSeen = false
      st.forEach((x: any) => {
        if (x.type === "outbound-rtp" && x.kind === "video") framesSent = x.framesSent || 0
        if (x.type === "remote-inbound-rtp" && x.kind === "video") remoteInboundSeen = true
      })
      return { framesSent, remoteInboundSeen }
    },
    async pair(sessionId: string) {
      const s = sessions[sessionId]
      if (!s || !s.pc) return null
      const st: RTCStatsReport = await s.pc.getStats()
      let res: any = null
      st.forEach((x: any) => {
        if (x.type === "candidate-pair" && x.nominated && x.state === "succeeded") res = { local: st.get(x.localCandidateId)?.candidateType, remote: st.get(x.remoteCandidateId)?.candidateType }
      })
      return res
    },
    closePeer(sessionId: string) {
      const s = sessions[sessionId]
      if (s && s.pc) s.pc.close()
      if (s && s.playerId) s.send({ type: "disconnectPlayer", playerId: s.playerId, reason: "media failed" })
    },
    closeStreamer(sessionId: string) {
      const s = sessions[sessionId]
      if (s) s.ws.close()
    },
  }
})

export class MockRenderer {
  readonly log: RendererLog[] = []
  private readonly sessions = new Map<string, SessionState>()
  private readonly opts: Required<Omit<MockRendererOptions, "rt" | "page">> & Pick<MockRendererOptions, "rt" | "page">
  private timer: ReturnType<typeof setInterval> | null = null
  private origin: http.Server | null = null

  constructor(opts: MockRendererOptions) {
    this.opts = { ...opts, video: opts.video ?? true, rogue: opts.rogue ?? false, now: opts.now ?? (() => performance.now()) }
  }

  async start(): Promise<void> {
    const { page } = this.opts
    await page.exposeBinding("wkRenderer", (_src, m: Record<string, any>) => this.onPage(m))
    // The media engine runs on a loopback origin, like a local render worker (Chromium's
    // Local Network Access checks refuse loopback WebSockets from an opaque about:blank page).
    this.origin = http.createServer((_q, res) => { res.writeHead(200, { "content-type": "text/html" }); res.end("<!doctype html><title>mock renderer</title>") })
    await new Promise<void>((r) => this.origin!.listen(0, "127.0.0.1", () => r()))
    await page.goto(`http://127.0.0.1:${(this.origin.address() as AddressInfo).port}/`)
    await page.evaluate(`(${PAGE_ENGINE})(${JSON.stringify({ dc: MEDIA_DATA_CHANNEL, video: this.opts.video, rogue: this.opts.rogue })})`)
    this.timer = setInterval(() => void this.pump(), 250)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.origin?.close()
  }

  machineOf(sessionId: string): MediaEstablishment | null {
    return this.sessions.get(sessionId)?.machine ?? null
  }

  /** Register a streamer for a session this renderer claimed (or, adversarially, any route key). */
  async register(sessionId: string, routeKeyOverride?: string): Promise<void> {
    const routeKey = routeKeyOverride ?? streamRouteKey(sessionId)
    this.sessions.set(sessionId, { sessionId, routeKey, machine: null, nonce: null })
    await this.opts.page.evaluate(([s, r, u, k]) => (window as unknown as { wk: { open: (...a: string[]) => void } }).wk.open(s, r, u, k), [sessionId, routeKey, this.opts.streamerUrl, this.opts.streamerKey])
  }

  async closeStreamer(sessionId: string): Promise<void> {
    await this.opts.page.evaluate((s) => (window as unknown as { wk: { closeStreamer: (s: string) => void } }).wk.closeStreamer(s), sessionId)
  }

  private async onPage(m: Record<string, any>): Promise<unknown> {
    const s = this.sessions.get(m.sessionId)
    if (!s) return { outcome: null }
    switch (m.op) {
      case "registered":
        this.log.push({ kind: "REGISTERED", sessionId: s.sessionId, committed: m.committed === true })
        return null
      case "attach": {
        this.log.push({ kind: "PLAYER_CONNECTED", sessionId: s.sessionId })
        const digest = typeof m.digest === "string" ? m.digest : ""
        const outcome = this.opts.rogue ? null : await this.opts.rt.attachStreamDigest(s.sessionId, digest)
        this.log.push({ kind: "ATTACH", sessionId: s.sessionId, outcome })
        if (outcome !== "ATTACHED") {
          if (!this.opts.rogue) this.log.push({ kind: "PLAYER_REFUSED", sessionId: s.sessionId })
          return { outcome }
        }
        s.nonce = randomBytes(32).toString("base64url")
        s.machine = new MediaEstablishment(s.nonce, this.opts.now())
        return { outcome, nonce: s.nonce }
      }
      case "offerSent":
        this.log.push({ kind: "OFFER_SENT", sessionId: s.sessionId, attached: m.attached === true })
        return null
      case "media":
        await this.feed(s, { ...(m.input as MediaInput), at: this.opts.now() } as MediaInput)
        return null
      default:
        return null
    }
  }

  private async feed(s: SessionState, input: MediaInput): Promise<void> {
    if (!s.machine) return
    if (input.kind !== "TICK" && input.kind !== "RENDERER_STATS") this.log.push({ kind: "MEDIA", sessionId: s.sessionId, input: input.kind, detail: input.kind === "ICE_STATE" ? input.state : input.kind === "DATA_CHANNEL" ? String(input.open) : undefined })
    for (const out of s.machine.input(input)) {
      this.log.push({ kind: "OUTPUT", sessionId: s.sessionId, output: out })
      if (out.kind === "STREAM_JOINED") this.log.push({ kind: "FACT", sessionId: s.sessionId, fact: "STREAM_JOINED", outcome: await this.opts.rt.join(s.sessionId) })
      else if (out.kind === "STREAM_LOST") this.log.push({ kind: "FACT", sessionId: s.sessionId, fact: "STREAM_LOST", outcome: await this.opts.rt.disconnect(s.sessionId) })
      else await this.opts.page.evaluate((id) => (window as unknown as { wk: { closePeer: (s: string) => void } }).wk.closePeer(id), s.sessionId).catch(() => {})
    }
  }

  private async pump(): Promise<void> {
    for (const s of this.sessions.values()) {
      if (!s.machine || s.machine.phase === "LOST" || s.machine.phase === "FAILED") continue
      const st = await this.opts.page.evaluate((id) => (window as unknown as { wk: { stats: (s: string) => Promise<{ framesSent: number; remoteInboundSeen: boolean } | null> } }).wk.stats(id), s.sessionId).catch(() => null)
      if (st) await this.feed(s, { kind: "RENDERER_STATS", framesSent: st.framesSent, remoteInboundSeen: st.remoteInboundSeen, at: this.opts.now() })
      await this.feed(s, { kind: "TICK", at: this.opts.now() })
    }
  }

  /** Candidate types of the renderer's selected pair for a session (relay proof). */
  async pairTypes(sessionId: string): Promise<{ local: string; remote: string } | null> {
    return this.opts.page.evaluate((id) => (window as unknown as { wk: { pair: (s: string) => Promise<{ local: string; remote: string } | null> } }).wk.pair(id), sessionId)
  }

  facts(sessionId: string, fact: "STREAM_JOINED" | "STREAM_LOST") {
    return this.log.filter((l): l is Extract<RendererLog, { kind: "FACT" }> => l.kind === "FACT" && l.sessionId === sessionId && l.fact === fact)
  }
}
