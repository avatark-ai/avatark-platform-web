import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeReturnPath } from '@/lib/auth/safeReturnPath'
import { classifyCallbackFailure } from '@/lib/auth/callbackError'

function signInFailureRedirect(origin: string, returnPath: string, reason: string) {
  const url = new URL('/auth/sign-in', origin)
  url.searchParams.set('error', reason)
  // Preserve the original destination so a retried sign-in still lands
  // where the visitor was headed, instead of forcing them back to /account.
  if (returnPath !== '/account') url.searchParams.set('return', returnPath)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const returnPath = safeReturnPath(searchParams.get('return'), '/account')

  // Both magic-link and Google OAuth failures land here: Supabase redirects
  // back with `error`/`error_description` instead of `code` when the
  // provider itself rejects the request (e.g. the visitor cancels the
  // Google consent screen).
  const providerError = searchParams.get('error')
  if (providerError) {
    const reason = classifyCallbackFailure({ providerError })
    return signInFailureRedirect(origin, returnPath, reason)
  }

  if (!code) {
    return signInFailureRedirect(origin, returnPath, 'missing_code')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (!error) {
    return NextResponse.redirect(`${origin}${returnPath}`)
  }

  const reason = classifyCallbackFailure({ exchangeError: error.message })
  return signInFailureRedirect(origin, returnPath, reason)
}
