// WORLDK-M14-B4: STUB attachment relay (Preview certification only; no media).
//
//   browser AUTHORIZED (B3)  ->  POST <stub attach>  ->  relay  ->  the ALLOCATED
//   renderer  ->  Runtime Ingress `attach` (Platform verifies)  ->  ATTACHED
//
// This stands in for a future signalling layer and deliberately chooses no
// topology (owner Q8): it is an in-process relay with no WebRTC, TURN,
// Pixel Streaming, host, port or deployed route. The browser gives only its
// opaque authorization; the Platform resolves which of the BROWSER'S OWN
// sessions it belongs to (044 world_stream_attachment_route) and the relay
// hands it to whichever renderer registered for that session. The renderer,
// not the relay, proves itself to the Platform with its runtime credential;
// a relay mistake can only produce a refused attach, never a wrong binding.
//
// The browser learns only ATTACHED / REFUSED: never a session, instance,
// renderer, process, GPU, host or port. Nothing is logged.
import { classifyEntryAuthorityError } from "./authorityDb.ts"
import { isSecretFormat, sha256 } from "./credentials.ts"
import { SESSION_COOKIE } from "./gateway.ts"
import { isStrictSameOrigin } from "./streamCapability.ts"

export interface AttachmentRouteDb {
  streamAttachmentRoute(viewSha256: Buffer, authorizationSha256: Buffer): Promise<string>
}

/** A renderer's delivery hook for one of its sessions: returns the ingress outcome, or null when refused. */
export type RendererDelivery = (authorization: string) => Promise<string | null>

export class StubAttachmentRelay {
  private readonly routes = new Map<string, RendererDelivery>()

  /** A renderer announces a session it claimed (in a real system: its own signalling registration). */
  register(sessionId: string, deliver: RendererDelivery): void {
    this.routes.set(sessionId, deliver)
  }

  unregister(sessionId: string): void {
    this.routes.delete(sessionId)
  }

  async deliver(sessionId: string, authorization: string): Promise<string | null> {
    const d = this.routes.get(sessionId)
    return d ? d(authorization) : null
  }
}

const HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" }
const json = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers: HEADERS })

function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie")
  if (!raw) return null
  for (const part of raw.split(";")) {
    const i = part.indexOf("=")
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim()
  }
  return null
}

/** Browser-facing stub: strict same-origin POST {authorization} with the session cookie. */
export async function handleStubAttach(request: Request, deps: { db: AttachmentRouteDb | null; relay: StubAttachmentRelay }): Promise<Response> {
  if (!isStrictSameOrigin(request)) return json(403, { status: "REFUSED" })
  const view = readCookie(request, SESSION_COOKIE)
  if (!isSecretFormat(view)) return json(403, { status: "REFUSED" })
  if (!/^application\/json(\s*;\s*charset=utf-8)?$/i.test((request.headers.get("content-type") ?? "").trim())) return json(400, { status: "MALFORMED" })
  let body: unknown
  try {
    const text = await request.text()
    if (text.length > 512) return json(400, { status: "MALFORMED" })
    body = JSON.parse(text)
  } catch {
    return json(400, { status: "MALFORMED" })
  }
  if (typeof body !== "object" || body === null || Array.isArray(body) || Object.keys(body).length !== 1) return json(400, { status: "MALFORMED" })
  const authorization = (body as Record<string, unknown>).authorization
  if (!isSecretFormat(authorization)) return json(403, { status: "REFUSED" })
  if (!deps.db) return json(503, { status: "UNAVAILABLE" })
  let sessionId: string
  try {
    sessionId = await deps.db.streamAttachmentRoute(sha256(view), sha256(authorization))
  } catch (err) {
    return classifyEntryAuthorityError(err).code === "STREAM_AUTHORIZATION_INVALID" ? json(403, { status: "REFUSED" }) : json(503, { status: "UNAVAILABLE" })
  }
  const outcome = await deps.relay.deliver(sessionId, authorization)
  return outcome === "ATTACHED" ? json(200, { status: "ATTACHED" }) : json(403, { status: "REFUSED" })
}
