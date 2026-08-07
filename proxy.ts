import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
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
    '/((?!_next/static|_next/image|favicon.ico|dev(?:/|$)|api/dev(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
