import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import { decideRequest, isInstitutionalScope } from '@/lib/release/scope'
import { denialResponse } from '@/lib/release/denial'

// AVK-PROD-03A (C2/C3, L1): deny-by-default allowlist, evaluated first on every request.
// In the institutional scope an allowed request passes straight through: no Supabase session
// refresh, no auth cookie, no backend call. Excluded/unknown paths -> 404, other methods -> 405.
// The Supabase session refresh below is reachable only in a future, separately gated Scope II build.
export async function proxy(request: NextRequest) {
  if (isInstitutionalScope()) {
    const decision = decideRequest(request.method, request.nextUrl.pathname)
    if (decision.kind === 'DENY') return denialResponse(decision.status)
    return NextResponse.next()
  }
  return updateSession(request)
}

// Every request except built static assets (/_next/static) reaches the allowlist -- including
// /_next/image, public files and any extension, which the previous matcher skipped.
export const config = {
  matcher: ['/((?!_next/static/).*)'],
}
