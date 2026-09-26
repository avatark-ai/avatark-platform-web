// WORLDK-M14-B5 end-to-end certification: the GPU-independent media control plane.
//
// Real Chromium + real WebRTC (fake/test media) + the real WorldK signalling
// service (pinned Epic UE5.8 signalling library) + real Platform handlers
// (gateway, B3, B4, 045 route, runtime ingress) + real PostgreSQL + a local
// coturn (use-auth-secret) for relay-only proofs. The renderer is the mock
// render worker (B2 ReferenceRuntime + Chromium media engine).
//
//   ENTER -> allocation -> RuntimeSession -> CLAIM -> B3 capability -> AUTHORIZED
//   -> signalling admission (Platform route) -> playerConnected -> B4 ATTACH
//   -> offer -> WebRTC -> MEDIA_ESTABLISHED -> STREAM_JOINED -> ARRIVAL
//
// Requires WORLD_CONSUMER_TEST_DATABASE_URL (superuser URL, DISPOSABLE local
// server). Relay/debounce tests also require `turnserver` (coturn) and
// M14B5_TURN_IP (a non-loopback local IPv4). Skipped visibly otherwise.
import { after, before, describe, test } from "node:test"
import assert from "node:assert/strict"
import { spawn, type ChildProcess, execFileSync } from "node:child_process"
import { createHmac, randomBytes, randomUUID } from "node:crypto"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import http from "node:http"
import type { AddressInfo } from "node:net"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test"
import type { WorldEntryResult } from "@avatark/world-consumer-contracts"
import { createLivingForestFixtureFactSource } from "../worldConsumer/facts.ts"
import type { ContinuityRecord, VisitorContinuityLedger } from "../worldConsumer/continuityLedger.ts"
import { assertLocalUrl, createSupabaseShapedDb, urlFor } from "../worldConsumer/testing/supabaseShapedDb.ts"
import { PgEntryAuthorityDb } from "./authorityDb.ts"
import { newRuntimeCredential, newSecret, sha256 } from "./credentials.ts"
import { handleHandoff, handleLeave, handleSessionView, LEAVE_PATH, SESSION_COOKIE, SESSION_PATH } from "./gateway.ts"
import { handleMediaPage, MEDIA_PAGE_PATH } from "./mediaPlayerPage.ts"
import { httpIngressTransport, ReferenceRuntime } from "./referenceRuntime.ts"
import { handleWorldEntryRequest, HANDOFF_PATH_PREFIX } from "./resolver.ts"
import { handleRuntimeIngress } from "./runtimeIngress.ts"
import { handleSignallingRoute, SIGNALLING_ROUTE_PATH, streamRouteKey } from "./signallingRoute.ts"
import { handleStreamAuthorize, handleStreamCapabilityIssue, STREAM_AUTHORIZE_PATH, STREAM_CAPABILITY_PATH } from "./streamCapability.ts"
import { MockRenderer } from "./testing/mockRenderer.ts"
import { httpRouteAuthority } from "../../services/worldk-signalling/src/routeAuthority.ts"
import { WorldKSignallingServer, type SignallingEvent } from "../../services/worldk-signalling/src/server.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const url = process.env.WORLD_CONSUMER_TEST_DATABASE_URL
const TURN_IP = process.env.M14B5_TURN_IP
const PLATFORM_PW = "m14-platform-credential-local-only"
const WORLD = "living-forest"
const mig = (f: string) => readFileSync(path.join(here, "../../supabase/migrations", f), "utf8")
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const hasTurn = (() => { try { execFileSync("which", ["turnserver"]); return !!TURN_IP } catch { return false } })()

if (!url) {
  test("M14-B5 media control plane E2E (skipped: WORLD_CONSUMER_TEST_DATABASE_URL not set)", { skip: true }, () => {})
} else {
  assertLocalUrl(url)
  const dbName = `m14b5_${Date.now()}`
  const SIGNALLING_KEY = newSecret()
  const STREAMER_KEY = newSecret()
  let su: pg.Client, owner: pg.Client, db: PgEntryAuthorityDb
  let platform: http.Server, PLATFORM = ""
  let browser: Browser
  const facts = createLivingForestFixtureFactSource()
  const evidence: Record<string, unknown> = {}
  /** Every body the Platform returned to a browser, and every signalling frame a player received. */
  const browserBodies: string[] = []
  const playerFrames: string[] = []
  const turnCredentialsSeen: { username: string; credential: string }[] = []
  let signallingUrl = ""

  const ledger: VisitorContinuityLedger = {
    async get(worldId, subjectId): Promise<ContinuityRecord | null> {
      const r = (await su.query("SELECT * FROM world_visitor_continuity WHERE world_id = $1 AND subject_id = $2", [worldId, subjectId])).rows[0]
      return r ? ({ worldId, subjectId, visitCount: r.visit_count, lastPlaceId: r.last_place_id } as ContinuityRecord) : null
    },
    recordConfirmedEntry: () => Promise.reject(new Error("read-only")),
    recordLeave: () => Promise.reject(new Error("read-only")),
  }

  function serve(handler: (req: http.IncomingMessage, body: Buffer, res: http.ServerResponse) => Promise<void>): Promise<http.Server> {
    const srv = http.createServer((req, res) => {
      const chunks: Buffer[] = []
      req.on("data", (c) => chunks.push(c))
      req.on("end", () => void handler(req, Buffer.concat(chunks), res).catch(() => { res.statusCode = 500; res.end() }))
    })
    return new Promise((r) => srv.listen(0, "127.0.0.1", () => r(srv)))
  }
  const toRequest = (req: http.IncomingMessage, body: Buffer) => {
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v)
    return new Request(`${PLATFORM}${req.url}`, { method: req.method, headers, body: req.method === "GET" ? undefined : new Uint8Array(body) })
  }
  async function send(res: http.ServerResponse, out: Response, record: boolean) {
    const buf = Buffer.from(await out.arrayBuffer())
    if (record) browserBodies.push(buf.toString("utf8"))
    res.writeHead(out.status, Object.fromEntries(out.headers))
    res.end(buf)
  }

  // ── signalling + renderer per ICE mode ──────────────────────────
  interface Plane { paused: { v: boolean }; sig: WorldKSignallingServer; events: SignallingEvent[]; playerUrl: string; streamerUrl: string; renderer: MockRenderer; rt: ReferenceRuntime; instanceId: string; page: Page; loop: ReturnType<typeof setInterval> }
  let turnProc: ChildProcess | null = null
  let turnDir = ""
  let turnSecret = ""

  async function registerRuntime(label: string) {
    const instanceId = randomUUID()
    const cred = newRuntimeCredential()
    await owner.query("SELECT world_runtime_register_instance($1, $2, $3, $4)", [instanceId, WORLD, label, 32])
    await owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [cred.credentialId, instanceId, cred.sha256, 3600])
    return { instanceId, bearer: cred.bearer }
  }

  async function makePlane(mode: "direct" | "relay", opts: { video?: boolean; rogue?: boolean; label: string }): Promise<Plane> {
    const events: SignallingEvent[] = []
    const sig = new WorldKSignallingServer({
      host: "127.0.0.1", playerPort: 0, streamerPort: 0, streamerKey: STREAMER_KEY,
      route: httpRouteAuthority(PLATFORM, SIGNALLING_KEY), iceMode: mode,
      turn: mode === "relay" ? { urls: [`turn:${TURN_IP}:3478?transport=udp`], secret: turnSecret, ttlSeconds: 300 } : null,
      onEvent: (e) => events.push(e),
    })
    const ports = await sig.listen()
    const { instanceId, bearer } = await registerRuntime(opts.label)
    const page = await (await browser.newContext()).newPage()
    let renderer!: MockRenderer
    const rt = new ReferenceRuntime(httpIngressTransport(PLATFORM, bearer), {
      autoJoin: false,
      onEvent: (e) => { if (e.kind === "CLAIMED") void renderer.register(e.sessionId) },
    })
    renderer = new MockRenderer({ rt, page, streamerUrl: `ws://127.0.0.1:${ports.streamerPort}`, streamerKey: STREAMER_KEY, video: opts.video, rogue: opts.rogue })
    await renderer.start()
    let busy = false
    const paused = { v: false }
    const loop = setInterval(async () => { if (busy || paused.v) return; busy = true; try { await rt.step() } finally { busy = false } }, 1000)
    await rt.poll()
    return { paused, sig, events, playerUrl: `ws://127.0.0.1:${ports.playerPort}`, streamerUrl: `ws://127.0.0.1:${ports.streamerPort}`, renderer, rt, instanceId, page, loop }
  }
  async function stopPlane(p: Plane) {
    clearInterval(p.loop)
    p.renderer.stop()
    await p.page.context().close()
    await p.sig.close()
  }
  /** Only this plane's runtime is eligible for new allocations. */
  const pin = (p: Plane) => su.query("UPDATE world_runtime_instances SET last_seen_at = now() - interval '1 hour' WHERE instance_id <> $1", [p.instanceId])

  // ── visitor helpers ─────────────────────────────────────────────
  async function newPlayer(): Promise<{ ctx: BrowserContext; page: Page; frames: string[] }> {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    const frames: string[] = []
    page.on("websocket", (ws) => ws.on("framereceived", (f) => {
      const s = typeof f.payload === "string" ? f.payload : f.payload.toString("utf8")
      playerFrames.push(s)
      frames.push(s)
      try {
        const m = JSON.parse(s)
        for (const i of m?.peerConnectionOptions?.iceServers ?? []) if (i.username) turnCredentialsSeen.push({ username: i.username, credential: i.credential })
      } catch {}
    }))
    return { ctx, page, frames }
  }
  /** ENTER -> handoff in the player's browser -> the plane's renderer claims (and registers a streamer). */
  async function enterAndClaim(p: Plane, player: { ctx: BrowserContext; page: Page }, subjectId?: string) {
    const subject = subjectId ?? randomUUID()
    if (!subjectId) await su.query("INSERT INTO auth.users (id) VALUES ($1)", [subject])
    await pin(p)
    await p.rt.poll()
    const res = await handleWorldEntryRequest(new Request(`${PLATFORM}/api/worlds/${WORLD}/entry`, { method: "POST", body: JSON.stringify({
      schemaVersion: "1.0", contract: "world-entry-intent", intentId: randomUUID(), worldId: WORLD, requestedPlaceId: null, narrativeContext: null,
      client: { surface: "WEB", capabilities: { webgl2: true, touchPrimary: false, viewportClass: "EXPANDED", reducedMotion: false } },
    }) }), WORLD, async () => ({ subjectId: subject }), { mode: "FIXTURE_PREVIEW", ledger, db, handoffOrigin: PLATFORM })
    const entry = JSON.parse(await res.text()) as WorldEntryResult
    assert.equal(entry.outcome, "READY", JSON.stringify(entry))
    await player.page.goto(entry.handoff!.href)
    const cookie = (await player.ctx.cookies()).find((c) => c.name === SESSION_COOKIE)!.value
    let sess: { claimed_at: Date | null; session_id: string; instance_id: string; visit_id: string; allocation_id: string } | undefined
    for (let i = 0; i < 40; i++) {
      sess = (await su.query("SELECT * FROM world_runtime_sessions WHERE view_sha256 = $1", [sha256(cookie)])).rows[0]
      const cur = sess
      if (cur?.claimed_at && p.renderer.log.some((l) => l.kind === "REGISTERED" && l.sessionId === cur.session_id)) break
      await sleep(250)
    }
    assert.ok(sess?.claimed_at, "claimed by the allocated renderer")
    assert.equal(sess.instance_id, p.instanceId)
    return { subject, cookie, sessionId: sess.session_id, visitId: sess.visit_id, allocationId: sess.allocation_id }
  }
  /** B3 from Node with the visitor's cookie (for raw signalling clients). */
  async function authorizeFor(cookie: string): Promise<string> {
    const h = { origin: PLATFORM, "sec-fetch-site": "same-origin", "content-type": "application/json", cookie: `${SESSION_COOKIE}=${cookie}` }
    const i = await fetch(`${PLATFORM}${STREAM_CAPABILITY_PATH}`, { method: "POST", headers: h, body: "{}" })
    assert.equal(i.status, 201)
    const c = (await i.json()) as { capability: string; worldId: string }
    const a = await fetch(`${PLATFORM}${STREAM_AUTHORIZE_PATH}`, { method: "POST", headers: h, body: JSON.stringify({ capability: c.capability, worldId: c.worldId }) })
    assert.equal(a.status, 200)
    return ((await a.json()) as { authorization: string }).authorization
  }
  /** A raw (non-browser) signalling client: what it receives, and whether the handshake was accepted. */
  /** A raw (non-browser) signalling client (Node's WHATWG WebSocket): what it receives, and whether the handshake was accepted. */
  interface RawClient { accepted: boolean; frames: Record<string, unknown>[]; ws: WebSocket | null; onFrame: (f: (m: Record<string, unknown>) => void) => void }
  function rawPlayer(p: Plane, protocols: string[] | undefined, waitMs = 2500): Promise<RawClient> {
    return new Promise((resolve) => {
      const frames: Record<string, unknown>[] = []
      const listeners: ((m: Record<string, unknown>) => void)[] = []
      const ws = protocols ? new WebSocket(p.playerUrl, protocols) : new WebSocket(p.playerUrl)
      let accepted = false
      ws.onopen = () => { accepted = true }
      ws.onmessage = (ev: MessageEvent) => {
        try {
          const m = JSON.parse(String(ev.data)) as Record<string, unknown>
          frames.push(m)
          for (const l of listeners) l(m)
        } catch {}
      }
      ws.onerror = () => {}
      setTimeout(() => resolve({ accepted, frames, ws: accepted ? ws : null, onFrame: (f) => listeners.push(f) }), waitMs)
    })
  }
  async function connectMedia(page: Page, timeoutMs = 20_000): Promise<string> {
    await page.goto(`${PLATFORM}${MEDIA_PAGE_PATH}`)
    await page.click("#go")
    await page.waitForFunction(() => ["STREAMING", "REFUSED", "ENDED"].includes(document.getElementById("out")?.dataset.state ?? ""), null, { timeout: timeoutMs }).catch(() => {})
    return page.$eval("#out", (e) => (e as HTMLElement).dataset.state ?? "")
  }
  const waitFor = async (what: string, pred: () => boolean | Promise<boolean>, ms = 20_000) => {
    const t0 = Date.now()
    while (Date.now() - t0 < ms) { if (await pred()) return; await sleep(200) }
    assert.fail(`timed out waiting for ${what}`)
  }
  const lifecycle = async (subject: string) => ({
    events: (await su.query("SELECT event_type, authority_kind FROM world_visitor_lifecycle_events WHERE subject_id = $1 ORDER BY recorded_at", [subject])).rows,
    continuity: (await su.query("SELECT visit_count, visit_open FROM world_visitor_continuity WHERE subject_id = $1", [subject])).rows[0],
    presence: (await su.query("SELECT count(*)::int n FROM world_visit_presence WHERE subject_id = $1", [subject])).rows[0].n as number,
  })
  const digestAll = async () => {
    const tables = (await su.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`)).rows.map((r) => r.tablename as string)
    const out: Record<string, string> = {}
    for (const t of tables) out[t] = (await su.query(`SELECT md5(coalesce(string_agg(x::text, '|' ORDER BY x::text), '')) d FROM ${pg.escapeIdentifier(t)} x`)).rows[0].d
    return out
  }

  // A browser-side custom player (runs on the Platform media page origin; CSP connect-src allows signalling).
  async function customPlayer(page: Page, cookieAuthz: string, mode: "noAck" | "badNonce" | "earlyAck" | "wsOnly" | "fixedNonce", fixedNonce?: string) {
    await page.goto(`${PLATFORM}${MEDIA_PAGE_PATH}`)
    return page.evaluate(([S, authz, mode, fixed]) => new Promise<Record<string, unknown>>((resolve) => {
      const ws = new WebSocket(S as string, ["wk-player-v1", "wk-authz." + authz])
      const seen: Record<string, unknown> = { offer: false, nonce: null, ice: [] as string[] }
      let pc: RTCPeerConnection | null = null
      ws.onmessage = async (ev: MessageEvent) => {
        const m = JSON.parse(ev.data as string)
        if (m.type === "config") {
          pc = new RTCPeerConnection(m.peerConnectionOptions || {})
          pc.oniceconnectionstatechange = () => (seen.ice as string[]).push(pc!.iceConnectionState)
          pc.onicecandidate = (e) => e.candidate && ws.send(JSON.stringify({ type: "iceCandidate", candidate: e.candidate.toJSON() }))
          pc.ondatachannel = (e) => {
            e.channel.onmessage = (x) => {
              const d = JSON.parse(x.data)
              if (d.t !== "nonce") return
              seen.nonce = d.n
              if (mode === "badNonce") e.channel.send(JSON.stringify({ t: "first-frame", n: (d.n as string).split("").reverse().join("") }))
              if (mode === "earlyAck") e.channel.send(JSON.stringify({ t: "first-frame", n: d.n }))
              if (mode === "fixedNonce") e.channel.send(JSON.stringify({ t: "first-frame", n: fixed }))
            }
          }
        } else if (m.type === "offer") {
          seen.offer = true
          if (mode === "wsOnly") return
          await pc!.setRemoteDescription({ type: "offer", sdp: m.sdp })
          await pc!.setLocalDescription(await pc!.createAnswer())
          ws.send(JSON.stringify({ type: "answer", sdp: pc!.localDescription!.sdp }))
        } else if (m.type === "iceCandidate" && pc && pc.remoteDescription) await pc.addIceCandidate(m.candidate).catch(() => {})
      }
      setTimeout(() => resolve({ ...seen, finalIce: pc ? pc.iceConnectionState : null }), 6000)
    }), [signallingUrl, cookieAuthz, mode, fixedNonce ?? ""] as const)
  }

  let D: Plane

  describe("M14-B5 media control plane (real Chromium + real WebRTC + real Platform/Postgres)", () => {
    before(async () => {
      ;({ su, owner } = await createSupabaseShapedDb(url, dbName, { through040: true }))
      for (const f of ["043_world_stream_capability_authority.sql", "044_world_stream_attachment_authority.sql", "045_world_stream_signalling_route.sql"]) await owner.query(mig(f))
      await owner.query(`ALTER ROLE worldk_platform_entry_preview LOGIN PASSWORD '${(await import("../../scripts/worldk-m14-runtime-registry.ts")).scramVerifier(PLATFORM_PW)}'`)
      db = new PgEntryAuthorityDb(urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW), { allowLocal: true, ssl: false })
      platform = await serve(async (req, body, res) => {
        const p = new URL(req.url ?? "/", "http://x").pathname
        const r = () => toRequest(req, body)
        if (req.method === "GET" && p.startsWith(HANDOFF_PATH_PREFIX)) return send(res, await handleHandoff(p.slice(HANDOFF_PATH_PREFIX.length), { db }), true)
        if (req.method === "GET" && p === SESSION_PATH) return send(res, await handleSessionView(r(), { db }), true)
        if (req.method === "POST" && p === LEAVE_PATH) return send(res, await handleLeave(r(), { db }), true)
        if (req.method === "POST" && p === STREAM_CAPABILITY_PATH) return send(res, await handleStreamCapabilityIssue(r(), { db }), true)
        if (req.method === "POST" && p === STREAM_AUTHORIZE_PATH) return send(res, await handleStreamAuthorize(r(), { db }), true)
        if (req.method === "GET" && p === MEDIA_PAGE_PATH) return send(res, await handleMediaPage(r(), { db, signallingUrl }), true)
        if (req.method === "POST" && p === SIGNALLING_ROUTE_PATH) return send(res, await handleSignallingRoute(r(), { db, configuredKey: SIGNALLING_KEY }), false)
        if (req.method === "POST" && p.startsWith("/api/runtime/v1/")) return send(res, await handleRuntimeIngress(r(), p.slice("/api/runtime/v1/".length), { db, mode: "FIXTURE_PREVIEW", facts }), false)
        res.writeHead(404)
        res.end()
      })
      PLATFORM = `http://localhost:${(platform.address() as AddressInfo).port}`
      browser = await chromium.launch()
      D = await makePlane("direct", { label: "m14b5-direct" })
      signallingUrl = D.playerUrl
    })
    after(async () => {
      if (process.env.M14B5_EVIDENCE_FILE) writeFileSync(process.env.M14B5_EVIDENCE_FILE, JSON.stringify(evidence, null, 2) + "\n")
      if (process.env.M14B5_SECRETS_FILE) writeFileSync(process.env.M14B5_SECRETS_FILE, JSON.stringify({ turn: turnCredentialsSeen, turnSecret, keys: [SIGNALLING_KEY, STREAMER_KEY] }) + "\n", { mode: 0o600 })
      if (D) await stopPlane(D)
      await browser?.close()
      await new Promise((r) => platform?.close(r))
      if (turnProc) turnProc.kill("SIGKILL")
      if (turnDir) rmSync(turnDir, { recursive: true, force: true })
      await db?.end()
      await owner?.end()
      await su?.end()
    })

    test("G12/G13/G21/G22. full chain in real Chromium: exactly one STREAM_JOINED -> exactly one VISIT_OPENED; browser learns no identity", async () => {
      const player = await newPlayer()
      const v = await enterAndClaim(D, player)
      const t0 = Date.now()
      assert.equal(await connectMedia(player.page), "STREAMING")
      await waitFor("STREAM_JOINED", () => D.renderer.facts(v.sessionId, "STREAM_JOINED").length === 1)
      const joined = D.renderer.facts(v.sessionId, "STREAM_JOINED")
      assert.equal(joined[0].outcome, "VISIT_OPENED")
      await sleep(1500)
      assert.equal(D.renderer.facts(v.sessionId, "STREAM_JOINED").length, 1, "exactly once")
      const lc = await lifecycle(v.subject)
      assert.deepEqual(lc.events.map((e) => e.event_type), ["CONFIRMED_ARRIVAL"], "exactly one ARRIVAL")
      assert.equal(lc.continuity.visit_count, 1)
      // attach happened before the offer, from this renderer
      const log = D.renderer.log.filter((l) => l.sessionId === v.sessionId).map((l) => l.kind)
      assert.ok(log.indexOf("ATTACH") >= 0 && log.indexOf("ATTACH") < log.indexOf("OFFER_SENT"), log.join(","))
      assert.equal((await su.query("SELECT instance_id FROM world_stream_attachments WHERE session_id = $1", [v.sessionId])).rows[0].instance_id, D.instanceId)
      assert.ok(D.events.some((e) => e.kind === "OFFER_FORWARDED"))
      // the renderer's state machine saw every requirement
      assert.deepEqual(D.renderer.machineOf(v.sessionId)!.snapshot(), { phase: "JOINED", iceConnected: true, dataChannelOpen: true, ackAccepted: true, rendererFlowing: true })
      // disclosure: nothing the browser received names the renderer or the session
      await player.page.goto(`${PLATFORM}${SESSION_PATH}`)
      assert.match(await player.page.content(), /You are in /)
      const all = browserBodies.join("\n") + playerFrames.join("\n")
      for (const id of [D.instanceId, v.sessionId, v.visitId, v.allocationId, v.subject, streamRouteKey(v.sessionId), STREAMER_KEY, SIGNALLING_KEY]) assert.ok(!all.includes(id), `browser saw ${id}`)
      assert.ok(!playerFrames.some((f) => /"streamerList"|"streamerIdChanged"|"endpointId"|"playerCount"/.test(f)), "no streamer enumeration or identity")
      evidence.fullChain = { msToJoined: Date.now() - t0, joinedOutcome: joined[0].outcome, arrivals: lc.events.length, rendererLogOrder: log }
      await player.ctx.close()
    })

    test("G1-G4. no / forged / expired / replayed authorization -> refused at admission, never an offer", async () => {
      const results: Record<string, unknown> = {}
      results.none = await rawPlayer(D, undefined)
      results.onlyPlayerProtocol = await rawPlayer(D, ["wk-player-v1"])
      results.forged = await rawPlayer(D, ["wk-player-v1", "wk-authz." + newSecret()])
      // expired: authorized, then aged past the 60 s attach window before admission
      const player = await newPlayer()
      const v = await enterAndClaim(D, player)
      const expired = await authorizeFor(v.cookie)
      await su.query("UPDATE world_stream_capabilities SET issued_at = issued_at - interval '61 seconds', expires_at = expires_at - interval '61 seconds', consumed_at = consumed_at - interval '61 seconds' WHERE authorization_sha256 = $1", [sha256(expired)])
      results.expired = await rawPlayer(D, ["wk-player-v1", "wk-authz." + expired])
      // replay: a fully used authorization (attached) presented again
      const fresh = await authorizeFor(v.cookie)
      const first = await rawPlayer(D, ["wk-player-v1", "wk-authz." + fresh])
      assert.equal(first.accepted, true)
      await waitFor("attach", () => D.renderer.log.some((l) => l.kind === "ATTACH" && l.sessionId === v.sessionId && l.outcome === "ATTACHED"))
      results.replayed = await rawPlayer(D, ["wk-player-v1", "wk-authz." + fresh])
      first.ws?.close()
      for (const k of ["none", "onlyPlayerProtocol", "forged", "expired", "replayed"]) {
        const r = results[k] as { accepted: boolean; frames: { type?: string }[] }
        assert.equal(r.accepted, false, `${k} admitted`)
        assert.ok(!r.frames.some((f) => f.type === "offer" || f.type === "config"), `${k} received ${JSON.stringify(r.frames)}`)
      }
      const reasons = D.events.filter((e) => e.kind === "PLAYER_REFUSED").map((e) => (e as { reason: string }).reason)
      for (const r of ["NO_AUTHORIZATION", "NOT_ROUTABLE", "AUTHORIZATION_REUSED"]) assert.ok(reasons.includes(r), `${r} in ${reasons}`)
      evidence.admission = { refusedReasons: [...new Set(reasons)], allRefusedWithoutConfigOrOffer: true }
      await player.ctx.close()
    })

    test("G6/G18. browser cannot enumerate or select a renderer; signalling-only events mutate no lifecycle/world/continuity state", async () => {
      const player = await newPlayer()
      const v = await enterAndClaim(D, player)
      // Pause the renderer's own runtime loop (its polls legitimately refresh liveness) so that
      // only signalling activity happens during the measured window.
      D.paused.v = true
      await sleep(1200)
      const before = await digestAll()
      // refusals and unauthorized attempts: nothing moves
      await rawPlayer(D, ["wk-player-v1", "wk-authz." + newSecret()], 800)
      await rawPlayer(D, ["wk-player-v1"], 800)
      await rawPlayer(D, undefined, 800)
      assert.deepEqual(await digestAll(), before, "signalling-only refusals changed no table")
      D.paused.v = false
      // an admitted player tries to enumerate / pick another streamer: ignored
      const authz = await authorizeFor(v.cookie)
      const other = await newPlayer()
      const vOther = await enterAndClaim(D, other)
      const r = await rawPlayer(D, ["wk-player-v1", "wk-authz." + authz], 1500)
      assert.equal(r.accepted, true)
      const got: Record<string, unknown>[] = []
      r.onFrame((m) => got.push(m))
      r.ws!.send(JSON.stringify({ type: "listStreamers" }))
      r.ws!.send(JSON.stringify({ type: "subscribe", streamerId: streamRouteKey(vOther.sessionId) }))
      r.ws!.send(JSON.stringify({ type: "unsubscribe" }))
      await sleep(1500)
      assert.ok(!got.some((m) => m.type === "streamerList" || m.type === "subscribeFailed"), JSON.stringify(got))
      const ignored = D.events.filter((e) => e.kind === "PLAYER_MESSAGE_IGNORED").map((e) => (e as { type: string }).type)
      for (const t of ["listStreamers", "subscribe", "unsubscribe"]) assert.ok(ignored.includes(t), t)
      assert.ok(!D.renderer.log.some((l) => l.kind === "PLAYER_CONNECTED" && l.sessionId === vOther.sessionId), "the other visitor's renderer session was never reached")
      r.ws!.close()
      evidence.enumeration = { ignored: [...new Set(ignored)], streamerListSent: false }
      await player.ctx.close()
      await other.ctx.close()
    })

    test("G7-G11. WS connected / playerConnected / ICE connected / no decoded frame / wrong or replayed nonce -> no STREAM_JOINED", async () => {
      const out: Record<string, unknown> = {}
      const run = async (label: string, mode: "wsOnly" | "noAck" | "badNonce" | "fixedNonce", fixed?: string) => {
        const player = await newPlayer()
        const v = await enterAndClaim(D, player)
        const authz = await authorizeFor(v.cookie)
        const seen = await customPlayer(player.page, authz, mode, fixed)
        await sleep(1500)
        const log = D.renderer.log.filter((l) => l.sessionId === v.sessionId)
        out[label] = { seenOffer: seen.offer, ice: seen.finalIce, rendererSaw: [...new Set(log.map((l) => l.kind === "MEDIA" ? `MEDIA:${l.input}${l.detail ? ":" + l.detail : ""}` : l.kind))], phase: D.renderer.machineOf(v.sessionId)?.phase }
        assert.equal(D.renderer.facts(v.sessionId, "STREAM_JOINED").length, 0, `${label}: joined`)
        assert.equal((await lifecycle(v.subject)).presence, 0, `${label}: arrival`)
        await player.ctx.close()
        return { v, seen }
      }
      const ws = await run("wsConnectedAndPlayerConnectedOnly", "wsOnly")
      assert.equal(ws.seen.offer, true, "offer reached the player (attach happened)")
      const ice = await run("iceConnectedAndDataChannelOpenNoAck", "noAck")
      assert.match(String(ice.seen.finalIce), /connected|completed/)
      await run("wrongNonce", "badNonce")
      // replayed nonce: a nonce another session legitimately received
      const donor = await newPlayer()
      const dv = await enterAndClaim(D, donor)
      const dseen = await customPlayer(donor.page, await authorizeFor(dv.cookie), "noAck")
      await run("replayedNonceFromAnotherPeer", "fixedNonce", String(dseen.nonce))
      await donor.ctx.close()
      assert.equal((out.wrongNonce as { phase: string }).phase, "FAILED")
      assert.equal((out.replayedNonceFromAnotherPeer as { phase: string }).phase, "FAILED")
      evidence.notJoined = out
    })

    test("G10. ATTACHED without a decoded frame (renderer sends no video): honest browser never acks; an early/forged ack still cannot join", async () => {
      const N = await makePlane("direct", { video: false, label: "m14b5-novideo" })
      const prevUrl = signallingUrl
      signallingUrl = N.playerUrl
      try {
        const honest = await newPlayer()
        const v1 = await enterAndClaim(N, honest)
        assert.notEqual(await connectMedia(honest.page, 6000), "STREAMING")
        const early = await newPlayer()
        const v2 = await enterAndClaim(N, early)
        await customPlayer(early.page, await authorizeFor(v2.cookie), "earlyAck")
        await sleep(2000)
        for (const v of [v1, v2]) {
          assert.equal(N.renderer.facts(v.sessionId, "STREAM_JOINED").length, 0)
          assert.equal((await lifecycle(v.subject)).presence, 0)
        }
        assert.equal(N.renderer.machineOf(v2.sessionId)!.snapshot().ackAccepted, true, "the early ack was accepted as an ack")
        assert.equal(N.renderer.machineOf(v2.sessionId)!.snapshot().rendererFlowing, false, "but renderer corroboration is absent")
        evidence.noDecodedFrame = { honest: N.renderer.machineOf(v1.sessionId)!.snapshot(), earlyAck: N.renderer.machineOf(v2.sessionId)!.snapshot() }
        await honest.ctx.close()
        await early.ctx.close()
      } finally {
        signallingUrl = prevUrl
        await stopPlane(N)
      }
    })

    test("G5. wrong renderer: a squatting/rogue renderer gets the player but cannot attach, and its offer is blocked by signalling", async () => {
      const R = await makePlane("direct", { rogue: true, label: "m14b5-rogue" })
      try {
        // The rogue connects to the SAME signalling (D) and squats the route key of a session allocated to D.
        const roguePage = await (await browser.newContext()).newPage()
        const rogueOnD = new MockRenderer({ rt: R.rt, page: roguePage, streamerUrl: D.streamerUrl, streamerKey: STREAMER_KEY, rogue: true })
        await rogueOnD.start()
        const player = await newPlayer()
        await pin(D)
        await D.rt.poll()
        D.paused.v = true // hold D's claim until the rogue has squatted
        const subject = randomUUID()
        await su.query("INSERT INTO auth.users (id) VALUES ($1)", [subject])
        const res = await handleWorldEntryRequest(new Request(`${PLATFORM}/api/worlds/${WORLD}/entry`, { method: "POST", body: JSON.stringify({
          schemaVersion: "1.0", contract: "world-entry-intent", intentId: randomUUID(), worldId: WORLD, requestedPlaceId: null, narrativeContext: null,
          client: { surface: "WEB", capabilities: { webgl2: true, touchPrimary: false, viewportClass: "EXPANDED", reducedMotion: false } },
        }) }), WORLD, async () => ({ subjectId: subject }), { mode: "FIXTURE_PREVIEW", ledger, db, handoffOrigin: PLATFORM })
        const entry = JSON.parse(await res.text()) as WorldEntryResult
        await player.page.goto(entry.handoff!.href)
        const cookie = (await player.ctx.cookies()).find((c) => c.name === SESSION_COOKIE)!.value
        const sess = (await su.query("SELECT * FROM world_runtime_sessions WHERE view_sha256 = $1", [sha256(cookie)])).rows[0]
        await rogueOnD.register(sess.session_id) // squat before D claims/registers
        await waitFor("rogue registered", () => rogueOnD.log.some((l) => l.kind === "REGISTERED" && l.committed))
        D.paused.v = false
        await waitFor("D claims", async () => !!(await su.query("SELECT claimed_at FROM world_runtime_sessions WHERE session_id = $1", [sess.session_id])).rows[0].claimed_at)
        await waitFor("D's registration refused (squatted)", () => D.renderer.log.some((l) => l.kind === "REGISTERED" && l.sessionId === sess.session_id && !l.committed) || D.events.some((e) => e.kind === "STREAMER_REFUSED"))
        const seen = await customPlayer(player.page, await authorizeFor(cookie), "noAck")
        assert.equal(seen.offer, false, "no offer reached the player")
        assert.ok(D.events.some((e) => e.kind === "OFFER_BLOCKED" && e.reason === "NOT_ATTACHED"), "signalling blocked the rogue's offer")
        assert.ok(rogueOnD.log.some((l) => l.kind === "OFFER_SENT" && !l.attached), "the rogue did try to offer without attaching")
        assert.equal((await su.query("SELECT count(*)::int n FROM world_stream_attachments WHERE session_id = $1", [sess.session_id])).rows[0].n, 0)
        // a non-rogue wrong renderer tries to attach with its own credential: SESSION_NOT_BOUND
        assert.equal(await R.rt.attachStreamDigest(sess.session_id, "0".repeat(64)), null)
        assert.equal(await lifecycle(subject).then((l) => l.presence), 0)
        rogueOnD.stop()
        await roguePage.context().close()
        evidence.wrongRenderer = { squatBlockedLegitRegistration: true, offerBlocked: "NOT_ATTACHED", attachments: 0 }
        await player.ctx.close()
      } finally {
        await stopPlane(R)
      }
    })

    test("G14. reconnect inside grace (browser refresh): STREAM_LOST -> grace -> re-entry -> SESSION_RESUMED, not a second Visit", async () => {
      const player = await newPlayer()
      const v = await enterAndClaim(D, player)
      assert.equal(await connectMedia(player.page), "STREAMING")
      await waitFor("joined", () => D.renderer.facts(v.sessionId, "STREAM_JOINED").length === 1)
      await player.page.reload() // WS 1001 -> playerDisconnected -> renderer closes the peer
      await waitFor("STREAM_LOST", () => D.renderer.facts(v.sessionId, "STREAM_LOST").length === 1)
      assert.equal(D.renderer.facts(v.sessionId, "STREAM_LOST")[0].outcome, "GRACE_RUNNING")
      const v2 = await enterAndClaim(D, player, v.subject)
      assert.notEqual(v2.sessionId, v.sessionId, "a new RuntimeSession")
      assert.equal(v2.visitId, v.visitId, "the same Visit")
      assert.equal(await connectMedia(player.page), "STREAMING")
      await waitFor("rejoined", () => D.renderer.facts(v2.sessionId, "STREAM_JOINED").length === 1)
      assert.equal(D.renderer.facts(v2.sessionId, "STREAM_JOINED")[0].outcome, "SESSION_RESUMED")
      const lc = await lifecycle(v.subject)
      assert.deepEqual(lc.events.map((e) => e.event_type), ["CONFIRMED_ARRIVAL"])
      assert.equal(lc.continuity.visit_count, 1)
      evidence.reconnectInGrace = { lost: "GRACE_RUNNING", resumed: "SESSION_RESUMED", arrivals: 1, visitCount: 1 }
      await player.ctx.close()
    })

    test("G17. pre-join media failure (30 s window): MEDIA_FAILED, no ARRIVAL, no resurrection; retry needs a new RuntimeSession", async () => {
      const player = await newPlayer()
      const v = await enterAndClaim(D, player)
      const authz = await authorizeFor(v.cookie)
      await customPlayer(player.page, authz, "noAck")
      await waitFor("MEDIA_FAILED", () => D.renderer.machineOf(v.sessionId)?.phase === "FAILED", 40_000)
      const failed = D.renderer.log.find((l) => l.kind === "OUTPUT" && l.sessionId === v.sessionId && l.output.kind === "MEDIA_FAILED")
      assert.deepEqual((failed as { output: unknown }).output, { kind: "MEDIA_FAILED", reason: "MEDIA_ESTABLISHMENT_TIMEOUT" })
      assert.equal(D.renderer.facts(v.sessionId, "STREAM_JOINED").length, 0)
      assert.equal(D.renderer.facts(v.sessionId, "STREAM_LOST").length, 0, "no lifecycle fact at all")
      assert.equal((await lifecycle(v.subject)).presence, 0)
      // the same session cannot attach again (B4: one attachment per session)
      const again = await authorizeFor(v.cookie)
      const r = await rawPlayer(D, ["wk-player-v1", "wk-authz." + again], 1500)
      assert.equal(r.accepted, false, "admission refused: the session is already attached")
      assert.ok(D.events.some((e) => e.kind === "PLAYER_REFUSED" && e.reason === "NOT_ROUTABLE"))
      evidence.preJoinFailure = { reason: "MEDIA_ESTABLISHMENT_TIMEOUT", arrivals: 0, reattachRefused: true }
      await player.ctx.close()
    })

    describe("relay-only (local coturn, use-auth-secret)", { skip: !hasTurn && "turnserver or M14B5_TURN_IP unavailable" }, () => {
      let P: Plane
      before(async () => {
        turnDir = mkdtempSync(path.join(os.tmpdir(), "m14b5-turn-"))
        turnSecret = randomBytes(24).toString("hex")
        const conf = path.join(turnDir, "turnserver.conf")
        writeFileSync(conf, [`listening-ip=${TURN_IP}`, `relay-ip=${TURN_IP}`, "listening-port=3478", "use-auth-secret", `static-auth-secret=${turnSecret}`, "realm=worldk-b5.local", "no-tls", "no-dtls", "no-cli", "fingerprint", "no-multicast-peers", "min-port=49160", "max-port=49200", `allowed-peer-ip=${TURN_IP}`, "no-stdout-log", "log-file=/dev/null"].join("\n") + "\n", { mode: 0o600 })
        turnProc = spawn("turnserver", ["-c", conf], { stdio: "ignore" })
        await sleep(1500)
        P = await makePlane("relay", { label: "m14b5-relay" })
        signallingUrl = P.playerUrl
      })
      after(async () => {
        if (P) await stopPlane(P)
        signallingUrl = D.playerUrl
      })

      test("G19/G20/G21. relay-only WebRTC works; per-connection TURN credentials with TTL, minted only after admission; the browser sees only relay candidates", async () => {
        const credsBefore = turnCredentialsSeen.length
        const refused = await rawPlayer(P, ["wk-player-v1", "wk-authz." + newSecret()], 800)
        assert.ok(!refused.frames.some((f) => f.type === "config"), "no peer options (no TURN credential) before admission")
        const players = [await newPlayer(), await newPlayer()]
        const pairs: unknown[] = []
        for (const pl of players) {
          const v = await enterAndClaim(P, pl)
          assert.equal(await connectMedia(pl.page), "STREAMING")
          await waitFor("joined", () => P.renderer.facts(v.sessionId, "STREAM_JOINED").length === 1)
          const pair = await P.renderer.pairTypes(v.sessionId)
          assert.deepEqual(pair, { local: "relay", remote: "relay" }, "renderer media flows relay <-> relay")
          const browserPair = await pl.page.evaluate(() => document.getElementById("out")?.dataset.pc)
          assert.equal(browserPair, "connected")
          pairs.push(pair)
        }
        const creds = turnCredentialsSeen.slice(credsBefore)
        assert.equal(creds.length, 2, "one credential per admitted player")
        assert.notEqual(creds[0].username, creds[1].username)
        assert.notEqual(creds[0].credential, creds[1].credential)
        const now = Math.floor(Date.now() / 1000)
        for (const c of creds) {
          const exp = Number(c.username.split(":")[0])
          assert.ok(exp > now + 250 && exp <= now + 300, `TTL 300 s (${exp - now})`)
          assert.equal(c.credential, createHmac("sha1", turnSecret).update(c.username).digest("base64"), "coturn use-auth-secret credential")
        }
        // every candidate the browser received is relay (no renderer network identity)
        const received = players.flatMap((pl) => pl.frames).map((f) => { try { return JSON.parse(f) } catch { return null } }).filter(Boolean)
        const cands: string[] = []
        for (const m of received) {
          if (m.type === "iceCandidate") cands.push(m.candidate?.candidate ?? "")
          if (m.type === "offer") for (const line of String(m.sdp).split(/\r\n/)) if (line.startsWith("a=candidate:")) cands.push(line)
        }
        assert.ok(cands.length > 0)
        for (const c of cands) assert.match(c, / typ relay /, c)
        evidence.relay = { players: 2, rendererSelectedPairs: pairs, credentialsMinted: creds.length, distinct: true, ttlSeconds: 300, candidatesSeenByBrowser: cands.length, allRelay: true, nonRelayCandidatesDroppedBySignalling: P.events.filter((e) => e.kind === "CANDIDATE_DROPPED").length }
        for (const pl of players) await pl.ctx.close()
      })

      test("G15/G16. ICE disconnect < 10 s recovers with no STREAM_LOST; > 10 s -> STREAM_LOST (grace)", async () => {
        const player = await newPlayer()
        const v = await enterAndClaim(P, player)
        assert.equal(await connectMedia(player.page), "STREAMING")
        await waitFor("joined", () => P.renderer.facts(v.sessionId, "STREAM_JOINED").length === 1)
        const iceLog = () => P.renderer.log.filter((l) => l.kind === "MEDIA" && l.sessionId === v.sessionId && l.input === "ICE_STATE").map((l) => (l as { detail?: string }).detail)
        // transient: pause the relay long enough for ICE "disconnected", resume inside 10 s
        turnProc!.kill("SIGSTOP")
        await waitFor("ICE disconnected", () => iceLog().includes("disconnected"), 15_000)
        const tDisc = Date.now()
        await sleep(2000)
        turnProc!.kill("SIGCONT")
        await waitFor("ICE recovered", () => { const l = iceLog(); return l.lastIndexOf("connected") > l.lastIndexOf("disconnected") || l.lastIndexOf("completed") > l.lastIndexOf("disconnected") }, 15_000)
        const recoveredAfter = Date.now() - tDisc
        await sleep(12_000)
        assert.equal(P.renderer.facts(v.sessionId, "STREAM_LOST").length, 0, "transient disconnect is not a loss")
        assert.ok(recoveredAfter < 10_000, `recovered in ${recoveredAfter} ms`)
        // sustained: pause beyond 10 s
        turnProc!.kill("SIGSTOP")
        await waitFor("ICE disconnected again", () => iceLog().filter((s) => s === "disconnected").length >= 2, 15_000)
        const tDisc2 = Date.now()
        await waitFor("STREAM_LOST", () => P.renderer.facts(v.sessionId, "STREAM_LOST").length === 1, 20_000)
        const lostAfter = Date.now() - tDisc2
        turnProc!.kill("SIGCONT")
        const lost = P.renderer.log.find((l) => l.kind === "OUTPUT" && l.sessionId === v.sessionId && l.output.kind === "STREAM_LOST") as { output: { reason: string } }
        assert.equal(lost.output.reason, "ICE_DISCONNECTED_10S")
        assert.equal(P.renderer.facts(v.sessionId, "STREAM_LOST")[0].outcome, "GRACE_RUNNING")
        assert.ok(lostAfter >= 9_000 && lostAfter < 14_000, `lost after ${lostAfter} ms`)
        assert.equal((await lifecycle(v.subject)).continuity.visit_open, true, "STREAM_LOST is grace, not departure")
        evidence.iceDebounce = { transientRecoveredMs: recoveredAfter, streamLostAfterMs: lostAfter, reason: lost.output.reason, outcome: "GRACE_RUNNING" }
        await player.ctx.close()
      })

      test("G4b. restarted signalling: an attached authorization presented to a fresh server is refused (ALREADY_ATTACHED)", async () => {
        const player = await newPlayer()
        const v = await enterAndClaim(P, player)
        const authz = await authorizeFor(v.cookie)
        const first = await rawPlayer(P, ["wk-player-v1", "wk-authz." + authz], 1500)
        assert.equal(first.accepted, true)
        await waitFor("attached", () => P.renderer.log.some((l) => l.kind === "ATTACH" && l.sessionId === v.sessionId && l.outcome === "ATTACHED"))
        first.ws?.close()
        const fresh = new WorldKSignallingServer({ host: "127.0.0.1", playerPort: 0, streamerPort: 0, streamerKey: STREAMER_KEY, route: httpRouteAuthority(PLATFORM, SIGNALLING_KEY), iceMode: "direct", turn: null, onEvent: (e) => ev.push(e) })
        const ev: SignallingEvent[] = []
        const ports = await fresh.listen()
        const r = await rawPlayer({ ...P, playerUrl: `ws://127.0.0.1:${ports.playerPort}` }, ["wk-player-v1", "wk-authz." + authz], 1200)
        assert.equal(r.accepted, false)
        assert.ok(ev.some((e) => e.kind === "PLAYER_REFUSED" && e.reason === "ALREADY_ATTACHED"))
        await fresh.close()
        evidence.replayAcrossRestart = "ALREADY_ATTACHED"
        await player.ctx.close()
      })
    })
  })
}
