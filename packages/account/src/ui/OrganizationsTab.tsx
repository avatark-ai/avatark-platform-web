'use client'
import { useEffect, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { AccountOrganizationContext } from '../contracts/adapters.ts'

// Minimal canonical organization-context view (Part 7) -- not an
// organization-admin surface. Personal context is the honest default when
// no organization adapter exists or the user has no memberships; real
// memberships are never fabricated for display purposes.
export function OrganizationsTab() {
  const adapters = useAccountAdapters()
  const [context, setContext] = useState<AccountOrganizationContext | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [switching, setSwitching] = useState<string | null>(null)

  function load() {
    if (!adapters.organizations) { setContext(null); return }
    adapters.organizations.get().then((res) => {
      if (res.error) { setError(res.error); return }
      setContext(res.data ?? null)
    })
  }

  useEffect(() => {
    // Deferred to a microtask so nothing runs synchronously within the
    // effect body itself (react-hooks/set-state-in-effect) -- same fix
    // shape as PrivacyTab.tsx. `load` itself still calls setState
    // directly when invoked from the "Try again" button, which is a
    // legitimate event handler, not an effect.
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) load()
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapters])

  async function handleSwitch(organizationId: string | null) {
    if (!adapters.organizations) return
    setSwitching(organizationId ?? 'personal')
    const res = await adapters.organizations.switchOrganization(organizationId)
    if (res.data) setContext(res.data)
    if (res.error) setError(res.error)
    setSwitching(null)
  }

  if (context === undefined) return <div className="h-24 bg-[var(--surface,#12121a)] rounded-[10px] animate-pulse" />

  if (error) {
    return (
      <div className="aka-card p-4" role="alert">
        <p className="text-sm text-red-400">Couldn&apos;t load organization context: {error}</p>
        <button onClick={load} className="mt-2 text-sm text-[var(--gold,#d4af5f)]">Try again</button>
      </div>
    )
  }

  if (!context || context.memberships.length === 0) {
    return (
      <div className="aka-card p-4">
        <p className="text-sm text-[var(--text-primary,#f5f2ea)]">
          Your account currently uses Personal context. Organization memberships will appear here when you join through an invitation or approved organization.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
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
          </div>
        )
      })}
    </div>
  )
}
