// WORLDK-M14-B5 signalling unit suite (no browser, no Platform): raw WebSocket
// streamer/player clients against the real server, with a fake route authority.
import { test } from "node:test"
import assert from "node:assert/strict"
import { createHash, createHmac, randomBytes } from "node:crypto"
import { isRelayCandidate, relayOnlySdp } from "./iceFilter.ts"
import { httpRouteAuthority, type RouteDecision } from "./routeAuthority.ts"
import { WorldKSignallingServer, type SignallingEvent } from "./server.ts"
import { mintTurnCredential, peerOptionsFor } from "./turn.ts"

const tok = () => randomBytes(32).toString("base64url")
const hex = (s: string) => createHash("sha256").update(s, "utf8").digest("hex")
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const ROUTE = "wkr1-" + "a".repeat(40)

interface Client { ws: WebSocket; frames: Record<string, any>[]; open: Promise<boolean> }
function client(url: string, protocols?: string[]): Client {
  const ws = protocols ? new WebSocket(url, protocols) : new WebSocket(url)
  const frames: Record<string, any>[] = []
  ws.onmessage = (e) => frames.push(JSON.parse(String(e.data)))
  const open = new Promise<boolean>((r) => { ws.onopen = () => r(true); ws.onerror = () => r(false); ws.onclose = () => r(false) })
  return { ws, frames, open }
}
const send = (c: Client, m: unknown) => c.ws.send(JSON.stringify(m))

async function setup(opts: { decide?: (h: string) => RouteDecision | null; iceMode?: "direct" | "relay" } = {}) {
  const events: SignallingEvent[] = []
  const decisions: string[] = []
  const state = { attached: false }
  const turnSecret = randomBytes(24).toString("hex")
  const streamerKey = tok()
  const server = new WorldKSignallingServer({
    host: "127.0.0.1", playerPort: 0, streamerPort: 0, streamerKey,
    route: { resolve: async (h) => { decisions.push(h); return opts.decide ? opts.decide(h) : { routeKey: ROUTE, attached: state.attached } } },
    iceMode: opts.iceMode ?? "direct",
    turn: { urls: ["turn:192.0.2.10:3478?transport=udp"], secret: turnSecret, ttlSeconds: 120 },
    onEvent: (e) => events.push(e),
  })
  const ports = await server.listen()
  const streamerUrl = `ws://127.0.0.1:${ports.streamerPort}`
  const playerUrl = `ws://127.0.0.1:${ports.playerPort}`
  /** A streamer registering `id`; returns the client once confirmed (or refused). */
  const streamer = async (id = ROUTE, key = streamerKey) => {
    const s = client(streamerUrl, ["wk-streamer-v1", "wk-skey." + key])
    const ok = await s.open
    if (ok) {
      for (let i = 0; i < 20 && !s.frames.some((f) => f.type === "identify"); i++) await sleep(25)
      send(s, { type: "endpointId", id, protocolVersion: "1.0.0" })
      await sleep(150)
    }
    return { s, ok, confirmed: s.frames.some((f) => f.type === "endpointIdConfirm" && f.committedId === id) }
  }
  const player = async (authz: string | null, extra: string[] = []) => {
    const c = client(playerUrl, authz === null ? undefined : ["wk-player-v1", ...(authz ? ["wk-authz." + authz] : []), ...extra])
    const ok = await c.open
    await sleep(150)
    return { c, ok }
  }
  return { server, events, decisions, state, streamer, player, turnSecret, close: () => server.close() }
}

test("TURN: use-auth-secret credential with explicit TTL, fresh per call; relay mode is relay-only", () => {
  const secret = randomBytes(24).toString("hex")
  const now = 1_800_000_000_000
  const a = mintTurnCredential(secret, 300, now)
  const b = mintTurnCredential(secret, 300, now)
  assert.equal(a.expiresAt, 1_800_000_300)
  assert.match(a.username, /^1800000300:[0-9a-f]{16}$/)
  assert.equal(a.credential, createHmac("sha1", secret).update(a.username).digest("base64"))
  assert.notEqual(a.username, b.username)
  assert.throws(() => mintTurnCredential("short", 300))
  assert.throws(() => mintTurnCredential(secret, 5))
  assert.deepEqual(peerOptionsFor("direct", null), { iceServers: [] })
  const r = peerOptionsFor("relay", { urls: ["turn:x:3478"], secret, ttlSeconds: 60 })
  assert.equal(r.iceTransportPolicy, "relay")
  assert.equal(r.iceServers[0].urls[0], "turn:x:3478")
  assert.throws(() => peerOptionsFor("relay", null))
})

test("ICE filter: only relay candidates survive in relay mode", () => {
  assert.equal(isRelayCandidate({ candidate: "candidate:1 1 udp 1 10.0.0.1 5000 typ relay raddr 1.2.3.4 rport 1" }), true)
  assert.equal(isRelayCandidate({ candidate: "candidate:1 1 udp 1 10.0.0.1 5000 typ host generation 0" }), false)
  assert.equal(isRelayCandidate({ candidate: "candidate:1 1 udp 1 1.2.3.4 5000 typ srflx raddr 10.0.0.1 rport 1" }), false)
  assert.equal(isRelayCandidate(null), false)
  const sdp = ["v=0", "a=candidate:1 1 udp 1 10.0.0.1 5000 typ host", "a=candidate:2 1 udp 1 5.6.7.8 5001 typ relay raddr 1.2.3.4 rport 9", "a=candidate:3 1 udp 1 1.2.3.4 5002 typ srflx raddr 10.0.0.1 rport 5000", "a=end"].join("\r\n")
  assert.deepEqual(relayOnlySdp(sdp).split("\r\n"), ["v=0", "a=candidate:2 1 udp 1 5.6.7.8 5001 typ relay raddr 1.2.3.4 rport 9", "a=end"])
})

test("route client: only a well-formed 200 is a decision; everything else is not routable", async () => {
  const mk = (status: number, body: unknown) => httpRouteAuthority("http://localhost:1", tok(), (async () => new Response(JSON.stringify(body), { status })) as typeof fetch)
  const h = hex("x")
  assert.deepEqual(await mk(200, { routeKey: ROUTE, attached: false }).resolve(h), { routeKey: ROUTE, attached: false })
  for (const [s, b] of [[404, { error: "NOT_ROUTABLE" }], [200, { routeKey: "host:1234", attached: false }], [200, { routeKey: ROUTE }], [500, {}], [401, {}]] as const) assert.equal(await mk(s, b).resolve(h), null)
  assert.equal(await mk(200, { routeKey: ROUTE, attached: false }).resolve("not-hex"), null)
  assert.throws(() => httpRouteAuthority("http://platform.example", tok()), /https/)
})

test("streamers: key required; only well-formed, unclaimed route keys register (anti-squat, first wins)", async () => {
  const t = await setup()
  try {
    assert.equal((await t.streamer(ROUTE, tok())).ok, false, "wrong streamer key")
    assert.equal((await t.streamer("my-renderer")).confirmed, false, "not a route key")
    const first = await t.streamer()
    assert.equal(first.confirmed, true)
    const squat = await t.streamer()
    assert.equal(squat.confirmed, false, "second registration of the same key refused")
    assert.equal(t.server.streamerRegistry.count(), 1)
    assert.ok(t.events.some((e) => e.kind === "STREAMER_REFUSED" && e.reason === "BAD_KEY"))
    assert.ok(t.events.some((e) => e.kind === "STREAMER_REFUSED" && e.reason === "BAD_ID_OR_SQUAT"))
  } finally {
    await t.close()
  }
})

test("admission: authorization required, routed, unattached, renderer registered, single use; config (TURN) only after admission", async () => {
  const t = await setup({ iceMode: "relay" })
  try {
    const { s } = await t.streamer()
    assert.equal((await t.player(null)).ok, false, "no subprotocols")
    assert.equal((await t.player("")).ok, false, "no authorization")
    assert.equal((await t.player("short")).ok, false, "malformed")
    assert.equal(t.decisions.length, 0, "malformed never reaches the Platform")
    const a = tok()
    const p1 = await t.player(a)
    assert.equal(p1.ok, true)
    assert.equal(t.decisions[0], hex(a), "the Platform sees only the digest")
    const cfg = p1.c.frames.find((f) => f.type === "config")!
    assert.equal(cfg.peerConnectionOptions.iceTransportPolicy, "relay")
    const ice = cfg.peerConnectionOptions.iceServers[0]
    assert.equal(ice.credential, createHmac("sha1", t.turnSecret).update(ice.username).digest("base64"))
    assert.ok(!p1.c.frames.some((f) => f.type === "streamerList" || f.type === "playerCount" || f.type === "identify"))
    // the renderer got playerConnected with the digest only
    const pc = s.frames.find((f) => f.type === "playerConnected")!
    assert.deepEqual(pc.worldk, { authorizationSha256: hex(a) })
    assert.ok(!JSON.stringify(s.frames).includes(a), "plaintext authorization never reaches the renderer")
    // single use
    assert.equal((await t.player(a)).ok, false)
    assert.ok(t.events.some((e) => e.kind === "PLAYER_REFUSED" && e.reason === "AUTHORIZATION_REUSED"))
    // already attached / not routable / renderer missing
    t.state.attached = true
    assert.equal((await t.player(tok())).ok, false)
    t.state.attached = false
    const refusedBefore = t.events.filter((e) => e.kind === "PLAYER_REFUSED").length
    const t2 = await setup({ decide: () => null })
    try {
      const r = await t2.player(tok())
      assert.equal(r.ok, false)
      assert.ok(!r.c.frames.some((f) => f.type === "config"), "no TURN credential for a refused player")
      assert.ok(t2.events.some((e) => e.kind === "PLAYER_REFUSED" && e.reason === "NOT_ROUTABLE"))
    } finally {
      await t2.close()
    }
    const t3 = await setup()
    try {
      assert.equal((await t3.player(tok())).ok, false, "routed streamer not registered")
      assert.ok(t3.events.some((e) => e.kind === "PLAYER_REFUSED" && e.reason === "RENDERER_NOT_REGISTERED"))
    } finally {
      await t3.close()
    }
    assert.ok(t.events.filter((e) => e.kind === "PLAYER_REFUSED").length > refusedBefore - 1)
    assert.ok(t.events.some((e) => e.kind === "PLAYER_REFUSED" && e.reason === "ALREADY_ATTACHED"))
  } finally {
    await t.close()
  }
})

test("no offer before ATTACHED: the renderer's offer is forwarded only after the Platform reports attached for this route", async () => {
  const t = await setup()
  try {
    const { s } = await t.streamer()
    const p = await t.player(tok())
    const playerId = s.frames.find((f) => f.type === "playerConnected")!.playerId
    // renderer offers before attaching -> blocked, player disconnected
    send(s, { type: "iceCandidate", playerId, candidate: { candidate: "candidate:1 1 udp 1 10.0.0.1 5000 typ host" } })
    send(s, { type: "offer", playerId, sdp: "v=0\r\n" })
    await sleep(250)
    assert.ok(!p.c.frames.some((f) => f.type === "offer" || f.type === "iceCandidate"), "neither the offer nor buffered candidates leaked")
    assert.ok(t.events.some((e) => e.kind === "OFFER_BLOCKED" && e.reason === "NOT_ATTACHED"))
    assert.equal(p.c.ws.readyState, WebSocket.CLOSED)
    assert.ok(s.frames.some((f) => f.type === "playerDisconnected" && f.playerId === playerId))
    // attached -> forwarded exactly once, with buffered candidates after it
    const p2 = await t.player(tok())
    const id2 = s.frames.filter((f) => f.type === "playerConnected").at(-1)!.playerId
    send(s, { type: "iceCandidate", playerId: id2, candidate: { candidate: "candidate:1 1 udp 1 10.0.0.1 5000 typ host" } })
    t.state.attached = true
    send(s, { type: "offer", playerId: id2, sdp: "v=0\r\n" })
    await sleep(250)
    const types = p2.c.frames.map((f) => f.type)
    assert.deepEqual(types.filter((x) => x !== "config"), ["offer", "iceCandidate"])
    send(s, { type: "offer", playerId: id2, sdp: "v=0\r\n" })
    await sleep(150)
    assert.equal(p2.c.frames.filter((f) => f.type === "offer").length, 1, "duplicate offer dropped")
    // an attached authorization whose route differs is also blocked
    t.state.attached = false
    const p3 = await t.player(tok())
    const id3 = s.frames.filter((f) => f.type === "playerConnected").at(-1)!.playerId
    ;(t.server.config as { route: { resolve: (h: string) => Promise<RouteDecision | null> } }).route = { resolve: async () => ({ routeKey: "wkr1-" + "b".repeat(40), attached: true }) }
    send(s, { type: "offer", playerId: id3, sdp: "v=0\r\n" })
    await sleep(200)
    assert.ok(!p3.c.frames.some((f) => f.type === "offer"))
    assert.ok(t.events.some((e) => e.kind === "OFFER_BLOCKED" && e.reason === "ROUTE_MISMATCH"))
  } finally {
    await t.close()
  }
})

test("relay mode: non-relay candidates never reach the player (SDP and trickle)", async () => {
  const t = await setup({ iceMode: "relay" })
  try {
    const { s } = await t.streamer()
    const p = await t.player(tok())
    const id = s.frames.find((f) => f.type === "playerConnected")!.playerId
    t.state.attached = true
    send(s, { type: "offer", playerId: id, sdp: "v=0\r\na=candidate:1 1 udp 1 10.0.0.1 5000 typ host\r\na=candidate:2 1 udp 1 5.6.7.8 5001 typ relay raddr 1.2.3.4 rport 9\r\n" })
    send(s, { type: "iceCandidate", playerId: id, candidate: { candidate: "candidate:3 1 udp 1 10.0.0.1 5002 typ host" } })
    send(s, { type: "iceCandidate", playerId: id, candidate: { candidate: "candidate:4 1 udp 1 5.6.7.8 5003 typ relay raddr 1.2.3.4 rport 9" } })
    await sleep(250)
    const all = JSON.stringify(p.c.frames)
    assert.ok(!all.includes("10.0.0.1"), "renderer host address never reaches the browser")
    assert.equal(p.c.frames.filter((f) => f.type === "iceCandidate").length, 1)
    assert.ok(t.events.some((e) => e.kind === "CANDIDATE_DROPPED"))
  } finally {
    await t.close()
  }
})

test("players cannot enumerate or choose streamers; player-sent offers are ignored; answers reach only the routed renderer", async () => {
  const t = await setup()
  try {
    const { s } = await t.streamer()
    const other = await t.streamer("wkr1-" + "c".repeat(40))
    const p = await t.player(tok())
    send(p.c, { type: "listStreamers" })
    send(p.c, { type: "subscribe", streamerId: "wkr1-" + "c".repeat(40) })
    send(p.c, { type: "offer", sdp: "v=0\r\n" })
    send(p.c, { type: "answer", sdp: "v=0\r\n" })
    await sleep(250)
    assert.ok(!p.c.frames.some((f) => f.type === "streamerList" || f.type === "subscribeFailed"))
    assert.ok(!other.s.frames.some((f) => f.type === "playerConnected" || f.type === "answer" || f.type === "offer"), "the other renderer was never reached")
    assert.ok(s.frames.some((f) => f.type === "answer"), "the answer reached only the routed renderer")
    for (const k of ["listStreamers", "subscribe", "offer"]) assert.ok(t.events.some((e) => e.kind === "PLAYER_MESSAGE_IGNORED" && e.type === k), k)
  } finally {
    await t.close()
  }
})
