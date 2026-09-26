// WORLDK-M14-A3 browser regression: the gateway Leave boundary as a REAL
// browser exercises it (Origin / Sec-Fetch-Site are produced by Chromium,
// never hand-set). Regression for PLATFORM_GATEWAY_LEAVE_ORIGIN_NULL: under
// "Referrer-Policy: no-referrer" Chromium sends `Origin: null` on the
// same-origin Leave POST and the gateway refused every legitimate Leave.
//
// The real gateway and runtime-ingress handlers run behind a local HTTP
// server on http://localhost:<port> (the Platform origin); a second server on
// http://127.0.0.1:<port> plays an unapproved cross-site origin. The authority
// database is an in-memory model bound by the session capability's hash, as
// world_entry_session_request_leave is.
//
//   node --experimental-strip-types --test lib/worldEntry/gatewayLeave.browser.test.ts
import { after, before, test } from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import http from "node:http"
import type { AddressInfo } from "node:net"
import { chromium, type Browser, type BrowserContext } from "@playwright/test"
import { createLivingForestFixtureFactSource } from "../worldConsumer/facts.ts"
import { EntryAuthorityError, type EntryAuthorityDb } from "./authorityDb.ts"
import { newRuntimeCredential, newTicket } from "./credentials.ts"
import { handleHandoff, handleLeave, handleSessionView, LEAVE_PATH, SESSION_PATH } from "./gateway.ts"
import { handleRuntimeIngress } from "./runtimeIngress.ts"

type Session = { subject: string; leave: boolean; ended: boolean }
const tickets = new Map<string, string>() // ticket sha -> subject
const sessions = new Map<string, Session>() // view sha -> session
const leaveRequests: string[] = [] // subjects, in order
const hex = (b: Buffer) => b.toString("hex")

const db: EntryAuthorityDb = {
  resolve: async () => { throw new Error("unused") },
  async redeemTicket(ticketSha, viewSha) {
    const subject = tickets.get(hex(ticketSha))
    if (!subject) throw new EntryAuthorityError("TICKET_INVALID")
    tickets.delete(hex(ticketSha))
    sessions.set(hex(viewSha), { subject, leave: false, ended: false })
    return { outcome: "REDEEMED", sessionId: randomUUID(), worldId: "living-forest" }
  },
  async sessionView(viewSha) {
    const s = sessions.get(hex(viewSha))
    if (!s) throw new EntryAuthorityError("SESSION_NOT_FOUND")
    return { state: s.ended ? "LEFT" : s.leave ? "LEAVING" : "IN_WORLD", worldId: "living-forest" }
  },
  async requestLeave(viewSha) {
    const s = sessions.get(hex(viewSha))
    if (!s) throw new EntryAuthorityError("SESSION_NOT_FOUND")
    s.leave = true
    leaveRequests.push(s.subject)
  },
  runtimePoll: async () => { throw new EntryAuthorityError("RUNTIME_CREDENTIAL_INVALID") },
  runtimeClaim: async () => { throw new EntryAuthorityError("RUNTIME_CREDENTIAL_INVALID") },
  runtimeArrival: async () => { throw new EntryAuthorityError("RUNTIME_CREDENTIAL_INVALID") },
  runtimePresence: async () => { throw new EntryAuthorityError("RUNTIME_CREDENTIAL_INVALID") },
  // No credential in this model is valid: every departure is a forgery.
  runtimeDeparture: async () => { throw new EntryAuthorityError("RUNTIME_CREDENTIAL_INVALID") },
  runtimeDisconnect: async () => { throw new EntryAuthorityError("RUNTIME_CREDENTIAL_INVALID") },
  sweep: async () => 0,
}
const facts = createLivingForestFixtureFactSource()

const leaveStatuses: number[] = []
let platform: http.Server, attacker: http.Server, PLATFORM = "", ATTACKER = "", browser: Browser

function serve(handler: (req: http.IncomingMessage, body: Buffer, res: http.ServerResponse) => Promise<void>): Promise<http.Server> {
  const srv = http.createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on("data", (c) => chunks.push(c))
    req.on("end", () => void handler(req, Buffer.concat(chunks), res).catch(() => { res.statusCode = 500; res.end() }))
  })
  return new Promise((r) => srv.listen(0, "127.0.0.1", () => r(srv)))
}
async function send(res: http.ServerResponse, out: Response) {
  res.writeHead(out.status, Object.fromEntries(out.headers))
  res.end(Buffer.from(await out.arrayBuffer()))
}
const form = (action: string, policy: string) =>
  new Response(`<!doctype html><form method="post" action="${action}"><button type="submit">Leave</button></form>`, { headers: { "content-type": "text/html", "referrer-policy": policy } })

before(async () => {
  platform = await serve(async (req, body, res) => {
    const url = `${PLATFORM}${req.url}`
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v)
    const request = new Request(url, { method: req.method, headers, body: req.method === "POST" ? new Uint8Array(body) : undefined })
    const p = new URL(url).pathname
    if (req.method === "GET" && p.startsWith("/world-entry/h/")) return send(res, await handleHandoff(p.slice("/world-entry/h/".length), { db }))
    if (req.method === "GET" && p === SESSION_PATH) return send(res, await handleSessionView(request, { db }))
    if (req.method === "POST" && p === LEAVE_PATH) {
      const out = await handleLeave(request, { db })
      leaveStatuses.push(out.status)
      return send(res, out)
    }
    if (req.method === "POST" && p.startsWith("/api/runtime/v1/")) return send(res, await handleRuntimeIngress(request, p.split("/").pop()!, { db, mode: "FIXTURE_PREVIEW", facts }))
    // Same-origin test page that still uses the OLD policy: proves Origin:null stays refused.
    if (p === "/test/no-referrer-leave") return send(res, form(LEAVE_PATH, "no-referrer"))
    res.statusCode = 404
    res.end()
  })
  PLATFORM = `http://localhost:${(platform.address() as AddressInfo).port}`
  attacker = await serve(async (req, _b, res) => {
    const policy = new URL(`http://x${req.url}`).searchParams.get("policy") ?? "strict-origin-when-cross-origin"
    return send(res, form(`${PLATFORM}${LEAVE_PATH}`, policy))
  })
  ATTACKER = `http://127.0.0.1:${(attacker.address() as AddressInfo).port}`
  browser = await chromium.launch({ headless: true })
})
after(async () => {
  await browser?.close()
  platform?.close()
  attacker?.close()
})

/** A visitor whose browser redeemed its own ticket and sits on the status page. */
async function visitorInWorld(subject: string): Promise<BrowserContext> {
  const ticket = newTicket()
  tickets.set(hex(ticket.sha256), subject)
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(`${PLATFORM}/world-entry/h/${ticket.secret}`)
  assert.equal(new URL(page.url()).pathname, SESSION_PATH)
  assert.match(await page.textContent("body") ?? "", /You are in Living Forest/)
  return ctx
}
async function submitLeave(ctx: BrowserContext, pageUrl: string) {
  const before = leaveStatuses.length
  const page = await ctx.newPage()
  await page.goto(pageUrl)
  await Promise.all([page.waitForLoadState("load"), page.click("button[type=submit]")])
  for (let i = 0; leaveStatuses.length === before && i < 50; i++) await new Promise((r) => setTimeout(r, 100))
  const status = leaveStatuses.at(-1)
  await page.close()
  return status
}

const A = randomUUID()
const B = randomUUID()

test("browser: Origin:null (a no-referrer document) stays refused and records nothing", async () => {
  const ctx = await visitorInWorld(randomUUID())
  const n = leaveRequests.length
  assert.equal(await submitLeave(ctx, `${PLATFORM}/test/no-referrer-leave`), 403)
  assert.equal(leaveRequests.length, n)
  await ctx.close()
})

test("browser: an unapproved cross-site origin cannot request Leave (with or without a referrer)", async () => {
  const ctx = await visitorInWorld(randomUUID())
  const n = leaveRequests.length
  assert.equal(await submitLeave(ctx, `${ATTACKER}/`), 403)
  assert.equal(await submitLeave(ctx, `${ATTACKER}/?policy=no-referrer`), 403)
  assert.equal(await submitLeave(ctx, `${ATTACKER}/?policy=unsafe-url`), 403)
  assert.equal(leaveRequests.length, n)
  await ctx.close()
})

test("browser: a visitor session cannot forge runtime departure evidence", async () => {
  const ctx = await visitorInWorld(A)
  const body = { receiptId: randomUUID(), sessionId: randomUUID(), worldId: "living-forest" }
  const noBearer = await ctx.request.post(`${PLATFORM}/api/runtime/v1/departure`, { data: body })
  assert.equal(noBearer.status(), 401)
  const forged = await ctx.request.post(`${PLATFORM}/api/runtime/v1/departure`, { data: body, headers: { authorization: `Bearer ${newRuntimeCredential().bearer}` } })
  assert.equal(forged.status(), 401)
  assert.deepEqual(await forged.json(), { error: "RUNTIME_UNAUTHORIZED" })
  assert.ok([...sessions.values()].every((s) => !s.ended))
  await ctx.close()
})

test("browser: the legitimate same-origin Leave is accepted and binds only to the presenting visitor's session", async () => {
  const a = await visitorInWorld(A)
  const b = await visitorInWorld(B)
  const n = leaveRequests.length
  const page = await a.newPage()
  const view = await page.goto(`${PLATFORM}${SESSION_PATH}`)
  await Promise.all([page.waitForURL(`${PLATFORM}${SESSION_PATH}`), page.click("button:has-text('Leave Living Forest')")])
  assert.equal(leaveStatuses.at(-1), 303, "the browser's own same-origin Leave POST is accepted")
  assert.equal(view?.headers()["referrer-policy"], "same-origin")
  assert.deepEqual(leaveRequests.slice(n), [A], "exactly A's session, never B's")
  assert.match(await page.textContent("body") ?? "", /Leaving Living Forest/)
  const bPage = await b.newPage()
  await bPage.goto(`${PLATFORM}${SESSION_PATH}`)
  assert.match(await bPage.textContent("body") ?? "", /You are in Living Forest/, "B is unaffected by A's Leave")
  // A browser with no session capability cannot leave anyone's session.
  const anon = await browser.newContext()
  const ap = await anon.newPage()
  await ap.goto(`${PLATFORM}/test/no-referrer-leave`) // warm the origin; then a same-origin POST without a capability
  const res = await ap.request.post(`${PLATFORM}${LEAVE_PATH}`, { headers: { origin: PLATFORM, "sec-fetch-site": "same-origin" } })
  assert.equal(res.status(), 404)
  assert.deepEqual(leaveRequests.slice(n), [A])
  await Promise.all([a.close(), b.close(), anon.close()])
})
