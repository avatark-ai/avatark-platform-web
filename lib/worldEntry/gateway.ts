// WORLDK-M14-A: Platform Handoff Gateway (D5).
//
//   GET  /world-entry/h/:ticket        redeem the single-use EntryTicket
//   GET  /world-entry/session          the visitor's session status page
//   POST /world-entry/session/leave    the visitor asks to leave
//
// Redemption creates a RuntimeSession bound to the ticket's allocation.
// It is NOT an arrival: the visit opens only when the allocated runtime
// claims the session and sends a verified ARRIVAL receipt.
//
// The browser receives only an HttpOnly status-page capability on the
// Platform origin. It never receives a runtime instance id, allocation id,
// visit id, subject id, machine or signalling address, or any credential.
// "Leave" is a visitor intent relayed to the runtime; the departure itself
// is evidenced by the runtime (or inferred by PRESENCE_TIMEOUT).
import { WORLD_BINDINGS, type WorldBinding } from "../worldConsumer/bindings.ts"
import type { EntryAuthorityDb, SessionViewState } from "./authorityDb.ts"
import { isSecretFormat, newTicket, sha256 } from "./credentials.ts"

export const SESSION_COOKIE = "__Host-wk-entry"
export const SESSION_PATH = "/world-entry/session"
export const LEAVE_PATH = "/world-entry/session/leave"

export interface GatewayDeps {
  db: EntryAuthorityDb | null
  bindings?: readonly WorldBinding[]
}

const PAGE_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string)

function page(title: string, body: string, status: number, refreshSeconds?: number): Response {
  const refresh = refreshSeconds ? `<meta http-equiv="refresh" content="${refreshSeconds}">` : ""
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${refresh}<title>${esc(title)}</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem;color:#1d2b22;background:#f6f4ee}h1{font-size:1.4rem}.meta{color:#55635a;font-size:.9rem}button{font:inherit;padding:.5rem 1rem}</style>
</head><body>${body}</body></html>`
  return new Response(html, { status, headers: PAGE_HEADERS })
}

function worldName(worldId: string, bindings: readonly WorldBinding[]): string {
  return bindings.find((b) => b.consumerWorldId === worldId)?.displayName ?? "the world"
}

function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie")
  if (!raw) return null
  for (const part of raw.split(";")) {
    const i = part.indexOf("=")
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim()
  }
  return null
}

const unavailable = () =>
  page("Entry unavailable", `<h1>This entry link can't be used</h1><p>It has expired, was already used, or the world is no longer ready for you. Go back to WorldK and choose Enter again.</p>`, 410)

export async function handleHandoff(ticket: string, deps: GatewayDeps): Promise<Response> {
  if (!deps.db || !isSecretFormat(ticket)) return unavailable()
  const view = newTicket()
  let r
  try {
    r = await deps.db.redeemTicket(sha256(ticket), view.sha256)
  } catch {
    return unavailable()
  }
  if (r.outcome !== "REDEEMED") return unavailable()
  // 303 away from the ticket URL so it never stays in history or referrers.
  return new Response(null, {
    status: 303,
    headers: {
      Location: SESSION_PATH,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "Set-Cookie": `${SESSION_COOKIE}=${view.secret}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600`,
    },
  })
}

const COPY: Record<SessionViewState, { title: (w: string) => string; body: (w: string) => string; refresh?: number; leave?: boolean }> = {
  WAITING: { title: (w) => `Entering ${w}`, body: (w) => `<p>Preparing your way into ${esc(w)}…</p><p class="meta">This page updates on its own.</p>`, refresh: 3 },
  IN_WORLD: { title: (w) => `In ${w}`, body: (w) => `<p>You are in ${esc(w)}.</p><p class="meta">Preview reference runtime: nothing is rendered here. The world continues whether or not you stay.</p>`, refresh: 15, leave: true },
  LEAVING: { title: (w) => `Leaving ${w}`, body: (w) => `<p>Leaving ${esc(w)}…</p><p class="meta">This page updates on its own.</p>`, refresh: 3 },
  LEFT: { title: (w) => `You left ${w}`, body: (w) => `<p>You have left ${esc(w)}. It continues without you.</p><p class="meta">Return to WorldK to see what changes while you are away.</p>` },
  ENDED: { title: (w) => `${w}`, body: (w) => `<p>This session with ${esc(w)} has ended.</p><p class="meta">If you are still inside, your newer session continues; otherwise return to WorldK.</p>` },
}

export async function handleSessionView(request: Request, deps: GatewayDeps): Promise<Response> {
  const view = readCookie(request, SESSION_COOKIE)
  if (!deps.db || !isSecretFormat(view)) return page("No session", `<h1>No world session</h1><p>Go back to WorldK and choose Enter.</p>`, 404)
  let v
  try {
    v = await deps.db.sessionView(sha256(view))
  } catch {
    return page("No session", `<h1>No world session</h1><p>Go back to WorldK and choose Enter.</p>`, 404)
  }
  const w = worldName(v.worldId, deps.bindings ?? WORLD_BINDINGS)
  const c = COPY[v.state]
  const leave = c.leave ? `<form method="post" action="${LEAVE_PATH}"><button type="submit">Leave ${esc(w)}</button></form>` : ""
  return page(c.title(w), `<h1>${esc(c.title(w))}</h1>${c.body(w)}${leave}`, 200, c.refresh)
}

/** Same-origin POST only; the cookie is SameSite=Lax as well. */
export async function handleLeave(request: Request, deps: GatewayDeps): Promise<Response> {
  const site = request.headers.get("sec-fetch-site")
  const origin = request.headers.get("origin")
  const self = new URL(request.url).origin
  if ((site && site !== "same-origin") || (origin && origin !== self)) return page("Refused", `<h1>Refused</h1>`, 403)
  const view = readCookie(request, SESSION_COOKIE)
  if (!deps.db || !isSecretFormat(view)) return page("No session", `<h1>No world session</h1>`, 404)
  try {
    await deps.db.requestLeave(sha256(view))
  } catch {
    return page("No session", `<h1>No world session</h1>`, 404)
  }
  return new Response(null, { status: 303, headers: { Location: SESSION_PATH, "Cache-Control": "private, no-store" } })
}
