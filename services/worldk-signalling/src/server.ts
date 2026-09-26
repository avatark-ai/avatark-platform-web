// WORLDK-M14-B5: Platform-controlled signalling service (logical topology T1).
//
// Built on the pinned Epic UE5.8 Pixel Streaming signalling library: Epic's
// StreamerConnection, StreamerRegistry, PlayerRegistry and the Common
// protocol/transport are used unchanged. Epic's stock PlayerConnection is NOT
// used, because it lets a browser enumerate streamers (listStreamers),
// subscribe to any streamer id, and silently auto-subscribes an unsubscribed
// player to the first streamer. It is replaced by AuthorizedPlayer:
//
//   player WS upgrade  -- subprotocols ["wk-player-v1", "wk-authz.<authorization>"]
//     -> Platform route authority (sha256(authorization) only): must be routable,
//        NOT yet attached, the routed streamer registered, and this
//        authorization never admitted before on this server
//     -> config (peer options minted NOW: relay-only TURN credentials per connection)
//     -> server-side subscription to exactly the routed streamer
//     -> playerConnected to that streamer, carrying sha256(authorization) so the
//        renderer can perform B4 attach (it never sees the plaintext)
//   renderer offer     -> re-checked with the Platform: attached = true for this
//        authorization and the same route, otherwise dropped and the player
//        disconnected (NO OFFER BEFORE ATTACHED, enforced here as well as in the
//        renderer); in relay mode every non-relay candidate is stripped
//
// The browser can never list, choose or learn a streamer/renderer. Signalling
// holds no database credential and writes no lifecycle: its events are never
// visitor-presence facts (only the renderer's bridge reports those).
// Nothing secret is logged (Epic logging is silenced).
import type http from "node:http"
import { createHash, timingSafeEqual } from "node:crypto"
import { WebSocketServer, type WebSocket } from "ws"
import { Logger as EpicLogger, PlayerRegistry, StreamerConnection, StreamerRegistry } from "@epicgames-ps/lib-pixelstreamingsignalling-ue5.8"
import { MessageHelpers, Messages, overrideLogger, SignallingProtocol, WebSocketTransportNJS } from "@epicgames-ps/lib-pixelstreamingcommon-ue5.8"
import { isRelayCandidate, relayOnlySdp } from "./iceFilter.ts"
import type { RouteAuthority } from "./routeAuthority.ts"
import { peerOptionsFor, type IceMode, type TurnConfig } from "./turn.ts"

export const PLAYER_SUBPROTOCOL = "wk-player-v1"
export const AUTHZ_PREFIX = "wk-authz."
export const STREAMER_SUBPROTOCOL = "wk-streamer-v1"
export const STREAMER_KEY_PREFIX = "wk-skey."
const TOKEN = /^[A-Za-z0-9_-]{43}$/
const ROUTE_KEY = /^wkr1-[0-9a-f]{40}$/

export type SignallingEvent =
  | { kind: "PLAYER_REFUSED"; reason: "NO_AUTHORIZATION" | "AUTHORIZATION_REUSED" | "NOT_ROUTABLE" | "ALREADY_ATTACHED" | "RENDERER_NOT_REGISTERED" }
  | { kind: "PLAYER_ADMITTED"; playerId: string }
  | { kind: "PLAYER_MESSAGE_IGNORED"; type: string }
  | { kind: "OFFER_BLOCKED"; playerId: string; reason: "NOT_ATTACHED" | "ROUTE_MISMATCH" | "DUPLICATE_OFFER" }
  | { kind: "OFFER_FORWARDED"; playerId: string }
  | { kind: "CANDIDATE_DROPPED"; playerId: string }
  | { kind: "STREAMER_REFUSED"; reason: "BAD_KEY" | "BAD_ID_OR_SQUAT" }
  | { kind: "PLAYER_CLOSED"; playerId: string }

export interface SignallingConfig {
  /** bind address for both listeners (streamer port must never be public) */
  host?: string
  playerPort: number
  streamerPort: number
  streamerKey: string
  route: RouteAuthority
  iceMode: IceMode
  turn: TurnConfig | null
  onEvent?: (e: SignallingEvent) => void
}

let epicSilenced = false
function silenceEpicLogging(): void {
  if (epicSilenced) return
  epicSilenced = true
  ;(EpicLogger as unknown as { silent: boolean }).silent = true
  const noop = () => {}
  overrideLogger({ InitLogging: noop, Debug: noop, Info: noop, Warning: noop, Error: noop })
}

const sha256hex = (v: string) => createHash("sha256").update(v, "utf8").digest("hex")

function subprotocols(req: http.IncomingMessage): string[] {
  const raw = req.headers["sec-websocket-protocol"]
  return typeof raw === "string" ? raw.split(",").map((s) => s.trim()).filter(Boolean) : []
}

interface Admission {
  authHash: string
  routeKey: string
}

type AnyMessage = { type: string; playerId?: string; sdp?: string; candidate?: unknown; [k: string]: unknown }

/** Epic SignallingProtocol whose outbound path (renderer -> this player) is gated. */
class GatedProtocol extends SignallingProtocol {
  gate: ((m: AnyMessage) => void) | null = null
  override sendMessage(message: never): void {
    if (this.gate) this.gate(message as unknown as AnyMessage)
    else super.sendMessage(message)
  }
  rawSend(message: unknown): void {
    super.sendMessage(message as never)
  }
}

class AuthorizedPlayer {
  playerId = ""
  transport: WebSocketTransportNJS
  protocol: GatedProtocol
  subscribedStreamer: InstanceType<typeof StreamerConnection> | null = null
  private offerForwarded = false
  private pendingCandidates: AnyMessage[] = []
  private closed = false

  private readonly server: WorldKSignallingServer
  private readonly ws: WebSocket
  readonly admission: Admission

  constructor(server: WorldKSignallingServer, ws: WebSocket, admission: Admission) {
    this.server = server
    this.ws = ws
    this.admission = admission
    this.transport = new WebSocketTransportNJS(ws as never)
    this.protocol = new GatedProtocol(this.transport as never)
    this.protocol.gate = (m) => void this.fromRenderer(m)
    this.protocol.on(Messages.answer.typeName, (m: AnyMessage) => this.toRenderer(m))
    this.protocol.on(Messages.iceCandidate.typeName, (m: AnyMessage) => this.toRenderer(m))
    this.protocol.on(Messages.ping.typeName, (m: AnyMessage) => this.protocol.rawSend(MessageHelpers.createMessage(Messages.pong, { time: m.time as number })))
    for (const t of [Messages.listStreamers, Messages.subscribe, Messages.unsubscribe, Messages.offer, Messages.dataChannelRequest, Messages.peerDataChannelsReady, Messages.layerPreference]) {
      this.protocol.on(t.typeName, () => server.emit({ kind: "PLAYER_MESSAGE_IGNORED", type: t.typeName }))
    }
    this.protocol.on("unhandled", (m: AnyMessage) => server.emit({ kind: "PLAYER_MESSAGE_IGNORED", type: String(m?.type) }))
    this.transport.on("close", () => this.onClose())
  }

  getReadableIdentifier(): string {
    return this.playerId
  }
  sendMessage(message: unknown): void {
    this.protocol.rawSend(message)
  }
  getPlayerInfo() {
    return { playerId: this.playerId, type: "Player", subscribedTo: undefined, remoteAddress: undefined }
  }

  /** Server-side subscription to the routed streamer only, then announce to the renderer. */
  start(streamer: InstanceType<typeof StreamerConnection>): void {
    this.subscribedStreamer = streamer
    streamer.subscribers.add(this.playerId)
    streamer.on("disconnect", () => this.disconnect(1001, "renderer gone"))
    const m = MessageHelpers.createMessage(Messages.playerConnected, { playerId: this.playerId, dataChannel: true, sfu: false }) as unknown as AnyMessage
    m.worldk = { authorizationSha256: this.admission.authHash }
    streamer.protocol.sendMessage(m as never)
  }

  private toRenderer(m: AnyMessage): void {
    if (!this.subscribedStreamer || this.closed) return
    m.playerId = this.playerId
    this.subscribedStreamer.protocol.sendMessage(m as never)
  }

  private async fromRenderer(m: AnyMessage): Promise<void> {
    if (this.closed) return
    if (m.type === Messages.offer.typeName) {
      if (this.offerForwarded) {
        this.server.emit({ kind: "OFFER_BLOCKED", playerId: this.playerId, reason: "DUPLICATE_OFFER" })
        return
      }
      const d = await this.server.config.route.resolve(this.admission.authHash)
      if (!d || !d.attached || d.routeKey !== this.admission.routeKey) {
        this.server.emit({ kind: "OFFER_BLOCKED", playerId: this.playerId, reason: !d || !d.attached ? "NOT_ATTACHED" : "ROUTE_MISMATCH" })
        this.disconnect(1008, "not authorized")
        return
      }
      this.offerForwarded = true
      const out = { ...m, playerId: this.playerId }
      if (this.server.config.iceMode === "relay" && typeof out.sdp === "string") out.sdp = relayOnlySdp(out.sdp)
      this.protocol.rawSend(out)
      this.server.emit({ kind: "OFFER_FORWARDED", playerId: this.playerId })
      for (const c of this.pendingCandidates.splice(0)) this.protocol.rawSend(c)
      return
    }
    if (m.type === Messages.iceCandidate.typeName) {
      if (this.server.config.iceMode === "relay" && !isRelayCandidate(m.candidate)) {
        this.server.emit({ kind: "CANDIDATE_DROPPED", playerId: this.playerId })
        return
      }
      if (this.offerForwarded) this.protocol.rawSend(m)
      else this.pendingCandidates.push(m)
      return
    }
    // Nothing else from a renderer is forwarded to a browser.
  }

  disconnect(code: number, reason: string): void {
    if (this.closed) return
    try {
      this.ws.close(code, reason)
    } catch {}
  }

  private onClose(): void {
    if (this.closed) return
    this.closed = true
    const s = this.subscribedStreamer
    if (s) {
      s.subscribers.delete(this.playerId)
      s.protocol.sendMessage(MessageHelpers.createMessage(Messages.playerDisconnected, { playerId: this.playerId }) as never)
    }
    this.server.playerRegistry.remove(this as never)
    this.server.emit({ kind: "PLAYER_CLOSED", playerId: this.playerId })
  }
}

export class WorldKSignallingServer {
  readonly config: SignallingConfig
  readonly streamerRegistry: StreamerRegistry
  readonly playerRegistry: PlayerRegistry
  private readonly admissions = new WeakMap<http.IncomingMessage, Admission>()
  private readonly usedAuthorizations = new Set<string>()
  private playerWss!: WebSocketServer
  private streamerWss!: WebSocketServer

  constructor(config: SignallingConfig) {
    silenceEpicLogging()
    if (!TOKEN.test(config.streamerKey)) throw new Error("streamer key must be 43-char base64url")
    this.config = config
    this.playerRegistry = new PlayerRegistry()
    // Anti-squatting: a renderer may register only a well-formed route key that is not already taken.
    this.streamerRegistry = new StreamerRegistry(({ requestedId, collided }) => {
      if (!ROUTE_KEY.test(requestedId) || collided || this.streamerRegistry.find(requestedId)) {
        this.emit({ kind: "STREAMER_REFUSED", reason: "BAD_ID_OR_SQUAT" })
        return null
      }
      return requestedId
    })
  }

  emit(e: SignallingEvent): void {
    this.config.onEvent?.(e)
  }

  async listen(): Promise<{ playerPort: number; streamerPort: number }> {
    const host = this.config.host ?? "127.0.0.1"
    this.streamerWss = new WebSocketServer({
      host,
      port: this.config.streamerPort,
      maxPayload: 256 * 1024,
      handleProtocols: (p) => (p.has(STREAMER_SUBPROTOCOL) ? STREAMER_SUBPROTOCOL : false),
      verifyClient: (info, cb) => {
        const key = subprotocols(info.req).find((p) => p.startsWith(STREAMER_KEY_PREFIX))?.slice(STREAMER_KEY_PREFIX.length) ?? ""
        const ok = TOKEN.test(key) && timingSafeEqual(Buffer.from(sha256hex(key)), Buffer.from(sha256hex(this.config.streamerKey)))
        if (!ok) this.emit({ kind: "STREAMER_REFUSED", reason: "BAD_KEY" })
        cb(ok, ok ? undefined : 401)
      },
    })
    this.streamerWss.on("connection", (ws, req) => this.onStreamer(ws, req))
    this.playerWss = new WebSocketServer({
      host,
      port: this.config.playerPort,
      maxPayload: 64 * 1024,
      handleProtocols: (p) => (p.has(PLAYER_SUBPROTOCOL) ? PLAYER_SUBPROTOCOL : false),
      verifyClient: (info, cb) => {
        void this.admit(info.req).then((a) => {
          if (a) this.admissions.set(info.req, a)
          cb(!!a, a ? undefined : 403)
        })
      },
    })
    this.playerWss.on("connection", (ws, req) => this.onPlayer(ws, req))
    await Promise.all([once(this.streamerWss), once(this.playerWss)])
    return { playerPort: (this.playerWss.address() as { port: number }).port, streamerPort: (this.streamerWss.address() as { port: number }).port }
  }

  async close(): Promise<void> {
    for (const w of [this.playerWss, this.streamerWss]) {
      if (!w) continue
      for (const c of w.clients) c.terminate()
      await new Promise((r) => w.close(() => r(null)))
    }
  }

  private async admit(req: http.IncomingMessage): Promise<Admission | null> {
    const ps = subprotocols(req)
    const token = ps.find((p) => p.startsWith(AUTHZ_PREFIX))?.slice(AUTHZ_PREFIX.length) ?? ""
    if (!ps.includes(PLAYER_SUBPROTOCOL) || !TOKEN.test(token)) {
      this.emit({ kind: "PLAYER_REFUSED", reason: "NO_AUTHORIZATION" })
      return null
    }
    const authHash = sha256hex(token)
    if (this.usedAuthorizations.has(authHash)) {
      this.emit({ kind: "PLAYER_REFUSED", reason: "AUTHORIZATION_REUSED" })
      return null
    }
    this.usedAuthorizations.add(authHash) // one admission per authorization, ever
    const d = await this.config.route.resolve(authHash)
    if (!d) {
      this.emit({ kind: "PLAYER_REFUSED", reason: "NOT_ROUTABLE" })
      return null
    }
    if (d.attached) {
      this.emit({ kind: "PLAYER_REFUSED", reason: "ALREADY_ATTACHED" })
      return null
    }
    const s = this.streamerRegistry.find(d.routeKey)
    if (!s || !s.streaming) {
      this.emit({ kind: "PLAYER_REFUSED", reason: "RENDERER_NOT_REGISTERED" })
      return null
    }
    return { authHash, routeKey: d.routeKey }
  }

  private onStreamer(ws: WebSocket, req: http.IncomingMessage): void {
    const streamer = new StreamerConnection(this as never, ws as never, undefined, req)
    this.streamerRegistry.add(streamer)
    streamer.transport.on("close", () => this.streamerRegistry.remove(streamer))
    const cfg = MessageHelpers.createMessage(Messages.config, { protocolVersion: SignallingProtocol.SIGNALLING_VERSION }) as unknown as AnyMessage
    cfg.peerConnectionOptions = peerOptionsFor(this.config.iceMode, this.config.turn)
    streamer.sendMessage(cfg as never)
  }

  private onPlayer(ws: WebSocket, req: http.IncomingMessage): void {
    const a = this.admissions.get(req)
    const streamer = a ? this.streamerRegistry.find(a.routeKey) : undefined
    if (!a || !streamer) {
      ws.close(1008, "not authorized")
      return
    }
    const player = new AuthorizedPlayer(this, ws, a)
    this.playerRegistry.add(player as never)
    // Peer options (and, in relay mode, fresh TURN credentials) only now, after admission.
    const cfg = MessageHelpers.createMessage(Messages.config, { protocolVersion: SignallingProtocol.SIGNALLING_VERSION }) as unknown as AnyMessage
    cfg.peerConnectionOptions = peerOptionsFor(this.config.iceMode, this.config.turn)
    player.sendMessage(cfg)
    this.emit({ kind: "PLAYER_ADMITTED", playerId: player.playerId })
    player.start(streamer as InstanceType<typeof StreamerConnection>)
  }
}

function once(w: WebSocketServer): Promise<void> {
  return new Promise((r) => w.once("listening", () => r()))
}
