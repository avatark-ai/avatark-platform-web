// WORLDK-M14-B3 browser certification: the stream capability flow as a REAL
// browser exercises it (Origin / Sec-Fetch-Site / cookies are produced by
// Chromium, never hand-set), against the real gateway + stream handlers and
// the real 043 authority on a disposable Postgres.
//
// http://localhost:<port> plays the Platform gateway origin; a second server on
// http://127.0.0.1:<port> plays a cross-site attacker. The reference runtime
// drives ARRIVAL / DEPARTURE in-process through the real Runtime Ingress
// handler. Mutant: a same-origin FORM POST from a page under Referrer-Policy
// no-referrer makes Chromium send `Origin: null` (the M14-A3 Leave defect),
// which strict validation must refuse. Recorded observation: under the same
// policy Chromium still sends the real Origin on a same-origin fetch() POST, so
// the stub page's "same-origin" policy is defence in depth, not load-bearing.
//
// Requires WORLD_CONSUMER_TEST_DATABASE_URL (superuser URL, DISPOSABLE local
// server). Skipped visibly when unset.
//
//   node --experimental-strip-types --test lib/worldEntry/streamCapability.browser.test.ts
import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import http from "node:http"
import type { AddressInfo } from "node:net"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test"
import type { WorldEntryResult } from "@avatark/world-consumer-contracts"
import { createLivingForestFixtureFactSource } from "../worldConsumer/facts.ts"
import type { ContinuityRecord, VisitorContinuityLedger } from "../worldConsumer/continuityLedger.ts"
import { assertLocalUrl, createSupabaseShapedDb, urlFor } from "../worldConsumer/testing/supabaseShapedDb.ts"
import { PgEntryAuthorityDb } from "./authorityDb.ts"
import { newRuntimeCredential, sha256 } from "./credentials.ts"
import { handleHandoff, handleLeave, handleSessionView, LEAVE_PATH, SESSION_PATH } from "./gateway.ts"
import { ReferenceRuntime, type IngressTransport } from "./referenceRuntime.ts"
import { handleWorldEntryRequest, HANDOFF_PATH_PREFIX } from "./resolver.ts"
import { handleRuntimeIngress } from "./runtimeIngress.ts"
import { handleStreamAuthorize, handleStreamCapabilityIssue, handleStreamPage, STREAM_AUTHORIZE_PATH, STREAM_CAPABILITY_PATH, STREAM_PAGE_PATH } from "./streamCapability.ts"
import { scramVerifier } from "../../scripts/worldk-m14-runtime-registry.ts"

const here = path.dirname(fileURLToPath(import.meta.url))
const url = process.env.WORLD_CONSUMER_TEST_DATABASE_URL
const PLATFORM_PW = "m14-platform-credential-local-only"
const WORLD = "living-forest"
const MUTANT_PAGE = "/mutant/no-referrer/world-entry/stream"
const MUTANT_FORM = "/mutant/no-referrer/form"

if (!url) {
  test("M14-B3 stream capability browser proof (skipped: WORLD_CONSUMER_TEST_DATABASE_URL not set)", { skip: true }, () => {})
} else {
  assertLocalUrl(url)
  const dbName = `m14b3_browser_${Date.now()}`
  let su: pg.Client, owner: pg.Client, db: PgEntryAuthorityDb
  let platform: http.Server, attacker: http.Server, PLATFORM = "", ATTACKER = "", browser: Browser
  let rt: ReferenceRuntime
  const facts = createLivingForestFixtureFactSource()
  /** Every stream POST the Platform origin received: what Chromium sent and what it got. */
  const seen: { path: string; origin: string | null; site: string | null; cookie: boolean; status: number }[] = []
  const plaintexts: string[] = []
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
  async function send(res: http.ServerResponse, out: Response): Promise<Buffer> {
    const buf = Buffer.from(await out.arrayBuffer())
    res.writeHead(out.status, Object.fromEntries(out.headers))
    res.end(buf)
    return buf
  }
  const toRequest = (req: http.IncomingMessage, body: Buffer, pathOverride?: string) => {
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v)
    return new Request(`${PLATFORM}${pathOverride ?? req.url}`, { method: req.method, headers, body: req.method === "GET" || req.method === "HEAD" ? undefined : new Uint8Array(body) })
  }

  const enter = async (subjectId: string) => {
    const res = await handleWorldEntryRequest(
      new Request(`${PLATFORM}/api/worlds/${WORLD}/entry`, { method: "POST", body: JSON.stringify({
        schemaVersion: "1.0", contract: "world-entry-intent", intentId: randomUUID(), worldId: WORLD, requestedPlaceId: null, narrativeContext: null,
        client: { surface: "WEB", capabilities: { webgl2: true, touchPrimary: false, viewportClass: "EXPANDED", reducedMotion: false } },
      }) }),
      WORLD, async () => ({ subjectId }), { mode: "FIXTURE_PREVIEW", ledger, db, handoffOrigin: PLATFORM },
    )
    const r = JSON.parse(await res.text()) as WorldEntryResult
    assert.equal(r.outcome, "READY", JSON.stringify(r))
    return r.handoff!.href
  }
  const capCount = async () => Number((await su.query("SELECT count(*) n FROM world_stream_capabilities")).rows[0].n)
  const clickAuthorize = async (page: Page) => {
    await page.click("#go")
    await page.waitForFunction(() => ["AUTHORIZED", "REFUSED"].includes(document.getElementById("out")?.dataset.result ?? ""), null, { timeout: 10_000 })
    return page.$eval("#out", (e) => (e as HTMLElement).dataset.result)
  }

  before(async () => {
    ;({ su, owner } = await createSupabaseShapedDb(url, dbName, { through040: true }))
    await owner.query(readFileSync(path.join(here, "../../supabase/migrations/043_world_stream_capability_authority.sql"), "utf8"))
    await owner.query(`ALTER ROLE worldk_platform_entry_preview LOGIN PASSWORD '${scramVerifier(PLATFORM_PW)}'`)
    db = new PgEntryAuthorityDb(urlFor(url, dbName, "worldk_platform_entry_preview", PLATFORM_PW), { allowLocal: true, ssl: false })

    platform = await serve(async (req, body, res) => {
      const p = new URL(req.url ?? "/", "http://x").pathname
      if (req.method === "GET" && p.startsWith(HANDOFF_PATH_PREFIX)) return void (await send(res, await handleHandoff(p.slice(HANDOFF_PATH_PREFIX.length), { db })))
      if (req.method === "GET" && p === SESSION_PATH) return void (await send(res, await handleSessionView(toRequest(req, body), { db })))
      if (req.method === "POST" && p === LEAVE_PATH) return void (await send(res, await handleLeave(toRequest(req, body), { db })))
      if (req.method === "GET" && p === STREAM_PAGE_PATH) return void (await send(res, await handleStreamPage(toRequest(req, body), { db })))
      if (req.method === "GET" && p === MUTANT_PAGE) {
        const out = await handleStreamPage(toRequest(req, body, STREAM_PAGE_PATH), { db })
        const headers = new Headers(out.headers)
        headers.set("referrer-policy", "no-referrer")
        return void (await send(res, new Response(await out.text(), { status: out.status, headers })))
      }
      if (req.method === "GET" && p === MUTANT_FORM) {
        res.writeHead(200, { "content-type": "text/html", "referrer-policy": "no-referrer" })
        return void res.end(`<!doctype html><form id="m" method="post" action="${STREAM_CAPABILITY_PATH}" enctype="text/plain"><input name='{"a":"' value='"}'></form>`)
      }
      if (req.method === "POST" && (p === STREAM_CAPABILITY_PATH || p === STREAM_AUTHORIZE_PATH)) {
        const r = toRequest(req, body)
        const out = p === STREAM_CAPABILITY_PATH ? await handleStreamCapabilityIssue(r, { db }) : await handleStreamAuthorize(r, { db })
        const buf = await send(res, out)
        const j = JSON.parse(buf.toString("utf8")) as Record<string, unknown>
        for (const k of ["capability", "authorization"]) if (typeof j[k] === "string") plaintexts.push(j[k] as string)
        seen.push({ path: p, origin: r.headers.get("origin"), site: r.headers.get("sec-fetch-site"), cookie: /__Host-wk-entry=/.test(r.headers.get("cookie") ?? ""), status: out.status })
        return
      }
      res.writeHead(404, { "content-type": "text/plain" })
      res.end("not found")
    })
    PLATFORM = `http://localhost:${(platform.address() as AddressInfo).port}`
    attacker = await serve(async (_req, _body, res) => {
      res.writeHead(200, { "content-type": "text/html" })
      res.end(`<!doctype html><body>
<form id="f" method="post" action="${PLATFORM}${STREAM_AUTHORIZE_PATH}" enctype="text/plain"><input name='{"capability":"${"A".repeat(43)}","worldId":"living-forest","x":"' value='"}'></form>
<form id="g" method="post" action="${PLATFORM}${STREAM_CAPABILITY_PATH}" enctype="text/plain"><input name='{"a":"' value='"}'></form></body>`)
    })
    ATTACKER = `http://127.0.0.1:${(attacker.address() as AddressInfo).port}`

    const instanceId = randomUUID()
    const cred = newRuntimeCredential()
    await owner.query("SELECT world_runtime_register_instance($1, $2, $3, $4)", [instanceId, WORLD, "m14b3-browser", 4])
    await owner.query("SELECT world_runtime_issue_credential($1, $2, $3, $4)", [cred.credentialId, instanceId, cred.sha256, 3600])
    const post: IngressTransport["post"] = async (op, b) => {
      const res = await handleRuntimeIngress(
        new Request(`${PLATFORM}/api/runtime/v1/${op}`, { method: "POST", headers: { authorization: `Bearer ${cred.bearer}`, "content-type": "application/json" }, body: JSON.stringify(b) }),
        op, { db, mode: "FIXTURE_PREVIEW", facts },
      )
      return { status: res.status, body: (await res.json()) as Record<string, unknown> }
    }
    rt = new ReferenceRuntime({ post })
    browser = await chromium.launch()
  })

  after(async () => {
    if (process.env.M14B3_BROWSER_EVIDENCE_FILE) writeFileSync(process.env.M14B3_BROWSER_EVIDENCE_FILE, JSON.stringify(evidence, null, 2) + "\n")
    await browser?.close()
    await new Promise((r) => platform?.close(r))
    await new Promise((r) => attacker?.close(r))
    await db?.end()
    await owner?.end()
    await su?.end()
  })

  test("B3 browser: handoff -> IN_WORLD -> stub page authorizes once; replay / race / Origin-null mutant / cross-site / departed all refused", async () => {
    const subject = randomUUID()
    await su.query("INSERT INTO auth.users (id) VALUES ($1)", [subject])
    await rt.poll()
    const ctx: BrowserContext = await browser.newContext()
    const page = await ctx.newPage()

    // Before arrival (WAITING) the page refuses.
    await page.goto(await enter(subject))
    assert.equal(new URL(page.url()).pathname, SESSION_PATH)
    await page.goto(`${PLATFORM}${STREAM_PAGE_PATH}`)
    assert.equal(await clickAuthorize(page), "REFUSED", "WAITING is not IN_WORLD")

    // Runtime claims + ARRIVAL -> IN_WORLD; the stub page authorizes.
    await rt.step()
    await page.goto(`${PLATFORM}${SESSION_PATH}`)
    assert.match(await page.content(), /You are in /)
    await page.goto(`${PLATFORM}${STREAM_PAGE_PATH}`)
    const mark = seen.length
    assert.equal(await clickAuthorize(page), "AUTHORIZED")
    const flow = seen.slice(mark)
    assert.deepEqual(flow.map((s) => [s.path, s.status]), [[STREAM_CAPABILITY_PATH, 201], [STREAM_AUTHORIZE_PATH, 200]])
    for (const s of flow) {
      assert.equal(s.origin, PLATFORM, "Chromium sent the real Origin")
      assert.equal(s.site, "same-origin")
      assert.equal(s.cookie, true)
    }
    const dom = await page.content()
    for (const p of plaintexts) assert.ok(!dom.includes(p), "capability/authorization never reaches the DOM")

    // Replay and a concurrent double redemption from the page's own origin.
    const race = await page.evaluate(async ([capPath, authPath]) => {
      const h = { "content-type": "application/json" }
      const c = await (await fetch(capPath, { method: "POST", headers: h, body: "{}" })).json()
      const body = JSON.stringify({ capability: c.capability, worldId: c.worldId })
      const both = await Promise.all([fetch(authPath, { method: "POST", headers: h, body }), fetch(authPath, { method: "POST", headers: h, body })])
      const replay = await fetch(authPath, { method: "POST", headers: h, body })
      return { race: both.map((r) => r.status).sort(), replay: replay.status }
    }, [STREAM_CAPABILITY_PATH, STREAM_AUTHORIZE_PATH])
    assert.deepEqual(race, { race: [200, 403], replay: 403 })

    // Observation: under no-referrer Chromium still sends the real Origin on a
    // same-origin fetch() POST (only form navigations serialize it as "null").
    const before = await capCount()
    await page.goto(`${PLATFORM}${MUTANT_PAGE}`)
    const fetchMark = seen.length
    const noReferrerFetch = await clickAuthorize(page)
    const noRefFetchSeen = seen.slice(fetchMark).map((s) => ({ path: s.path, origin: s.origin === PLATFORM ? "PLATFORM" : s.origin, status: s.status }))
    // Mutant: a same-origin FORM POST under no-referrer -> Chromium sends Origin: null -> refused, nothing issued.
    const beforeNull = await capCount()
    await page.goto(`${PLATFORM}${MUTANT_FORM}`)
    const mutMark = seen.length
    await Promise.all([page.waitForNavigation(), page.$eval("#m", (f) => (f as HTMLFormElement).submit())])
    const mut = seen.slice(mutMark)
    assert.deepEqual(mut.map((s) => [s.path, s.origin, s.site, s.status]), [[STREAM_CAPABILITY_PATH, "null", "same-origin", 403]])
    assert.equal(await capCount(), beforeNull, "Origin: null issued nothing")

    // Cross-site attacker: CORS-preflighted fetches never reach the handlers; text/plain form POSTs are refused.
    const atkMark = seen.length
    await page.goto(ATTACKER)
    const fetched = await page.evaluate(async ([p, capPath, authPath]) => {
      const out: string[] = []
      for (const [u, b] of [[capPath, "{}"], [authPath, JSON.stringify({ capability: "A".repeat(43), worldId: "living-forest" })]]) {
        try {
          const r = await fetch(p + u, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: b })
          out.push(String(r.status))
        } catch {
          out.push("BLOCKED")
        }
      }
      return out
    }, [PLATFORM, STREAM_CAPABILITY_PATH, STREAM_AUTHORIZE_PATH])
    assert.deepEqual(fetched, ["BLOCKED", "BLOCKED"])
    for (const id of ["f", "g"]) {
      await page.goto(ATTACKER)
      await Promise.all([page.waitForNavigation(), page.$eval(`#${id}`, (f) => (f as HTMLFormElement).submit())])
    }
    const atk = seen.slice(atkMark)
    assert.equal(atk.length, 2, "only the two form POSTs reached the Platform")
    for (const s of atk) {
      assert.equal(s.origin, ATTACKER)
      assert.equal(s.site, "cross-site")
      assert.equal(s.cookie, false, "SameSite=Lax keeps the session cookie off cross-site POSTs")
      assert.equal(s.status, 403)
    }
    assert.equal(await capCount(), before + 1, "only the no-referrer fetch observation issued (and consumed) one")

    // Departure: Leave through the gateway, runtime evidences it; the page now refuses.
    await page.goto(`${PLATFORM}${SESSION_PATH}`)
    await Promise.all([page.waitForNavigation(), page.click("button[type=submit]")])
    await rt.step()
    await page.goto(`${PLATFORM}${SESSION_PATH}`)
    assert.match(await page.content(), /You have left/)
    await page.goto(`${PLATFORM}${STREAM_PAGE_PATH}`)
    assert.equal(await clickAuthorize(page), "REFUSED")

    // Plaintext never persisted.
    const tables = (await su.query("SELECT schemaname s, tablename t FROM pg_tables WHERE schemaname IN ('public','auth')")).rows
    let hits = 0
    for (const t of tables) {
      const blob = (await su.query(`SELECT x::text v FROM ${pg.escapeIdentifier(t.s)}.${pg.escapeIdentifier(t.t)} x`)).rows.map((r) => r.v).join("\n")
      for (const p of plaintexts) if (blob.includes(p)) hits++
    }
    assert.equal(hits, 0)
    assert.ok(Number((await su.query("SELECT count(*) n FROM world_stream_capabilities WHERE capability_sha256 = ANY($1)", [plaintexts.map((p) => sha256(p))])).rows[0].n) >= 2)
    await ctx.close()
    evidence.browser = { chromium: browser.version(), flow: flow.map((f) => ({ ...f, origin: f.origin === PLATFORM ? "PLATFORM" : f.origin })), race, noReferrerFetch: { result: noReferrerFetch, seen: noRefFetchSeen }, originNullFormMutant: mut, attackerFetch: fetched, attackerForms: atk.map((s) => ({ ...s, origin: "ATTACKER" })), plaintextsChecked: plaintexts.length, plaintextHits: hits }
  })
}
