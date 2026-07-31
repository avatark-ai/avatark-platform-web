'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fetchAuthProviderCapabilities } from '@/lib/auth/authProviderCapabilities'
import { EchoPageShell, ECHO_READING_WIDTH_CLASS } from '@/components/echo/shell/EchoPageShell'
import {
  AuthShell,
  SignInCard,
  ProductIdentityProvider,
  AuthErrorState,
  MagicLinkSentState,
  type AuthProviderCapabilities,
} from '@avatark/auth-ui'
import { getProductIdentityConfig } from '@avatark/product-registry'

// AvatarK is the home product -- there is no incoming "return to X" product
// context on this page itself (that's what a *different* product's own
// sign-in surface would show). getProductIdentityConfig('avatark') is
// frozen in Part 4 and always present for the real registry.
const AVATARK_IDENTITY_CONFIG = getProductIdentityConfig('avatark')!

function SignInForm() {
  const searchParams = useSearchParams()
  // Real fix (pre-existing): this `return` param was previously read by
  // /account and /journey's redirect-to-sign-in links, but silently
  // dropped here -- the magic link always called back to a bare
  // /auth/callback with no `return`, which only happened to work for
  // /account because its desired destination matches the callback's own
  // default. Anything else (e.g. /continue) needs it actually threaded
  // through. Safety validation of this value happens in
  // app/auth/callback/route.ts via safeReturnPath -- not re-validated
  // here, since this page only ever echoes it back into the callback URL.
  const returnParam = searchParams.get('return')
  const callbackErrorReason = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [googleStatus, setGoogleStatus] = useState<'idle' | 'redirecting' | 'error'>('idle')
  // Dynamically reflects whatever the mounted auth module (Supabase Auth
  // for this project) actually reports, rather than a hardcoded flag --
  // see lib/auth/authProviderCapabilities.ts. Defaults to hidden until
  // resolved, same "don't offer a method that might fail" caution the
  // static flag used to provide.
  const [capabilities, setCapabilities] = useState<AuthProviderCapabilities>({ google: false, status: 'unavailable' })

  useEffect(() => {
    let cancelled = false
    fetchAuthProviderCapabilities().then((caps) => {
      if (cancelled) return
      setCapabilities(caps)
      if (caps.status === 'unavailable') {
        // Couldn't confirm either way (network/parsing failure) -- distinct
        // from Supabase genuinely reporting Google as disabled. Surfaced
        // for anyone diagnosing the integration rather than silently
        // treated the same as an intentional disable.
        console.warn('[auth] Google provider capability check unavailable -- could not reach or parse Supabase auth settings')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  function buildCallbackUrl() {
    const callbackUrl = new URL('/auth/callback', window.location.origin)
    if (returnParam) callbackUrl.searchParams.set('return', returnParam)
    return callbackUrl
  }

  async function handleMagicLinkSubmit(submittedEmail: string) {
    setEmail(submittedEmail)
    setStatus('sending')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: submittedEmail.trim(),
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
      {/* @avatark/auth-ui components are headless by design (data-avatark-*
          hooks only) -- this scoped stylesheet gives them the same visual
          language as the rest of this page without forking the components
          themselves, matching the pattern already established for
          @avatark/account-ui in app/account/page.tsx. */}
      <style>{`
        .echo-auth-ui [data-avatark-part="eyebrow"] { font-size: 0.75rem; letter-spacing: 0.12em; color: var(--gold); margin-bottom: 0.5rem; }
        .echo-auth-ui [data-avatark-part="heading"] { font-size: 2rem; font-weight: 600; letter-spacing: -0.01em; color: var(--paper); margin-bottom: 0.5rem; }
        .echo-auth-ui [data-avatark-part="identity-statement"] { font-size: 0.9rem; color: var(--text-dim); margin-bottom: 1.5rem; }
        .echo-auth-ui [data-avatark-component="sign-in-card"] { display: flex; flex-direction: column; gap: 0.75rem; }
        .echo-auth-ui [data-avatark-component="return-destination"] { font-size: 0.85rem; color: var(--text-dim); margin-bottom: 0.25rem; }
        .echo-auth-ui [data-avatark-component="google-provider-button"] { width: 100%; border-radius: 9999px; border: 1px solid var(--surface-line); padding: 0.625rem 1rem; font-size: 0.875rem; font-weight: 600; color: var(--paper); background: transparent; }
        .echo-auth-ui [data-avatark-component="google-provider-button"]:disabled { opacity: 0.5; }
        .echo-auth-ui [data-avatark-component="provider-divider"] { display: flex; align-items: center; gap: 0.75rem; padding: 0.25rem 0; font-size: 0.75rem; color: var(--text-dim); }
        .echo-auth-ui [data-avatark-component="provider-divider"]::before, .echo-auth-ui [data-avatark-component="provider-divider"]::after { content: ""; flex: 1; height: 1px; background: var(--surface-line); }
        .echo-auth-ui [data-avatark-component="magic-link-form"] { display: flex; flex-direction: column; gap: 0.75rem; }
        .echo-auth-ui [data-avatark-part="email-label"] { display: none; }
        .echo-auth-ui [data-avatark-part="email-input"] { width: 100%; border-radius: 0.75rem; border: 1px solid var(--surface-line); background: var(--surface); padding: 0.75rem 1rem; font-size: 1rem; color: var(--paper); }
        .echo-auth-ui [data-avatark-part="email-input"]:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
        .echo-auth-ui [data-avatark-part="submit"] { width: 100%; border-radius: 9999px; padding: 0.75rem 1rem; text-align: center; font-size: 0.875rem; font-weight: 600; background: var(--gold); color: var(--midnight); }
        .echo-auth-ui [data-avatark-part="submit"]:disabled { opacity: 0.5; }
        .echo-auth-ui [data-avatark-component="auth-error"] [data-avatark-part="message"] { font-size: 0.875rem; color: #f87171; }
        .echo-auth-ui [data-avatark-component="magic-link-sent"] [data-avatark-part="message"] { font-size: 0.875rem; color: var(--text-dim); }
        .echo-auth-ui [data-avatark-component="auth-footer"] { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .echo-auth-ui [data-avatark-part="reassurance"] { font-size: 0.75rem; color: var(--text-dim); }
        .echo-auth-ui [data-avatark-part="links"] { display: flex; gap: 1rem; font-size: 0.75rem; }
        .echo-auth-ui [data-avatark-part="links"] a { color: var(--text-dim); text-decoration: underline; text-underline-offset: 2px; }
      `}</style>
      <div className={`echo-auth-ui flex flex-col ${ECHO_READING_WIDTH_CLASS.form}`}>
        <ProductIdentityProvider value={AVATARK_IDENTITY_CONFIG}>
          <AuthShell>
            {status === 'sent' ? (
              <MagicLinkSentState email={email} />
            ) : (
              <SignInCard
                capabilities={capabilities}
                onGoogleSignIn={handleGoogleSignIn}
                googleRedirecting={googleStatus === 'redirecting'}
                onMagicLinkSubmit={handleMagicLinkSubmit}
                magicLinkSubmitting={status === 'sending'}
                footerLinks={{ support: 'mailto:support@avatark.ai' }}
              >
                {callbackErrorReason && <AuthErrorState reason={callbackErrorReason} />}
                {googleStatus === 'error' && (
                  <p role="alert" style={{ fontSize: '0.875rem', color: '#f87171' }}>
                    Couldn&apos;t start Google sign-in. Try again.
                  </p>
                )}
                {status === 'error' && (
                  <p role="alert" style={{ fontSize: '0.875rem', color: '#f87171' }}>
                    Something went wrong. Try again.
                  </p>
                )}
              </SignInCard>
            )}
          </AuthShell>
        </ProductIdentityProvider>
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
