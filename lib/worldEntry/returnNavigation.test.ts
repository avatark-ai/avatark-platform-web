// WORLDK-RETURN-NAV-01: return navigation on the Platform handoff gateway's
// exit pages. Matrix T1–T8 (see _claude_reports/WORLDK_RETURN_NAV_01).
import { test } from "node:test"
import assert from "node:assert/strict"
import type { WorldBinding } from "../worldConsumer/bindings.ts"
import { LIVING_FOREST_FIXTURE_BINDING } from "../worldConsumer/bindings.ts"
import type { EntryAuthorityDb, SessionViewState } from "./authorityDb.ts"
import { newTicket } from "./credentials.ts"
import { handleHandoff, handleLeave, handleSessionView, SESSION_COOKIE, type GatewayDeps } from "./gateway.ts"
import { ALLOWED_WORLDK_CONSUMER_HOSTS, parseWorldKConsumerOrigin, WORLDK_CONSUMER_ORIGIN_ENV, worldKHomeHref, worldReturnHref } from "./returnDestination.ts"

const ORIGIN = "https://platform-preview.avatark.ai"
const WORLDK = "https://worldk-web-git-feature-worldk-m12-vercel-preview-avatark.vercel.app"
const LF_ENTER = `${WORLDK}/worlds/living-forest/enter`
const HOME = `${WORLDK}/`

function viewDb(state: SessionViewState, worldId = "living-forest"): EntryAuthorityDb {
  return {
    sessionView: async () => ({ state, worldId }),
    redeemTicket: async () => ({ outcome: "REDEEMED" }),
    requestLeave: async () => undefined,
  } as unknown as EntryAuthorityDb
}

const cookie = () => `${SESSION_COOKIE}=${newTicket().secret}`

function sessionRequest(extra: Record<string, string> = {}, query = ""): Request {
  return new Request(`${ORIGIN}/world-entry/session${query}`, { headers: { cookie: cookie(), ...extra } })
}

async function render(state: SessionViewState, deps: Partial<GatewayDeps> = {}, req: Request = sessionRequest()) {
  const res = await handleSessionView(req, { db: viewDb(state), worldkConsumerOrigin: WORLDK, ...deps })
  return { res, html: await res.text() }
}

function anchors(html: string): { href: string; text: string; raw: string }[] {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({ raw: m[0], href: /href="([^"]*)"/.exec(m[1])?.[1] ?? "", text: m[2] }))
}

test("T1: LEFT renders exactly one 'Return to Living Forest' link to the pinned Living Forest entry route", async () => {
  const { res, html } = await render("LEFT")
  assert.equal(res.status, 200)
  const a = anchors(html)
  assert.equal(a.length, 1)
  assert.equal(a[0].href, LF_ENTER)
  assert.equal(a[0].text, "Return to Living Forest")
  assert.match(a[0].raw, /class="return"/)
  assert.match(a[0].raw, /rel="noreferrer"/)
  assert.match(html, /You have left Living Forest/, "existing copy preserved")
  assert.match(html, /Return to WorldK to see what changes while you are away\./, "existing copy preserved")
  assert.doesNotMatch(html, /http-equiv="refresh"/, "no automatic redirect")
  assert.doesNotMatch(html, /<script/i, "no client-side navigation script")
})

test("T2: ENDED renders the same single link; WAITING, IN_WORLD and LEAVING render none", async () => {
  const ended = await render("ENDED")
  const a = anchors(ended.html)
  assert.equal(a.length, 1)
  assert.equal(a[0].href, LF_ENTER)
  assert.equal(a[0].text, "Return to Living Forest")
  assert.doesNotMatch(ended.html, /http-equiv="refresh"/)
  for (const state of ["WAITING", "IN_WORLD", "LEAVING"] as const) {
    const { html } = await render(state)
    assert.equal(anchors(html).length, 0, `${state} must not offer return navigation`)
    assert.doesNotMatch(html, /Return to Living Forest|Return to WorldK<\/a>/, state)
  }
  const inWorld = await render("IN_WORLD")
  assert.match(inWorld.html, /<form method="post" action="\/world-entry\/session\/leave"><button type="submit">Leave Living Forest<\/button><\/form>/, "Leave form unchanged")
})

test("T3: 404 No session and 410 Entry unavailable link to the WorldK home page", async () => {
  // 404: no cookie
  const none = await handleSessionView(new Request(`${ORIGIN}/world-entry/session`), { db: viewDb("LEFT"), worldkConsumerOrigin: WORLDK })
  assert.equal(none.status, 404)
  let a = anchors(await none.text())
  assert.equal(a.length, 1)
  assert.deepEqual([a[0].href, a[0].text], [HOME, "Return to WorldK"])
  // 404: database lookup fails
  const failing = { sessionView: async () => { throw new Error("x") } } as unknown as EntryAuthorityDb
  const f = await handleSessionView(sessionRequest(), { db: failing, worldkConsumerOrigin: WORLDK })
  assert.equal(f.status, 404)
  a = anchors(await f.text())
  assert.deepEqual(a.map((x) => [x.href, x.text]), [[HOME, "Return to WorldK"]])
  // 404: no entry authority configured
  const noDb = await handleSessionView(sessionRequest(), { db: null, worldkConsumerOrigin: WORLDK })
  assert.equal(noDb.status, 404)
  assert.deepEqual(anchors(await noDb.text()).map((x) => x.href), [HOME])
  // 404 from the leave handler (session gone)
  const leave = await handleLeave(new Request(`${ORIGIN}/world-entry/session/leave`, { method: "POST", headers: { origin: ORIGIN, "sec-fetch-site": "same-origin" } }), { db: viewDb("LEFT"), worldkConsumerOrigin: WORLDK })
  assert.equal(leave.status, 404)
  assert.deepEqual(anchors(await leave.text()).map((x) => [x.href, x.text]), [[HOME, "Return to WorldK"]])
  // 410: malformed ticket (never reaches the database), refused ticket, not redeemed
  const malformed = await handleHandoff("x", { db: viewDb("LEFT"), worldkConsumerOrigin: WORLDK })
  assert.equal(malformed.status, 410)
  assert.deepEqual(anchors(await malformed.text()).map((x) => [x.href, x.text]), [[HOME, "Return to WorldK"]])
  const refused = { redeemTicket: async () => { throw new Error("TICKET_ALREADY_REDEEMED") } } as unknown as EntryAuthorityDb
  const r = await handleHandoff(newTicket().secret, { db: refused, worldkConsumerOrigin: WORLDK })
  assert.equal(r.status, 410)
  const rHtml = await r.text()
  assert.deepEqual(anchors(rHtml).map((x) => x.href), [HOME])
  assert.doesNotMatch(rHtml, /REDEEMED|TICKET/)
  const notRedeemed = { redeemTicket: async () => ({ outcome: "EXPIRED" }) } as unknown as EntryAuthorityDb
  assert.deepEqual(anchors(await (await handleHandoff(newTicket().secret, { db: notRedeemed, worldkConsumerOrigin: WORLDK })).text()).map((x) => x.href), [HOME])
  // the 403 Refused page stays link-free
  const cross = await handleLeave(new Request(`${ORIGIN}/world-entry/session/leave`, { method: "POST", headers: { cookie: cookie(), origin: "https://evil.example", "sec-fetch-site": "cross-site" } }), { db: viewDb("LEFT"), worldkConsumerOrigin: WORLDK })
  assert.equal(cross.status, 403)
  assert.equal(anchors(await cross.text()).length, 0)
})

test("T3b: the successful handoff is still a bare 303 to the session page (no link, cookie unchanged)", async () => {
  const ok = await handleHandoff(newTicket().secret, { db: viewDb("WAITING"), worldkConsumerOrigin: WORLDK })
  assert.equal(ok.status, 303)
  assert.equal(ok.headers.get("location"), "/world-entry/session")
  assert.match(ok.headers.get("set-cookie")!, new RegExp(`^${SESSION_COOKIE}=[A-Za-z0-9_-]{43}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600$`))
  assert.equal(ok.headers.get("referrer-policy"), "no-referrer")
  assert.equal(await ok.text(), "")
})

test("T4: untrusted input cannot influence the destination (returnTo, next, Origin, Referer, cookie, Host)", async () => {
  const evil = "https://evil.example/phish"
  const probes: Request[] = [
    sessionRequest({}, `?returnTo=${encodeURIComponent(evil)}`),
    sessionRequest({}, `?next=${encodeURIComponent(evil)}&redirect=${encodeURIComponent(evil)}&return_to=//evil.example`),
    sessionRequest({ origin: "https://evil.example" }),
    sessionRequest({ referer: evil }),
    sessionRequest({ "x-forwarded-host": "evil.example", "x-forwarded-proto": "http", forwarded: "host=evil.example" }),
    new Request(`${ORIGIN}/world-entry/session`, { headers: { cookie: `${cookie()}; returnTo=${encodeURIComponent(evil)}; next=${encodeURIComponent(evil)}; ${WORLDK_CONSUMER_ORIGIN_ENV}=https://evil.example` } }),
    new Request(`https://evil.example/world-entry/session?returnTo=${encodeURIComponent(evil)}`, { headers: { cookie: cookie() } }),
  ]
  for (const state of ["LEFT", "ENDED"] as const) {
    for (const req of probes) {
      const { html } = await render(state, {}, req.clone())
      const a = anchors(html)
      assert.deepEqual(a.map((x) => x.href), [LF_ENTER], `${state} ${req.url}`)
      assert.doesNotMatch(html, /evil\.example/)
    }
  }
  for (const req of probes) {
    const res = await handleSessionView(new Request(req.url, { headers: { origin: "https://evil.example", referer: evil } }), { db: viewDb("LEFT"), worldkConsumerOrigin: WORLDK })
    assert.equal(res.status, 404)
    assert.deepEqual(anchors(await res.text()).map((x) => x.href), [HOME])
  }
  const h = await handleHandoff(`x?returnTo=${encodeURIComponent(evil)}`, { db: viewDb("LEFT"), worldkConsumerOrigin: WORLDK })
  const hHtml = await h.text()
  assert.deepEqual(anchors(hHtml).map((x) => x.href), [HOME])
  assert.doesNotMatch(hHtml, /evil\.example/)
  // the gateway never answers with a redirect to WorldK
  for (const state of ["WAITING", "IN_WORLD", "LEAVING", "LEFT", "ENDED"] as const) {
    const { res } = await render(state, {}, sessionRequest({}, `?returnTo=${encodeURIComponent(evil)}`))
    assert.equal(res.status, 200)
    assert.equal(res.headers.get("location"), null)
  }
})

test("T5: injection — slugs and names are escaped or refused; href is always https and never javascript:/data:", async () => {
  const hostile: WorldBinding = { ...LIVING_FOREST_FIXTURE_BINDING, displayName: `Forest"><script>alert(1)</script>`, slug: "living-forest" }
  const { html } = await render("LEFT", { bindings: [hostile] })
  assert.doesNotMatch(html, /<script/i)
  const a = anchors(html)
  assert.equal(a.length, 1)
  assert.equal(a[0].href, LF_ENTER)
  assert.equal(a[0].text, "Return to Forest&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;")
  for (const slug of [`living-forest"><a href="https://evil.example`, "../../evil", "living forest", "Living-Forest", "a/b", "", "-x", "x-", "%2e%2e", "javascript:alert(1)"]) {
    const b: WorldBinding = { ...LIVING_FOREST_FIXTURE_BINDING, slug }
    assert.equal(worldReturnHref(WORLDK, b), null, slug)
    const r = await render("LEFT", { bindings: [b] })
    assert.equal(anchors(r.html).length, 0, `slug ${JSON.stringify(slug)} must not produce a link`)
    assert.doesNotMatch(r.html, /evil\.example/)
  }
  for (const v of ["javascript:alert(1)", "data:text/html,x", "JAVASCRIPT://worldk-web-git-feature-worldk-m12-vercel-preview-avatark.vercel.app", "vbscript:x", "file:///etc/passwd"]) {
    assert.equal(parseWorldKConsumerOrigin(v), null, v)
  }
  for (const state of ["LEFT", "ENDED"] as const) {
    for (const x of anchors((await render(state)).html)) assert.match(x.href, /^https:\/\//)
  }
})

test("T6: security headers are unchanged by the return link", async () => {
  const expectedStatus = {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "private, no-store",
    "referrer-policy": "same-origin",
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex, nofollow",
    "x-frame-options": "DENY",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  }
  const headersOf = (r: Response) => Object.fromEntries([...r.headers.entries()].sort())
  for (const state of ["WAITING", "IN_WORLD", "LEAVING", "LEFT", "ENDED"] as const) {
    const withLink = await handleSessionView(sessionRequest(), { db: viewDb(state), worldkConsumerOrigin: WORLDK })
    const withoutLink = await handleSessionView(sessionRequest(), { db: viewDb(state), worldkConsumerOrigin: null })
    assert.deepEqual(headersOf(withLink), headersOf(withoutLink), state)
    for (const [k, v] of Object.entries(expectedStatus)) assert.equal(withLink.headers.get(k), v, `${state} ${k}`)
    assert.equal(withLink.headers.get("set-cookie"), null, `${state} sets no cookie`)
  }
  const n404 = await handleSessionView(new Request(`${ORIGIN}/world-entry/session`), { db: null, worldkConsumerOrigin: WORLDK })
  const n404plain = await handleSessionView(new Request(`${ORIGIN}/world-entry/session`), { db: null, worldkConsumerOrigin: null })
  assert.deepEqual(headersOf(n404), headersOf(n404plain))
  assert.equal(n404.headers.get("referrer-policy"), "no-referrer")
  assert.equal(n404.headers.get("x-frame-options"), "DENY")
  const g410 = await handleHandoff("x", { db: null, worldkConsumerOrigin: WORLDK })
  const g410plain = await handleHandoff("x", { db: null })
  assert.deepEqual(headersOf(g410), headersOf(g410plain))
  assert.equal(g410.headers.get("referrer-policy"), "no-referrer")
  assert.equal(g410.headers.get("cache-control"), "private, no-store")
})

test("T7: invalid or missing configuration fails closed (existing copy, no link, no throw); unknown worlds get no guessed link", async () => {
  for (const origin of [undefined, null, ""]) {
    for (const state of ["LEFT", "ENDED"] as const) {
      const { res, html } = await render(state, { worldkConsumerOrigin: origin })
      assert.equal(res.status, 200)
      assert.equal(anchors(html).length, 0)
      assert.match(html, /return to WorldK|Return to WorldK/)
    }
    assert.equal(anchors(await (await handleSessionView(new Request(`${ORIGIN}/world-entry/session`), { db: null, worldkConsumerOrigin: origin })).text()).length, 0)
    assert.equal(anchors(await (await handleHandoff("x", { db: null, worldkConsumerOrigin: origin })).text()).length, 0)
  }
  // a session for a world with no trusted binding: no world link (the fallback name is never turned into a path)
  const unknown = await handleSessionView(sessionRequest(), { db: viewDb("LEFT", "not-a-world"), worldkConsumerOrigin: WORLDK })
  const uHtml = await unknown.text()
  assert.equal(unknown.status, 200)
  assert.match(uHtml, /You left the world/)
  assert.equal(anchors(uHtml).length, 0)
  assert.equal(worldReturnHref(WORLDK, null), null)
  assert.equal(worldReturnHref(null, LIVING_FOREST_FIXTURE_BINDING), null)
  assert.equal(worldKHomeHref(null), null)
  assert.equal(worldKHomeHref(undefined), null)
})

test("T8: WORLDK_CONSUMER_ORIGIN validation — https origin only, exact allowlisted host", () => {
  assert.deepEqual(ALLOWED_WORLDK_CONSUMER_HOSTS, ["worldk-web-git-feature-worldk-m12-vercel-preview-avatark.vercel.app"])
  assert.equal(parseWorldKConsumerOrigin(WORLDK), WORLDK)
  assert.equal(parseWorldKConsumerOrigin(`  ${WORLDK}  `), WORLDK, "surrounding whitespace tolerated")
  const rejected = [
    undefined, null, "", "   ",
    `http://worldk-web-git-feature-worldk-m12-vercel-preview-avatark.vercel.app`,
    `${WORLDK}/`, `${WORLDK}/worlds/living-forest/enter`, `${WORLDK}?x=1`, `${WORLDK}#frag`, `${WORLDK}:443`, `${WORLDK}:8443`,
    `https://user:pass@worldk-web-git-feature-worldk-m12-vercel-preview-avatark.vercel.app`,
    `https://user@worldk-web-git-feature-worldk-m12-vercel-preview-avatark.vercel.app`,
    `https://worldk-web-git-feature-worldk-m12-vercel-preview-avatark.vercel.app@evil.example`,
    `https://worldk-web-git-feature-worldk-m12-vercel-preview-avatark.vercel.app.evil.example`,
    `https://x.worldk-web-git-feature-worldk-m12-vercel-preview-avatark.vercel.app`,
    `https://evil-worldk-web-git-feature-worldk-m12-vercel-preview-avatark.vercel.app`,
    `https://WORLDK-WEB-GIT-FEATURE-WORLDK-M12-VERCEL-PREVIEW-AVATARK.VERCEL.APP`,
    "https://worldk.ai", "https://www.worldk.ai", "https://next.avatark.ai", "https://avatark.ai", "https://platform-preview.avatark.ai",
    "https://worldk-web.vercel.app", "https://worldk-web-git-main-avatark.vercel.app",
    "//worldk-web-git-feature-worldk-m12-vercel-preview-avatark.vercel.app",
    "worldk-web-git-feature-worldk-m12-vercel-preview-avatark.vercel.app",
    "https://evil.example", "not a url",
  ]
  for (const v of rejected) assert.equal(parseWorldKConsumerOrigin(v as string | null | undefined), null, String(v))
  assert.equal(parseWorldKConsumerOrigin("https://other.example", ["other.example"]), "https://other.example", "allowlist is the only gate")
  assert.equal(worldReturnHref(WORLDK, LIVING_FOREST_FIXTURE_BINDING), LF_ENTER)
  assert.equal(worldKHomeHref(WORLDK), HOME)
})
