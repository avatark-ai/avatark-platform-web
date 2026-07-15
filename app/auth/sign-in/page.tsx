'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function SignInForm() {
  const searchParams = useSearchParams()
  // Real fix: this `return` param was previously read by /account and
  // /journey's redirect-to-sign-in links, but silently dropped here --
  // the magic link always called back to a bare /auth/callback with no
  // `return`, which only happened to work for /account because its
  // desired destination matches the callback's own default. Anything
  // else (e.g. /continue) needs it actually threaded through.
  const returnParam = searchParams.get('return')

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSignIn() {
    if (!email.trim()) return
    setStatus('sending')
    const supabase = createClient()
    const callbackUrl = new URL('/auth/callback', window.location.origin)
    if (returnParam) callbackUrl.searchParams.set('return', returnParam)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl.toString() },
    })
    setStatus(error ? 'error' : 'sent')
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold mb-6">Sign in</h1>
      {status === 'sent' ? (
        <p className="text-sm text-neutral-600">Check your email for a sign-in link.</p>
      ) : (
        <div className="space-y-3">
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
