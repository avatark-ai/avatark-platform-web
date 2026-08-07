'use client'
import { useEffect, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { LivingWorld } from '../contracts/adapters.ts'

// Platform-level concept (Platform RC, Phase 2; enriched in Runtime Kernel
// Host Integration, Sprint 4) -- this component renders whatever the
// host's LivingWorldsAdapter returns, generically. No world name,
// franchise, or product-specific logic is hardcoded here; a host with no
// adapter simply doesn't get this tab (gated in AvatarKAccount.tsx). The
// optional fields (currentLocation/lastVisitAt/recentActivity/
// upcomingPracticeCount/reflectionCount/canContinue) and the optional
// `enter` action render only when the host's adapter actually supplies
// them -- a host still on the original 5-field contract sees exactly what
// it saw before this sprint.
export function LivingWorldsTab() {
  const adapters = useAccountAdapters()
  const [worlds, setWorlds] = useState<LivingWorld[] | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [enteringId, setEnteringId] = useState<string | null>(null)

  function load() {
    if (!adapters.livingWorlds) { setWorlds(null); return }
    adapters.livingWorlds.list().then((res) => {
      if (res.error) { setError(res.error); return }
      setError(null)
      setWorlds(res.data ?? [])
    })
  }

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => { if (!cancelled) load() })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapters])

  async function handleContinue(worldId: string) {
    if (!adapters.livingWorlds?.enter) return
    setEnteringId(worldId)
    try {
      await adapters.livingWorlds.enter(worldId)
      load()
    } finally {
      setEnteringId(null)
    }
  }

  if (worlds === undefined) return <div className="h-40 bg-[var(--surface,#12121a)] rounded-[10px] animate-pulse" />

  if (error) {
    return (
      <div className="aka-card p-4" role="alert">
        <p className="text-sm text-red-400">Couldn&apos;t load Living Worlds: {error}</p>
        <button onClick={load} className="mt-2 text-sm text-[var(--gold,#d4af5f)]">Try again</button>
      </div>
    )
  }

  if (!worlds || worlds.length === 0) {
    return (
      <div className="aka-card p-4">
        <p className="text-sm text-[var(--text-dim,#8b8b98)]">No Living Worlds are available yet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {worlds.map((w) => (
        <div key={w.id} className="aka-card p-4 space-y-1.5">
          <p className="text-sm font-medium text-[var(--text-primary,#f5f2ea)]">{w.name}</p>
          <p className="text-xs text-[var(--gold,#d4af5f)]">{w.status}</p>
          {w.description && <p className="text-xs text-[var(--text-dim,#8b8b98)]">{w.description}</p>}
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-dim,#8b8b98)] pt-1">Progress: {w.progress}</p>
          {w.currentLocation != null && (
            <p className="text-xs text-[var(--text-dim,#8b8b98)]">Current location: {w.currentLocation}</p>
          )}
          {w.lastVisitAt != null && (
            <p className="text-xs text-[var(--text-dim,#8b8b98)]">Last visit: {w.lastVisitAt}</p>
          )}
          {w.recentActivity != null && (
            <p className="text-xs text-[var(--text-dim,#8b8b98)]">{w.recentActivity}</p>
          )}
          {(w.upcomingPracticeCount != null || w.reflectionCount != null) && (
            <p className="text-[10px] text-[var(--text-dim,#8b8b98)]">
              {w.upcomingPracticeCount ?? 0} upcoming practice{w.upcomingPracticeCount === 1 ? '' : 's'} ·{' '}
              {w.reflectionCount ?? 0} reflection{w.reflectionCount === 1 ? '' : 's'}
            </p>
          )}
          {adapters.livingWorlds?.enter && (
            <button
              onClick={() => handleContinue(w.id)}
              disabled={enteringId === w.id}
              className="mt-2 text-xs font-medium text-[var(--gold,#d4af5f)] disabled:opacity-50"
            >
              {enteringId === w.id ? 'Entering…' : w.canContinue ? 'Continue' : 'Begin'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
