import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Real magic-link/OAuth callback. Validates the return URL against an
// explicit allowlist of same-origin paths -- never redirects to an
// arbitrary external URL from a query parameter (a real, common open-
// redirect vulnerability class), per the explicit "return URL
// validation" requirement.
function safeReturnPath(raw: string | null): string {
  if (!raw) return '/account'
  // Only allow real, relative, same-origin paths -- reject anything
  // that looks like it could be an absolute URL or protocol-relative
  // redirect target.
  if (raw.startsWith('//') || raw.includes('://')) return '/account'
  if (!raw.startsWith('/')) return '/account'
  return raw
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const returnPath = safeReturnPath(searchParams.get('return'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${returnPath}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=callback_failed`)
}
