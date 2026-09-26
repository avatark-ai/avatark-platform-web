import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import {
  MACHINE_KEY_ENV,
  MACHINE_KEY_HEADER,
  decideMachineIngress,
  denialResponse,
  isMachineIngressHost,
  withoutMachineKey,
} from '@/lib/worldConsumer/machineIngress'

export async function proxy(request: NextRequest) {
  // WORLDK-M12: the machine-ingress host is gated before anything else.
  // Every other host keeps its pre-M12 behaviour unchanged.
  if (isMachineIngressHost(request.headers.get('host'))) {
    const decision = decideMachineIngress({
      pathname: request.nextUrl.pathname,
      suppliedKey: request.headers.get(MACHINE_KEY_HEADER),
      configuredKey: process.env[MACHINE_KEY_ENV],
    })
    if (decision.kind === 'DENY') return denialResponse(decision)
    const forwarded = new NextRequest(request, { headers: withoutMachineKey(request.headers) })
    // WORLDK-M14-A: gateway / runtime ingress / sweeper authenticate their own
    // callers and have no Supabase session on this origin to refresh.
    if (decision.kind === 'ALLOW_SELF_AUTHENTICATING') {
      return NextResponse.next({ request: { headers: forwarded.headers } })
    }
    // public-projection must never read or refresh a session (see matcher).
    if (request.nextUrl.pathname.endsWith('/public-projection')) {
      return NextResponse.next({ request: { headers: forwarded.headers } })
    }
    return updateSession(forwarded)
  }
  return updateSession(request)
}

export const config = {
  matcher: [
    // /dev and /api/dev are excluded -- they're the pre-existing,
    // unauthenticated, not-linked-from-nav dev preview surface
    // (app/dev/account, and Sprint 4's app/api/dev/account/*), which by
    // design never touches a real Supabase session. Without this
    // exclusion, this proxy throws on every request in any environment
    // with no Supabase project configured, including this one -- see
    // docs/RUNTIME_HOST_INTEGRATION.md.
    //
    // api/worlds/:worldId/public-projection is excluded too (WORLDK-M09):
    // it is a public, shared-cacheable consumer contract that must never
    // read or refresh a session -- a Set-Cookie on a CDN-cacheable
    // response would leak one visitor's session to others. The PRIVATE
    // visitor-projection route stays behind this proxy.
    '/((?!_next/static|_next/image|favicon.ico|dev(?:/|$)|api/dev(?:/|$)|api/worlds/[^/]+/public-projection$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    // WORLDK-M12: on the machine-ingress host EVERY path runs the proxy
    // (static assets, /dev, public-projection included) so the host gate
    // in proxy() sees it. Mirrors MACHINE_INGRESS_HOST; the optional
    // trailing dot covers FQDN-form Host headers.
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'platform-preview\\.avatark\\.ai\\.?' }],
    },
  ],
}
