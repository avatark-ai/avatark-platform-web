import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    // Ai4 Conference Demo: /ai4 is a public, presentation-only experience
    // (components/ai4/PresentationShell) that must run with no dependency
    // on Supabase, auth, or environment-variable availability -- excluded
    // here so the session-refresh middleware never runs for it at all,
    // rather than making updateSession tolerate missing/unreachable
    // Supabase config. No other route's behavior changes.
    '/((?!_next/static|_next/image|favicon.ico|ai4|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
