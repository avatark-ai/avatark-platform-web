'use client'
import { useEffect, useState } from 'react'
import { presentSeason } from '@/lib/renderer/webWorldSystemsRenderer'
import { transitionLabel } from '@/lib/renderer/webExperienceRenderer'
import { labelizeActivityHint, labelizeInteractionAffordance, summarizeEnvironmentPresentation } from '@/lib/renderer/webEmbodimentRenderer'
import type { TransitionAffordance } from '@avatark/renderer-contracts'

// Sprint 7 introduced this panel reading Living Systems' raw WorldSnapshot
// directly. Sprint 8, Phase 11 requires the Web reference renderer to
// "consume the embodiment contract rather than bypassing it and reading
// simulation internals directly" -- so this component now sources from
// /living-vrindavan/embodiment-snapshot (the WorldEmbodimentSnapshot,
// Sprint 8) instead. A single fetch now suffices (the embodiment route
// already resolves the visitor's current location server-side), where
// the Sprint 7 version needed two. Still a deliberately separate, small
// component from LivingWorldDetailView -- this panel never writes world
// truth, it only GETs an already-immutable, already-resolved snapshot.
type EmbodiedRegionView = {
  locationId: string
  name: string
  environment: {
    atmosphere: { semantic: string }
    water: { semantic: string }
    vegetation: { semantic: string }
    sensoryCues: { channel: string; semantic: string }[]
  }
  entities: { entityId: string; presentationArchetype: string; activityHint: string }[]
  encounters: { ruleId: string; category: string; interactionAffordance: string }[]
}

type WorldEmbodimentSnapshotView = {
  season: { id: string; name: string }
  current: EmbodiedRegionView
  reachable: EmbodiedRegionView[]
  transitions: { toLocationId: string; affordance: TransitionAffordance | null }[]
  visitorContext: { lastLocationId: string | null; reflectionCount: number }
}

type SnapshotResponse = { snapshot?: WorldEmbodimentSnapshotView; error?: string }

export function LivingSystemsSnapshotView({ worldId, apiBase = '/api/account', devUser }: { worldId: string; apiBase?: string; devUser?: string }) {
  const [snapshot, setSnapshot] = useState<WorldEmbodimentSnapshotView | null | undefined>(undefined)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const devUserParam = devUser ? encodeURIComponent(devUser) : null

  async function load() {
    try {
      const params = new URLSearchParams()
      if (devUserParam) params.set('dev_user', devUser!)
      if (soundEnabled) params.set('soundEnabled', 'true')
      const res = await fetch(`${apiBase}/living-vrindavan/embodiment-snapshot?${params.toString()}`)
      const json: SnapshotResponse = await res.json().catch(() => ({}))
      setSnapshot(res.ok ? json.snapshot ?? null : null)
    } catch {
      setSnapshot(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) load()
    })
    // A light poll, not fake real-time -- see this file's own header
    // comment for why this panel is deliberately decoupled from the
    // sibling LivingWorldDetailView's own navigation.
    const interval = setInterval(() => {
      if (!cancelled) load()
    }, 1500)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, worldId, devUser, soundEnabled])

  if (snapshot === undefined) {
    return <div className="h-24 w-full max-w-md animate-pulse rounded-md" style={{ background: 'var(--surface-line)' }} />
  }
  if (snapshot === null) {
    return null
  }

  const presentation = presentSeason(snapshot.season.id, snapshot.season.name)

  return (
    <div
      className="flex max-w-2xl flex-col gap-3 rounded-lg p-4 text-sm leading-6"
      style={{
        color: 'var(--text-dim)',
        boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${presentation.accentColor} 25%, transparent)`,
      }}
    >
      <div className="flex items-center justify-between">
        <h3 style={{ color: 'var(--paper)' }}>World Embodiment</h3>
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={soundEnabled}
            onClick={() => setSoundEnabled((v) => !v)}
            className="rounded-md px-2 py-1 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ border: '1px solid var(--surface-line)', color: 'var(--text-dim)', outlineColor: 'var(--gold)' }}
          >
            {soundEnabled ? 'Ambient sound: On' : 'Ambient sound: Off'}
          </button>
          <button
            type="button"
            onClick={() => load()}
            className="rounded-md px-2 py-1 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ border: '1px solid var(--surface-line)', color: 'var(--text-dim)', outlineColor: 'var(--gold)' }}
          >
            Refresh
          </button>
        </div>
      </div>

      <p className="text-xs" style={{ color: presentation.accentColor }} aria-live="polite">
        {snapshot.current.name} &middot; Season: {presentation.seasonLabel}
      </p>

      <p className="text-xs">{summarizeEnvironmentPresentation(snapshot.current.environment)}</p>

      {soundEnabled && snapshot.current.environment.sensoryCues.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
          Ambient: {snapshot.current.environment.sensoryCues.map((c) => c.semantic).join(', ')}
        </p>
      )}

      {snapshot.current.entities.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
          Present: {snapshot.current.entities.map((e) => `${e.presentationArchetype} (${labelizeActivityHint(e.activityHint)})`).join(', ')}
        </p>
      )}

      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
        {snapshot.current.encounters.length > 0
          ? `Available: ${snapshot.current.encounters.map((e) => labelizeInteractionAffordance(e.interactionAffordance)).join(', ')}`
          : 'Nothing environmentally available here right now.'}
      </p>

      {snapshot.reachable.length > 0 && (
        <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
          {snapshot.transitions.map((t) => {
            const region = snapshot.reachable.find((r) => r.locationId === t.toLocationId)
            if (!region) return null
            return (
              <p key={t.toLocationId}>
                {transitionLabel(t.affordance)} to {region.name}: {region.environment.atmosphere.semantic}
              </p>
            )
          })}
        </div>
      )}

      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
        Reflections so far: {snapshot.visitorContext.reflectionCount}
      </p>
    </div>
  )
}
