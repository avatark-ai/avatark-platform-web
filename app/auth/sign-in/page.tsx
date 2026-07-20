'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { callbackErrorMessage } from '@/lib/auth/callbackError'

// Feature-flagged: Google OAuth is wired up end-to-end (this button plus
// the callback's exchangeCodeForSession path both work for it), but no
// Google client ID/secret is configured in Supabase Auth for any
// environment yet. Hidden by default so real visitors aren't offered a
// sign-in method that would fail -- flip NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED
// to 'true' once Supabase's Google provider is actually configured.
const GOOGLE_OAUTH_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true'

function SignInForm() {
  const searchParams = useSearchParams()
  // Real fix: this `return` param was previously read by /account and
  // /journey's redirect-to-sign-in links, but silently dropped here --
  // the magic link always called back to a bare /auth/callback with no
  // `return`, which only happened to work for /account because its
  // desired destination matches the callback's own default. Anything
  // else (e.g. /continue) needs it actually threaded through.
  const returnParam = searchParams.get('return')
  const callbackError = callbackErrorMessage(searchParams.get('error'))

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [googleStatus, setGoogleStatus] = useState<'idle' | 'redirecting' | 'error'>('idle')

  function buildCallbackUrl() {
    const callbackUrl = new URL('/auth/callback', window.location.origin)
    if (returnParam) callbackUrl.searchParams.set('return', returnParam)
    return callbackUrl
  }

  async function handleSignIn() {
    if (!email.trim()) return
    setStatus('sending')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: buildCallbackUrl().toString() },
    })
    setStatus(error ? 'error' : 'sent')
  }

  async function handleGoogleSignIn() {
    setGoogleStatus('redirecting')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: buildCallbackUrl().toString() },
    })
    // On success, Supabase navigates the browser away immediately -- this
    // only ever resolves same-tick on a genuine failure to start the flow.
    if (error) setGoogleStatus('error')
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold mb-6">Sign in</h1>
      {callbackError && (
        <p className="mb-4 text-sm text-red-600" role="alert">{callbackError}</p>
      )}
      {status === 'sent' ? (
        <p className="text-sm text-neutral-600">Check your email for a sign-in link.</p>
      ) : (
        <div className="space-y-3">
          {GOOGLE_OAUTH_ENABLED && (
            <>
              <button
                onClick={handleGoogleSignIn}
                disabled={googleStatus === 'redirecting'}
                className="w-full rounded-md border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {googleStatus === 'redirecting' ? 'Redirecting…' : 'Continue with Google'}
              </button>
              {googleStatus === 'error' && <p className="text-sm text-red-600">Couldn&apos;t start Google sign-in. Try again.</p>}

              <div className="flex items-center gap-3 py-1 text-xs text-neutral-500">
                <div className="h-px flex-1 bg-neutral-200" />
                or
                <div className="h-px flex-1 bg-neutral-200" />
              </div>
            </>
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <button
            onClick={handleSignIn}
            disabled={status === 'sending'}
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </button>
          {status === 'error' && <p className="text-sm text-red-600">Something went wrong. Try again.</p>}
        </div>
      )}
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  )
}
