// WORLDK-M14-B4 browser certification: real Chromium + real gateway/stream/
// relay/ingress handlers + real 043/044 authority on a disposable Postgres.
//
//   handoff -> allocated renderer CLAIMS -> (browser) capability -> AUTHORIZED
//   -> (browser) stub attach -> relay -> allocated renderer -> Platform attach
//   -> ATTACHED -> renderer STREAM_JOINED -> ARRIVAL (IN_WORLD)
//
// The stub attach route exists only in this test's local server (no deployed
// route; topology-neutral). Proves the browser never learns renderer identity
// and that cross-site pages cannot drive it.
//
// Requires WORLD_CONSUMER_TEST_DATABASE_URL (superuser URL, DISPOSABLE local
// server). Skipped visibly when unset.
import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import http from "node:http"
import type { AddressInfo } from "node:net"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"
import { chromium, type Browser } from "@playwright/test"
import type { WorldEntryResult } from "@avatark/world-consumer-contracts"
import { createLivingForestFixtureFactSource } from "../worldConsumer/facts.ts"
import type { ContinuityRecord, VisitorContinuityLedger } from "../worldConsumer/continuityLedger.ts"
import { assertLocalUrl, createSupabaseShapedDb, urlFor } from "../worldConsumer/testing/supabaseShapedDb.ts"
import { PgEntryAuthorityDb } from "./authorityDb.ts"
import { newRuntimeCredential } from "./credentials.ts"
import { handleHandoff, handleSessionView, SESSION_PATH } from "./gateway.ts"
import { ReferenceRuntime, type IngressTransport, type RuntimeEvent } from "./referenceRuntime.ts"
import { handleWorldEntryRequest, HANDOFF_PATH_PREFIX } from "./resolver.ts"
import { handleRuntimeIngress } from "./runtimeIngress.ts"
import { handleStreamAuthorize, handleStreamCapabilityIssue, handleStreamPage, STREAM_AUTHORIZE_PATH, STREAM_CAPABILITY_PATH, STREAM_PAGE_PATH } from "./streamCapability.ts"
import { handleStubAttach, StubAttachmentRelay } from "./stubAttachmentRelay.ts"
import { scramVerifier } from "../../scripts/worldk-m14-runtime-registry.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const url = process.env.WORLD_CONSUMER_TEST_DATABASE_URL
const PLATFORM_PW = "m14-platform-credential-local-only"
const WORLD = "living-forest"
const STUB_ATTACH = "/stub/world-entry/stream/attach"
const mig = (f: string) => readFileSync(path.join(here, "../../supabase/migrations", f), "utf8")

if (!url) {
  test("M14-B4 attachment browser proof (skipped: WORLD_CONSUMER_TEST_DATABASE_URL not set)", { skip: true }, () => {})
} else {
  assertLocalUrl(url)
  const dbName = `m14b4_browser_${Date.now()}`
  let su: pg.Client, owner: pg.Client, db: PgEntryAuthorityDb
  let platform: http.Server, attacker: http.Server, PLATFORM = "", ATTACKER = "", browser: Browser
  let rt: ReferenceRuntime, instanceId = ""
  const events: RuntimeEvent[] = []
  const relay = new StubAttachmentRelay()
  const facts = createLivingForestFixtureFactSource()
  const bodies: string[] = [] // every response body the browser received from stream/attach endpoints
  const seen: { path: string; origin: string | null; status: number }[] = []
  const evidence: Record<string, unknown> = {}

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
  async function send(res: http.ServerResponse, out: Response): Promise<string> {
    const buf = Buffer.from(await out.arrayBuffer())
    res.writeHead(out.status, Object.fromEntries(out.headers))
    res.end(buf)
    return buf.toString("utf8")
  }
  const toRequest = (req: http.IncomingMessage, body: Buffer) => {
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v)
    return new Request(`${PLATFORM}${req.url}`, { method: req.method, headers, body: req.method === "GET" ? undefined : new Uint8Array(body) })
  }

  before(async () => {
    ;({ su, owner } = await createSupabaseShapedDb(url, dbName, { through040: true }))
    await owner.query(mig("043_world_stream_capability_authority.sql"))
    await owner.query(mig("044_world_stream_attachment_authority.sql"))
    await owner.query(`ALTER ROLE worldk_platform_entry_preview LOGIN PASSWORD '${scramVerifier(PLATFORM_PW)}'`)
    db = new PgEntryAuthorityDb(urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW), { allowLocal: true, ssl: false })
    platform = await serve(async (req, body, res) => {
      const p = new URL(req.url ?? "/", "http://x").pathname
      if (req.method === "GET" && p.startsWith(HANDOFF_PATH_PREFIX)) return void (await send(res, await handleHandoff(p.slice(HANDOFF_PATH_PREFIX.length), { db })))
      if (req.method === "GET" && p === SESSION_PATH) return void (await send(res, await handleSessionView(toRequest(req, body), { db })))
      if (req.method === "GET" && p === STREAM_PAGE_PATH) return void (await send(res, await handleStreamPage(toRequest(req, body), { db })))
      if (req.method === "POST" && [STREAM_CAPABILITY_PATH, STREAM_AUTHORIZE_PATH, STUB_ATTACH].includes(p)) {
        const r = toRequest(req, body)
        const out = p === STREAM_CAPABILITY_PATH ? await handleStreamCapabilityIssue(r, { db }) : p === STREAM_AUTHORIZE_PATH ? await handleStreamAuthorize(r, { db }) : await handleStubAttach(r, { db, relay })
        bodies.push(await send(res, out))
        seen.push({ path: p, origin: r.headers.get("origin"), status: out.status })
        return
      }
      res.writeHead(404)
      res.end()
    })
    PLATFORM = `http://localhost:${(platform.address() as AddressInfo).port}`
    attacker = await serve(async (_q, _b, res) => { res.writeHead(200, { "content-type": "text/html" }); res.end("<!doctype html><p>elsewhere</p>") })
    ATTACKER = `http://127.0.0.1:${(attacker.address() as AddressInfo).port}`

    instanceId = randomUUID()
    const cred = newRuntimeCredential()
    await owner.query("SELECT world_runtime_register_instance($1, $2, $3, $4)", [instanceId, WORLD, "m14b4-browser", 4])
    await owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [cred.credentialId, instanceId, cred.sha256, 3600])
    const post: IngressTransport["post"] = async (op, b) => {
      const res = await handleRuntimeIngress(new Request(`${PLATFORM}/api/runtime/v1/${op}`, { method: "POST", headers: { authorization: `Bearer ${cred.bearer}`, "content-type": "application/json" }, body: JSON.stringify(b) }), op, { db, mode: "FIXTURE_PREVIEW", facts })
      return { status: res.status, body: (await res.json()) as Record<string, unknown> }
    }
    // The renderer registers its claimed sessions with the (stub) relay.
    rt = new ReferenceRuntime({ post }, { autoJoin: false, onEvent: (e) => {
      events.push(e)
      if (e.kind === "CLAIMED") relay.register(e.sessionId, (auth) => rt.attachStream(e.sessionId, auth))
    } })
    browser = await chromium.launch()
  })

  after(async () => {
    if (process.env.M14B4_BROWSER_EVIDENCE_FILE) writeFileSync(process.env.M14B4_BROWSER_EVIDENCE_FILE, JSON.stringify(evidence, null, 2) + "\n")
    await browser?.close()
    await new Promise((r) => platform?.close(r))
    await new Promise((r) => attacker?.close(r))
    await db?.end()
    await owner?.end()
    await su?.end()
  })

  test("B4 browser: claim -> authorize -> stub attach via the allocated renderer -> ATTACHED -> ARRIVAL; no renderer identity reaches the browser; cross-site refused", async () => {
    const subject = randomUUID()
    await su.query("INSERT INTO auth.users (id) VALUES ($1)", [subject])
    await rt.poll()
    const res = await handleWorldEntryRequest(new Request(`${PLATFORM}/api/worlds/${WORLD}/entry`, { method: "POST", body: JSON.stringify({
      schemaVersion: "1.0", contract: "world-entry-intent", intentId: randomUUID(), worldId: WORLD, requestedPlaceId: null, narrativeContext: null,
      client: { surface: "WEB", capabilities: { webgl2: true, touchPrimary: false, viewportClass: "EXPANDED", reducedMotion: false } },
    }) }), WORLD, async () => ({ subjectId: subject }), { mode: "FIXTURE_PREVIEW", ledger, db, handoffOrigin: PLATFORM })
    const entry = JSON.parse(await res.text()) as WorldEntryResult
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(entry.handoff!.href)
    await page.goto(`${PLATFORM}${STREAM_PAGE_PATH}`)

    const flow = (capPath: string, authPath: string, attachPath: string) => page.evaluate(async ([c, a, t]) => {
      const h = { "content-type": "application/json" }
      const cap = await fetch(c, { method: "POST", headers: h, body: "{}" })
      if (cap.status !== 201) return { step: "capability", status: cap.status }
      const cj = await cap.json()
      const au = await fetch(a, { method: "POST", headers: h, body: JSON.stringify({ capability: cj.capability, worldId: cj.worldId }) })
      const aj = await au.json()
      const at = await fetch(t, { method: "POST", headers: h, body: JSON.stringify({ authorization: aj.authorization }) })
      const replay = await fetch(t, { method: "POST", headers: h, body: JSON.stringify({ authorization: aj.authorization }) })
      return { step: "attach", status: at.status, body: await at.json(), replay: replay.status }
    }, [capPath, authPath, attachPath])

    // Before the renderer claims: not stream-eligible.
    assert.deepEqual(await flow(STREAM_CAPABILITY_PATH, STREAM_AUTHORIZE_PATH, STUB_ATTACH), { step: "capability", status: 403 })
    await rt.step() // the allocated renderer claims (no join yet)
    const sess = (await su.query("SELECT * FROM world_runtime_sessions WHERE subject_id = $1", [subject])).rows[0]
    assert.ok(sess.claimed_at)
    assert.equal(sess.joined_at, null)

    const mark = seen.length
    const r = await flow(STREAM_CAPABILITY_PATH, STREAM_AUTHORIZE_PATH, STUB_ATTACH)
    assert.deepEqual(r, { step: "attach", status: 200, body: { status: "ATTACHED" }, replay: 403 })
    for (const s of seen.slice(mark)) assert.equal(s.origin, PLATFORM, "Chromium sent the real Origin")
    const att = (await su.query("SELECT * FROM world_stream_attachments WHERE session_id = $1", [sess.session_id])).rows[0]
    assert.equal(att.instance_id, instanceId, "the ALLOCATED renderer attached")
    assert.equal((await su.query("SELECT count(*) n FROM world_visit_presence WHERE subject_id = $1", [subject])).rows[0].n, "0", "attach is not arrival")

    // Media joined -> ARRIVAL.
    assert.equal(await rt.join(sess.session_id), "VISIT_OPENED")
    await page.goto(`${PLATFORM}${SESSION_PATH}`)
    assert.match(await page.content(), /You are in /)

    // Nothing the browser received names the renderer, session, process, host or port.
    const all = bodies.join("\n") + (await page.content())
    for (const id of [instanceId, sess.session_id, sess.allocation_id, sess.visit_id, subject]) assert.ok(!all.includes(id), `browser saw ${id}`)
    assert.doesNotMatch(bodies.join("\n"), /instance|renderer|process|gpu|host|port|127\.0\.0\.1|localhost/i)

    // Cross-site: a CORS-preflighted fetch from another origin never reaches the relay.
    const atkMark = seen.length
    await page.goto(ATTACKER)
    const cross = await page.evaluate(async ([p, t]) => {
      try {
        const x = await fetch(p + t, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ authorization: "A".repeat(43) }) })
        return String(x.status)
      } catch {
        return "BLOCKED"
      }
    }, [PLATFORM, STUB_ATTACH])
    assert.equal(cross, "BLOCKED")
    assert.equal(seen.length, atkMark, "never reached the Platform")
    assert.equal(Number((await su.query("SELECT count(*) n FROM world_stream_attachments")).rows[0].n), 1)
    await ctx.close()
    evidence.browser = { chromium: browser.version(), preClaim: 403, attach: r, attachedByAllocatedRenderer: true, arrivalAfterAttach: "VISIT_OPENED", crossSite: cross, browserBodies: bodies.map((b) => JSON.parse(b)).map((b) => Object.keys(b).sort()) }
  })
}
