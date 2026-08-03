'use client'
import { useEffect, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { AccountOrganizationContext, AccountOrganizationInvitation } from '../contracts/adapters.ts'

// Minimal canonical organization-context view (Part 7) -- not an
// organization-admin surface. Personal context is the honest default when
// no organization adapter exists or the user has no memberships; real
// memberships are never fabricated for display purposes.
//
// Pending invitations / enter-code / leave are each independently
// optional (see OrganizationsAdapter in contracts/adapters.ts) -- a host
// with no invitation subsystem wired up renders no invitations section at
// all, never a fake "no invitations" empty state, per the mission's "do
// not show controls that lack a real backend" rule.
//
// No "return to originating product" action exists here: organization
// invitations carry no product association in this schema (migration 016
// -- an org_id and an email, nothing else). That is a real, documented
// difference from ArenaK's content invitations (/enter/[token]), which do
// carry a real return-path contract -- see
// docs/ACCOUNT_ORGANIZATION_INVITATION_INTEGRATION.md.
export function OrganizationsTab() {
  const adapters = useAccountAdapters()
  const [context, setContext] = useState<AccountOrganizationContext | null | undefined>(undefined)
  const [contextError, setContextError] = useState<string | null>(null)
  const [invitations, setInvitations] = useState<AccountOrganizationInvitation[] | undefined>(undefined)
  const [invitationsError, setInvitationsError] = useState<string | null>(null)
  const [switching, setSwitching] = useState<string | null>(null)
  const [actingToken, setActingToken] = useState<string | null>(null)
  const [leavingOrgId, setLeavingOrgId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [codeSubmitting, setCodeSubmitting] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  function loadContext() {
    if (!adapters.organizations) { setContext(null); return }
    adapters.organizations.get().then((res) => {
      if (res.error) { setContextError(res.error); return }
      setContextError(null)
      setContext(res.data ?? null)
    })
  }

  function loadInvitations() {
    if (!adapters.organizations?.listInvitations) { setInvitations(undefined); return }
    adapters.organizations.listInvitations().then((res) => {
      if (res.error) { setInvitationsError(res.error); return }
      setInvitationsError(null)
      setInvitations(res.data ?? [])
    })
  }

  useEffect(() => {
    // Deferred to a microtask so nothing runs synchronously within the
    // effect body itself (react-hooks/set-state-in-effect) -- same fix
    // shape as PrivacyTab.tsx.
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) { loadContext(); loadInvitations() }
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapters])

  async function handleSwitch(organizationId: string | null) {
    if (!adapters.organizations) return
    setSwitching(organizationId ?? 'personal')
    const res = await adapters.organizations.switchOrganization(organizationId)
    if (res.data) setContext(res.data)
    if (res.error) setContextError(res.error)
    setSwitching(null)
  }

  async function handleAccept(token: string) {
    if (!adapters.organizations?.acceptInvitation) return
    setActingToken(token)
    const res = await adapters.organizations.acceptInvitation(token)
    if (res.error) { setInvitationsError(res.error); setActingToken(null); return }
    if (res.data) setContext(res.data)
    setInvitations((prev) => (prev ?? []).filter((i) => i.token !== token))
    setActingToken(null)
  }

  async function handleDecline(token: string) {
    if (!adapters.organizations?.declineInvitation) return
    setActingToken(token)
    const res = await adapters.organizations.declineInvitation(token)
    if (res.error) { setInvitationsError(res.error); setActingToken(null); return }
    setInvitations((prev) => (prev ?? []).filter((i) => i.token !== token))
    setActingToken(null)
  }

  async function handleEnterCode(e: React.FormEvent) {
    e.preventDefault()
    if (!adapters.organizations?.acceptInvitation || !code.trim()) return
    setCodeSubmitting(true)
    setCodeError(null)
    const res = await adapters.organizations.acceptInvitation(code.trim())
    if (res.error) { setCodeError(res.error); setCodeSubmitting(false); return }
    if (res.data) setContext(res.data)
    setCode('')
    setCodeSubmitting(false)
    loadInvitations()
  }

  async function handleLeave(organizationId: string) {
    if (!adapters.organizations?.leaveOrganization) return
    if (!window.confirm('Leave this organization? You will lose access to any organization-scoped content.')) return
    setLeavingOrgId(organizationId)
    const res = await adapters.organizations.leaveOrganization(organizationId)
    if (res.error) { setContextError(res.error); setLeavingOrgId(null); return }
    if (res.data) setContext(res.data)
    setLeavingOrgId(null)
  }

  if (context === undefined) return <div className="h-24 bg-[var(--surface,#12121a)] rounded-[10px] animate-pulse" />

  if (contextError) {
    return (
      <div className="aka-card p-4" role="alert">
        <p className="text-sm text-red-400">Couldn&apos;t load organization context: {contextError}</p>
        <button onClick={loadContext} className="mt-2 text-sm text-[var(--gold,#d4af5f)]">Try again</button>
      </div>
    )
  }

  const canListInvitations = Boolean(adapters.organizations?.listInvitations)
  const canAccept = Boolean(adapters.organizations?.acceptInvitation)
  const canDecline = Boolean(adapters.organizations?.declineInvitation)
  const canLeave = Boolean(adapters.organizations?.leaveOrganization)

  return (
    <div className="space-y-6">
      {canListInvitations && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-[var(--text-primary,#f5f2ea)]">Pending invitations</h3>
          {invitationsError ? (
            <div className="aka-card p-4" role="alert">
              <p className="text-sm text-red-400">Couldn&apos;t load invitations: {invitationsError}</p>
              <button onClick={loadInvitations} className="mt-2 text-sm text-[var(--gold,#d4af5f)]">Try again</button>
            </div>
          ) : invitations === undefined ? (
            <div className="h-16 bg-[var(--surface,#12121a)] rounded-[10px] animate-pulse" />
          ) : invitations.length === 0 ? (
            <div className="aka-card p-4">
              <p className="text-sm text-[var(--text-dim,#8b8b98)]">No pending invitations.</p>
            </div>
          ) : (
            invitations.map((inv) => (
              <div key={inv.id} className="aka-card p-4 space-y-2">
                <p className="text-sm text-[var(--text-primary,#f5f2ea)]">
                  Invitation to join <span className="font-medium">{inv.organizationName}</span>
                </p>
                <p className="text-xs text-[var(--text-dim,#8b8b98)] capitalize">
                  Role: {inv.role}
                  {inv.invitedByEmail && ` · invited by ${inv.invitedByEmail}`}
                  {` · expires ${new Date(inv.expiresAt).toLocaleDateString()}`}
                </p>
                <div className="flex gap-3">
                  {canAccept && (
                    <button
                      onClick={() => handleAccept(inv.token)}
                      disabled={actingToken !== null}
                      className="text-sm text-[var(--gold,#d4af5f)] disabled:opacity-50"
                    >
                      {actingToken === inv.token ? 'Accepting…' : 'Accept'}
                    </button>
                  )}
                  {canDecline && (
                    <button
                      onClick={() => handleDecline(inv.token)}
                      disabled={actingToken !== null}
                      className="text-sm text-[var(--text-dim,#8b8b98)] disabled:opacity-50"
                    >
                      {actingToken === inv.token ? 'Declining…' : 'Decline'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {canAccept && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-[var(--text-primary,#f5f2ea)]">Enter invitation code</h3>
          <form onSubmit={handleEnterCode} className="aka-card p-4 flex gap-3 items-center">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Invitation code"
              className="flex-1 bg-transparent border-b border-[var(--text-dim,#8b8b98)]/40 text-sm text-[var(--text-primary,#f5f2ea)] focus:outline-none py-1"
            />
            <button
              type="submit"
              disabled={codeSubmitting || !code.trim()}
              className="text-sm text-[var(--gold,#d4af5f)] disabled:opacity-50"
            >
              {codeSubmitting ? 'Submitting…' : 'Join'}
            </button>
          </form>
          {codeError && <p className="text-sm text-red-400" role="alert">{codeError}</p>}
        </section>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-[var(--text-primary,#f5f2ea)]">Organizations</h3>
        <p className="text-xs text-[var(--text-dim,#8b8b98)]">
          Current Organization: <span className="text-[var(--text-primary,#f5f2ea)]">
            {context && context.currentOrganizationId
              ? (context.memberships.find((m) => m.organizationId === context.currentOrganizationId)?.organizationName ?? 'Personal')
              : 'Personal'}
          </span>
        </p>
        {!context || context.memberships.length === 0 ? (
          <div className="aka-card p-4">
            <p className="text-sm text-[var(--text-primary,#f5f2ea)]">
              Your account currently uses Personal context. Organization memberships will appear here when you join through an invitation.
            </p>
          </div>
        ) : (
          <>
            <div className={`aka-card p-4 flex items-center justify-between ${context.currentOrganizationId === null ? 'border-[var(--gold,#d4af5f)]/60' : ''}`}>
              <span className="text-sm text-[var(--text-primary,#f5f2ea)]">Personal</span>
              {context.currentOrganizationId === null ? (
                <span className="text-xs text-[var(--gold,#d4af5f)]">Current</span>
              ) : (
                <button
                  onClick={() => handleSwitch(null)}
                  disabled={switching !== null}
                  className="text-sm text-[var(--gold,#d4af5f)] disabled:opacity-50"
                >
                  {switching === 'personal' ? 'Switching…' : 'Switch'}
                </button>
              )}
            </div>
            {context.memberships.map((m) => {
              const isCurrent = m.organizationId === context.currentOrganizationId
              return (
                <div key={m.organizationId} className={`aka-card p-4 flex items-center justify-between ${isCurrent ? 'border-[var(--gold,#d4af5f)]/60' : ''}`}>
                  <div>
                    <p className="text-sm text-[var(--text-primary,#f5f2ea)]">{m.organizationName}</p>
                    <p className="text-xs text-[var(--text-dim,#8b8b98)] mt-0.5 capitalize">
                      Role: {m.role} · via {m.source}
                      {m.validFrom && ` · since ${new Date(m.validFrom).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isCurrent ? (
                      <span className="text-xs text-[var(--gold,#d4af5f)]">Current</span>
                    ) : (
                      <button
                        onClick={() => handleSwitch(m.organizationId)}
                        disabled={switching !== null}
                        className="text-sm text-[var(--gold,#d4af5f)] disabled:opacity-50"
                      >
                        {switching === m.organizationId ? 'Switching…' : 'Switch'}
                      </button>
                    )}
                    {canLeave && (
                      <button
                        onClick={() => handleLeave(m.organizationId)}
                        disabled={leavingOrgId !== null}
                        className="text-sm text-red-400 disabled:opacity-50"
                      >
                        {leavingOrgId === m.organizationId ? 'Leaving…' : 'Leave'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </section>
    </div>
  )
}
