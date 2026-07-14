'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  async function handleSignIn() {
    if (!email.trim()) return
    setStatus('sending')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
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
