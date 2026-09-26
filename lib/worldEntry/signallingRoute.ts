// WORLDK-M14-B5: the Platform's signalling-facing route authority (045).
//
//   POST /api/signalling/v1/route
//   Authorization: Bearer <WORLDK_SIGNALLING_KEY>
//   { "authorizationSha256": "<64 lowercase hex>" }
//   -> 200 { routeKey, attached } | 404 { error: "NOT_ROUTABLE" } | 401 | 400 | 503
//
// The signalling service holds no database credential and never the
// visitor's cookie. It presents the digest of the browser's B3
// authorization; the Platform resolves it (world_stream_signalling_route)
// to an opaque route key (the allocated renderer's streamer id for that
// RuntimeSession) and whether B4 attachment has happened. Every authority
// refusal is the same 404: signalling learns nothing about why.
//
// Signalling is NOT lifecycle authority: this endpoint is read-only.
import { createHash, timingSafeEqual } from "node:crypto"
import { classifyEntryAuthorityError } from "./authorityDb.ts"

export const SIGNALLING_KEY_ENV = "WORLDK_SIGNALLING_KEY"
export const SIGNALLING_ROUTE_PATH = "/api/signalling/v1/route"

/** Same derivation as 045 world_m14b5_route_key; the renderer computes it from its claimed session id. */
export function streamRouteKey(sessionId: string): string {
  return "wkr1-" + createHash("sha256").update(`worldk-stream-route:v1:${sessionId}`, "utf8").digest("hex").slice(0, 40)
}
export const ROUTE_KEY_FORMAT = /^wkr1-[0-9a-f]{40}$/

export interface SignallingRouteDb {
  signallingRoute(authorizationSha256: Buffer): Promise<{ routeKey: string; attached: boolean }>
}

export interface SignallingRouteDeps {
  db: SignallingRouteDb | null
  configuredKey: string | undefined
}

const KEY_FORMAT = /^[A-Za-z0-9_-]{43,128}$/
const HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" }
const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: HEADERS })
const digest = (v: string) => createHash("sha256").update(v, "utf8").digest()

export function signallingKeyMatches(authorization: string | null, configured: string | undefined): boolean {
  if (typeof configured !== "string" || !KEY_FORMAT.test(configured)) return false
  const m = typeof authorization === "string" ? /^Bearer ([A-Za-z0-9_-]{43,128})$/.exec(authorization.trim()) : null
  if (!m) return false
  return timingSafeEqual(digest(m[1]), digest(configured))
}

export async function handleSignallingRoute(request: Request, deps: SignallingRouteDeps): Promise<Response> {
  if (!signallingKeyMatches(request.headers.get("authorization"), deps.configuredKey)) return json(401, { error: "UNAUTHORIZED" })
  let body: unknown
  try {
    const text = await request.text()
    if (text.length > 256) return json(400, { error: "INVALID_REQUEST" })
    body = JSON.parse(text)
  } catch {
    return json(400, { error: "INVALID_REQUEST" })
  }
  if (typeof body !== "object" || body === null || Array.isArray(body) || Object.keys(body).length !== 1) return json(400, { error: "INVALID_REQUEST" })
  const h = (body as Record<string, unknown>).authorizationSha256
  if (typeof h !== "string" || !/^[0-9a-f]{64}$/.test(h)) return json(400, { error: "INVALID_REQUEST" })
  if (!deps.db) return json(503, { error: "UNAVAILABLE" })
  try {
    const r = await deps.db.signallingRoute(Buffer.from(h, "hex"))
    return json(200, { routeKey: r.routeKey, attached: r.attached })
  } catch (err) {
    const code = classifyEntryAuthorityError(err).code
    return code.startsWith("STREAM_") ? json(404, { error: "NOT_ROUTABLE" }) : json(503, { error: "UNAVAILABLE" })
  }
}
