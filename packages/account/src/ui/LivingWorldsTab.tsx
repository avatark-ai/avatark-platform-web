'use client'
import { useEffect, useState } from 'react'
import { useAccountAdapters } from '../contracts/context.tsx'
import type { LivingWorld } from '../contracts/adapters.ts'

// Platform-level concept (Platform RC, Phase 2) -- this component renders
// whatever the host's LivingWorldsAdapter returns, generically. No world
// name, franchise, or product-specific logic is hardcoded here; a host with
// no adapter simply doesn't get this tab (gated in AvatarKAccount.tsx).
export function LivingWorldsTab() {
  const adapters = useAccountAdapters()
  const [worlds, setWorlds] = useState<LivingWorld[] | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

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
          <p className="text-xs text-[var(--text-dim,#8b8b98)]">{w.description}</p>
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-dim,#8b8b98)] pt-1">Progress: {w.progress}</p>
        </div>
      ))}
    </div>
  )
}
