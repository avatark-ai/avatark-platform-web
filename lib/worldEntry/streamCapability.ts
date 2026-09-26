// WORLDK-M14-B3: stream connection capability authority + Preview stub
// signalling authorization (043).
//
//   GET  /world-entry/stream              stub page (no media): runs issue -> redeem
//   POST /world-entry/stream/capability   issue a 60 s single-use capability
//   POST /world-entry/stream/authorize    STUB signalling: redeem it once
//
// The browser is authenticated on the Platform gateway origin by its
// RuntimeSession status-page capability (the 040 HttpOnly cookie). Issuance
// succeeds only while that RuntimeSession is authoritatively IN_WORLD; the
// capability is bound (in the database) to its session, subject and world.
// Redemption needs the capability AND the same session cookie, and consumes
// the capability atomically; a reconnect needs a newly issued capability.
//
// Both POSTs are strict same-origin: the Origin header must be present and
// equal to this origin (absent / "null" / foreign are refused), and
// Sec-Fetch-Site, when sent, must be same-origin. The stub page is served
// with Referrer-Policy same-origin so a browser sends its real Origin (the
// M14-A3 Leave-fix lesson).
//
// The AUTHORIZED result is an opaque value for a future allocation /
// signalling layer (only its sha256 is stored, and nothing accepts it in
// B3). No renderer, signalling host, TURN, GPU, runtime, allocation, visit,
// session or subject identifier is ever returned. Physical topology is
// UNFROZEN (B0). Nothing here is logged.
import { createHash } from "node:crypto"
import { classifyEntryAuthorityError, type EntryAuthorityCode } from "./authorityDb.ts"
import { isSecretFormat, newTicket, sha256 } from "./credentials.ts"
import { SESSION_COOKIE } from "./gateway.ts"

export const STREAM_PAGE_PATH = "/world-entry/stream"
export const STREAM_CAPABILITY_PATH = "/world-entry/stream/capability"
export const STREAM_AUTHORIZE_PATH = "/world-entry/stream/authorize"
export const STREAM_CAPABILITY_TTL_SECONDS = 60

export interface StreamCapabilityDb {
  streamCapabilityIssue(viewSha256: Buffer, capabilitySha256: Buffer): Promise<{ worldId: string; expiresAt: string }>
  streamCapabilityRedeem(capabilitySha256: Buffer, viewSha256: Buffer, worldId: string, authorizationSha256: Buffer): Promise<{ outcome: "AUTHORIZED" }>
}

export interface StreamCapabilityDeps {
  db: StreamCapabilityDb | null
}

const MAX_BODY_BYTES = 1024
const WORLD_ID_FORMAT = /^[a-z0-9][a-z0-9-]{0,63}$/

// Authority refusals: all answered identically (403 REFUSED), never saying which check failed.
const REFUSAL_CODES: ReadonlySet<EntryAuthorityCode> = new Set([
  "SESSION_NOT_FOUND", "STREAM_CAPABILITY_INVALID", "STREAM_CAPABILITY_EXPIRED", "STREAM_CAPABILITY_CONSUMED",
  "STREAM_CAPABILITY_BINDING_MISMATCH", "STREAM_SESSION_NOT_IN_WORLD", "STREAM_CAPABILITY_LIMIT", "WORLD_NOT_ALLOWED",
])

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
}

const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
const refused = () => json(403, { status: "REFUSED" })
const malformed = () => json(400, { status: "MALFORMED" })
const unavailable = () => json(503, { status: "UNAVAILABLE" })

function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie")
  if (!raw) return null
  for (const part of raw.split(";")) {
    const i = part.indexOf("=")
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim()
  }
  return null
}

/** Strict same-origin: Origin must be present and exactly this origin. */
export function isStrictSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  const site = request.headers.get("sec-fetch-site")
  if (origin === null || origin !== new URL(request.url).origin) return false
  if (site !== null && site !== "same-origin") return false
  return true
}

/** A small JSON object body with exactly `keys`; null when anything else. */
async function readJsonObject(request: Request, keys: readonly string[]): Promise<Record<string, unknown> | null> {
  const type = request.headers.get("content-type") ?? ""
  if (!/^application\/json(\s*;\s*charset=utf-8)?$/i.test(type.trim())) return null
  let text: string
  try {
    const buf = await request.arrayBuffer()
    if (buf.byteLength > MAX_BODY_BYTES) return null
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf)
  } catch {
    return null
  }
  let v: unknown
  try {
    v = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof v !== "object" || v === null || Array.isArray(v)) return null
  const got = Object.keys(v).sort()
  const want = [...keys].sort()
  if (got.length !== want.length || got.some((k, i) => k !== want[i])) return null
  return v as Record<string, unknown>
}

function authorityFailure(err: unknown): Response {
  const e = classifyEntryAuthorityError(err)
  return REFUSAL_CODES.has(e.code) ? refused() : unavailable()
}

export async function handleStreamCapabilityIssue(request: Request, deps: StreamCapabilityDeps): Promise<Response> {
  if (!isStrictSameOrigin(request)) return refused()
  const view = readCookie(request, SESSION_COOKIE)
  if (!isSecretFormat(view)) return refused()
  // The body names nothing: session, subject and world come from the session.
  if (!(await readJsonObject(request, []))) return malformed()
  if (!deps.db) return unavailable()
  const cap = newTicket()
  try {
    const r = await deps.db.streamCapabilityIssue(sha256(view), cap.sha256)
    return json(201, { status: "ISSUED", capability: cap.secret, worldId: r.worldId, expiresInSeconds: STREAM_CAPABILITY_TTL_SECONDS })
  } catch (err) {
    return authorityFailure(err)
  }
}

/** Preview STUB signalling: authorizes the initial connection; connects nothing. */
export async function handleStreamAuthorize(request: Request, deps: StreamCapabilityDeps): Promise<Response> {
  if (!isStrictSameOrigin(request)) return refused()
  const view = readCookie(request, SESSION_COOKIE)
  if (!isSecretFormat(view)) return refused()
  const body = await readJsonObject(request, ["capability", "worldId"])
  if (!body || typeof body.worldId !== "string" || !WORLD_ID_FORMAT.test(body.worldId)) return malformed()
  if (!isSecretFormat(body.capability)) return refused()
  if (!deps.db) return unavailable()
  const authorization = newTicket()
  try {
    await deps.db.streamCapabilityRedeem(sha256(body.capability), sha256(view), body.worldId, authorization.sha256)
  } catch (err) {
    return authorityFailure(err)
  }
  return json(200, { status: "AUTHORIZED", authorization: authorization.secret })
}

// ── Stub page ──────────────────────────────────────────────────────

// Displays only the outcome; the capability and authorization never reach the DOM.
export const STREAM_PAGE_SCRIPT = `(function(){var b=document.getElementById("go"),o=document.getElementById("out");function done(r,t){o.dataset.result=r;o.textContent=t;b.disabled=false}b.addEventListener("click",function(){b.disabled=true;o.dataset.result="PENDING";o.textContent="Requesting authorization…";var h={"content-type":"application/json"};fetch(${JSON.stringify(STREAM_CAPABILITY_PATH)},{method:"POST",headers:h,body:"{}",credentials:"same-origin",cache:"no-store"}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(c){return fetch(${JSON.stringify(STREAM_AUTHORIZE_PATH)},{method:"POST",headers:h,body:JSON.stringify({capability:c.capability,worldId:c.worldId}),credentials:"same-origin",cache:"no-store"})}).then(function(a){return a.json().then(function(j){if(!a.ok||j.status!=="AUTHORIZED")throw 0;done("AUTHORIZED","Authorized. Preview stub: no stream or media is connected.")})}).catch(function(){done("REFUSED","Not authorized. You need to be in the world to connect.")})})})();`
const SCRIPT_HASH = createHash("sha256").update(STREAM_PAGE_SCRIPT, "utf8").digest("base64")

export const STREAM_PAGE_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "private, no-store",
  // same-origin: the page's fetch POSTs carry the real Origin (Leave-fix lesson).
  "Referrer-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": `default-src 'none'; script-src 'sha256-${SCRIPT_HASH}'; connect-src 'self'; style-src 'unsafe-inline'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'`,
}

export async function handleStreamPage(request: Request, deps: StreamCapabilityDeps): Promise<Response> {
  const view = readCookie(request, SESSION_COOKIE)
  const shell = (body: string, status: number) =>
    new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stream connection (preview)</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem;color:#1d2b22;background:#f6f4ee}h1{font-size:1.4rem}.meta{color:#55635a;font-size:.9rem}button{font:inherit;padding:.5rem 1rem}</style>
</head><body>${body}</body></html>`, { status, headers: STREAM_PAGE_HEADERS })
  if (!deps.db || !isSecretFormat(view)) return shell(`<h1>No world session</h1><p>Go back to WorldK and choose Enter.</p>`, 404)
  return shell(
    `<h1>Stream connection (preview stub)</h1><p>Authorizes the first stream connection for your current world visit. Nothing is rendered and no media is connected.</p>` +
      `<button id="go" type="button">Authorize stream connection</button><p id="out" role="status" aria-live="polite" data-result="IDLE"></p>` +
      `<p class="meta">Each authorization is single-use and expires after ${STREAM_CAPABILITY_TTL_SECONDS} seconds.</p><script>${STREAM_PAGE_SCRIPT}</script>`,
    200,
  )
}
