'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { callbackErrorMessage } from '@/lib/auth/callbackError'
import { EchoPageShell, ECHO_READING_WIDTH_CLASS } from '@/components/echo/shell/EchoPageShell'

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
    <EchoPageShell layout="plain">
      <div className={`flex flex-col gap-6 ${ECHO_READING_WIDTH_CLASS.form}`}>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Sign in</h1>
        {callbackError && (
          <p className="text-sm" role="alert" style={{ color: '#f87171' }}>
            {callbackError}
          </p>
        )}
        {status === 'sent' ? (
          <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
            Check your email for a sign-in link.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {GOOGLE_OAUTH_ENABLED && (
              <>
                <button
                  onClick={handleGoogleSignIn}
                  disabled={googleStatus === 'redirecting'}
                  className="echo-cta-secondary w-full rounded-full border px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
                  style={{ borderColor: 'var(--surface-line)', color: 'var(--paper)' }}
                >
                  {googleStatus === 'redirecting' ? 'Redirecting…' : 'Continue with Google'}
                </button>
                {googleStatus === 'error' && (
                  <p className="text-sm" style={{ color: '#f87171' }}>
                    Couldn&apos;t start Google sign-in. Try again.
                  </p>
                )}

                <div className="flex items-center gap-3 py-1 text-xs" style={{ color: 'var(--text-dim)' }}>
                  <div className="h-px flex-1" style={{ background: 'var(--surface-line)' }} />
                  or
                  <div className="h-px flex-1" style={{ background: 'var(--surface-line)' }} />
                </div>
              </>
            )}

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border px-4 py-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ borderColor: 'var(--surface-line)', background: 'var(--surface)', color: 'var(--paper)', outlineColor: 'var(--gold)' }}
            />
            <button
              onClick={handleSignIn}
              disabled={status === 'sending'}
              className="echo-cta-primary w-full rounded-full px-4 py-3 text-center text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--gold)', color: 'var(--midnight)' }}
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
            {status === 'error' && (
              <p className="text-sm" style={{ color: '#f87171' }}>
                Something went wrong. Try again.
              </p>
            )}
          </div>
        )}
      </div>
    </EchoPageShell>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  )
}
