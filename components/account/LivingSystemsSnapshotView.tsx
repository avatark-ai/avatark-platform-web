'use client'
import { useEffect, useState } from 'react'
import { labelizeLifecyclePhase, presentSeason, summarizeEnvironment } from '@/lib/renderer/webWorldSystemsRenderer'

// Sprint 7, Phase 14: the web reference/diagnostic renderer for the
// causal World Snapshot -- deliberately a separate, small component from
// LivingWorldDetailView (Sprint 5/6's visitor-journey view), not a
// rewrite of it. Living Systems' shared world state (season/environment/
// entities/encounters) is a peer concern to the experience layer, not a
// replacement for it -- both read the SAME current location
// independently, each through its own API route, exactly the "renderer
// requests, Living Systems resolves" boundary Sprint 7 establishes. This
// component never writes world truth: no action here mutates
// season/weather/entities, only GETs a resolved, already-immutable
// WorldSnapshot.
type WorldSnapshotView = {
  worldId: string
  simulationTick: number
  locationId: string
  season: { id: string; name: string }
  weather: { temperatureBand: string; precipitationBand: string; humidityBand: string }
  hydrology: { hydrologyBand: string; soilMoistureBand: string }
  ecology: { vegetationActivityBand: string; animalActivityBand: string }
  presentEntities: { id: string; lifecyclePhase: string }[]
  availableEncounters: { ruleId: string; category: string }[]
  visitorContext: { lastLocationId: string | null }
}

type ListResponse = { worlds?: { id: string; currentLocationId: string | null }[] }
type SnapshotResponse = { snapshot?: WorldSnapshotView; error?: string }

export function LivingSystemsSnapshotView({ worldId, apiBase = '/api/account', devUser }: { worldId: string; apiBase?: string; devUser?: string }) {
  const [snapshot, setSnapshot] = useState<WorldSnapshotView | null | undefined>(undefined)
  const devUserParam = devUser ? encodeURIComponent(devUser) : null

  async function load() {
    try {
      const listRes = await fetch(`${apiBase}/living-worlds${devUserParam ? `?dev_user=${devUserParam}` : ''}`)
      const listJson: ListResponse = await listRes.json().catch(() => ({}))
      const world = listJson.worlds?.find((w) => w.id === worldId)
      if (!listRes.ok || !world?.currentLocationId) {
        setSnapshot(null)
        return
      }

      const params = new URLSearchParams({ locationId: world.currentLocationId })
      if (devUserParam) params.set('dev_user', devUser!)
      const snapshotRes = await fetch(`${apiBase}/living-vrindavan/world-snapshot?${params.toString()}`)
      const snapshotJson: SnapshotResponse = await snapshotRes.json().catch(() => ({}))
      setSnapshot(snapshotRes.ok ? snapshotJson.snapshot ?? null : null)
    } catch {
      setSnapshot(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) load()
    })
    // A light poll, not fake real-time: the shared world this panel
    // reads can change for reasons entirely outside this component's
    // own control (the visitor's own navigation in the sibling
    // LivingWorldDetailView, or the world's own simulation advancing
    // independent of any visitor) -- neither of which this component
    // observes directly, being deliberately decoupled from it (Sprint 7,
    // Phase 13: a renderer only ever reads resolved state, it doesn't
    // orchestrate it). The manual Refresh button remains for an
    // on-demand check; this interval is the restrained default so the
    // panel doesn't go silently stale between clicks.
    const interval = setInterval(() => {
      if (!cancelled) load()
    }, 1500)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, worldId, devUser])

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
        <h3 style={{ color: 'var(--paper)' }}>World Systems</h3>
        <button
          type="button"
          onClick={() => load()}
          className="rounded-md px-2 py-1 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ border: '1px solid var(--surface-line)', color: 'var(--text-dim)', outlineColor: 'var(--gold)' }}
        >
          Refresh
        </button>
      </div>

      <p className="text-xs" style={{ color: presentation.accentColor }} aria-live="polite">
        Season: {presentation.seasonLabel}
      </p>

      <p className="text-xs">{summarizeEnvironment(snapshot.weather, snapshot.hydrology, snapshot.ecology)}</p>

      {snapshot.presentEntities.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
          Present: {snapshot.presentEntities.map((e) => labelizeLifecyclePhase(e.lifecyclePhase)).join(', ')}
        </p>
      )}

      <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
        {snapshot.availableEncounters.length > 0
          ? `Available: ${snapshot.availableEncounters.map((e) => e.category).join(', ')}`
          : 'Nothing environmentally available here right now.'}
      </p>
    </div>
  )
}
