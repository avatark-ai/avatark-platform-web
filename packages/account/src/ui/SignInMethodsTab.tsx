'use client'
import { useEffect, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'

// Canonical "Security" section (docs/CANONICAL_ACCOUNT_SHELL.md maps the
// 'signin' tab key to the Security label -- see AccountTabs.tsx). Kept as
// SignInMethodsTab/'signin' for API compatibility with the forked source.
//
// Mission Part 11: "Do not show 'setup required' or provider deployment
// instructions to consumers. Hide unconfigured providers." No Apple OAuth
// exists anywhere in this ecosystem today (no adapter, no capability
// signal), so this tab renders nothing for it -- not a "Setup required"
// placeholder with a Team ID/Key ID/callback-URL checklist, which the
// forked source exposed directly to every signed-in user.

export function SignInMethodsTab({ email, onSignOut }: { email: string; onSignOut: () => void }) {
  const adapters = useAccountAdapters()
  const [connectedProviders, setConnectedProviders] = useState<string[]>([])
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null)
  const [linkError, setLinkError] = useState('')
  const [changing, setChanging] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [signOutAllState, setSignOutAllState] = useState<'idle' | 'working' | 'error'>('idle')

  useEffect(() => { adapters.auth.getIdentities().then(setConnectedProviders) }, [adapters])
  useEffect(() => { adapters.auth.isEmailVerified().then(setEmailVerified) }, [adapters])

  async function handleSignOutAllDevices() {
    if (!adapters.auth.signOutAllDevices) return
    setSignOutAllState('working')
    const { error } = await adapters.auth.signOutAllDevices()
    if (error) { setSignOutAllState('error'); return }
    onSignOut()
  }

  async function handleChangeEmail() {
    if (!newEmail.trim()) return
    setStatus('sending')
    const { error } = await adapters.auth.changeEmail(newEmail.trim())
    if (error) { setStatus('error'); setErrorMsg(error.message); return }
    setStatus('sent')
  }

  async function handleLinkGoogle() {
    setLinkError('')
    const { error } = await adapters.auth.linkGoogleIdentity()
    if (error) {
      setLinkError('Google linking isn’t enabled for this project yet. You can still sign in with Google directly from the login page once it’s configured.')
    }
  }

  const googleConnected = connectedProviders.includes('google')

  return (
    <div className="space-y-2">
      <div className="aka-card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-primary,#f5f2ea)]">Email Magic Link</p>
          <p className="text-xs text-[var(--text-dim,#8b8b98)]">
            {email} · Primary · {emailVerified === null ? 'Checking…' : emailVerified ? 'Verified' : 'Not verified'} · Current Session
          </p>
        </div>
        <button onClick={onSignOut} className="text-sm text-[var(--text-dim,#8b8b98)] hover:text-[var(--gold,#d4af5f)]">Sign Out</button>
      </div>

      <div className="aka-card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-primary,#f5f2ea)]">Active sessions</p>
          <p className="text-xs text-[var(--text-dim,#8b8b98)] mt-0.5 max-w-sm">
            This browser can&apos;t list your other signed-in sessions individually — you can end all of them at once, including this one.
          </p>
          {signOutAllState === 'error' && <p className="text-xs text-red-400 mt-1">Couldn&apos;t sign out of all devices. Try again.</p>}
        </div>
        {adapters.auth.signOutAllDevices ? (
          <button
            onClick={handleSignOutAllDevices}
            disabled={signOutAllState === 'working'}
            className="text-sm text-[var(--gold,#d4af5f)] disabled:opacity-50 whitespace-nowrap"
          >
            {signOutAllState === 'working' ? 'Signing out…' : 'Sign out all devices'}
          </button>
        ) : (
          <span className="text-xs text-[var(--text-dim,#8b8b98)] whitespace-nowrap">Not yet available</span>
        )}
      </div>

      <div className="aka-card p-4">
        {!changing ? (
          <button onClick={() => setChanging(true)} className="text-sm text-[var(--gold,#d4af5f)]">Change primary email</button>
        ) : status === 'sent' ? (
          <p className="text-sm text-[var(--text-primary,#f5f2ea)]">
            Verification sent. Your email updates once confirmed — Supabase may require confirming from the new address, the old one, or both, depending on project settings.
          </p>
        ) : (
          <div className="space-y-2">
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@email.com" type="email"
              className="w-full rounded-md bg-transparent border border-[#1c1c26] px-3 py-2 text-sm text-[var(--text-primary,#f5f2ea)]" />
            <button onClick={handleChangeEmail} disabled={status === 'sending'}
              className="rounded-md bg-[var(--gold,#d4af5f)] px-4 py-2 text-sm font-semibold text-[#0a0a0f] disabled:opacity-50">
              {status === 'sending' ? 'Sending…' : 'Confirm change'}
            </button>
            {status === 'error' && <p className="text-xs text-red-400">{errorMsg}</p>}
          </div>
        )}
      </div>

      <div className="aka-card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-primary,#f5f2ea)]">Google</p>
          <p className="text-xs text-[var(--text-dim,#8b8b98)]">{googleConnected ? 'Connected' : 'Not connected'}</p>
          {linkError && <p className="text-xs text-red-400 mt-1 max-w-sm">{linkError}</p>}
        </div>
        {!googleConnected && (
          <button onClick={handleLinkGoogle} className="text-sm text-[var(--gold,#d4af5f)]">Connect</button>
        )}
      </div>

      <div className="aka-card p-4 flex items-center justify-between">
        <span className="text-sm text-[var(--text-primary,#f5f2ea)]">Enterprise SSO</span>
        <div className="text-right">
          <p className="text-xs text-[var(--text-dim,#8b8b98)]">Available for organizations</p>
          <a href={`mailto:${adapters.support.supportEmail}?subject=Enterprise SSO access`} className="text-sm" style={{ color: "var(--aka-accent,#d4af5f)" }}>Request Enterprise Access</a>
        </div>
      </div>
    </div>
  )
}
