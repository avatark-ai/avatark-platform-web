'use client'
import { useEffect, useState } from 'react'

// Runtime Kernel Host Integration (Sprint 5, Living Vrindavan vertical
// slice). Generic over any world id -- no location name, franchise, or
// graph shape is hardcoded here. Everything renders from whatever
// AccountLivingWorldSummary the host's living-worlds API returns for this
// worldId: current location, legal next locations (derived server-side
// from the world's own authored graph), and an authored reflection
// prompt when the current location carries one. A world with no such
// data (the four other, still-generic-fixture-backed worlds) renders the
// same honest empty states this component already shows a fresh user.
type WorldSummary = {
  id: string
  name: string
  status: string
  description: string
  progress: string
  currentLocation: string | null
  currentLocationId: string | null
  canContinue: boolean
  nextLocations: { id: string; name: string }[]
  currentReflectionPrompt: string | null
}

type ListResponse = { worlds?: WorldSummary[]; error?: string }

const ACTION_BUTTON_CLASS =
  'self-start rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50'
const FOCUS_STYLE = { outlineColor: 'var(--gold)' } as const

function ActionButton({ label, onClick, pending }: { label: string; onClick: () => void; pending: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={pending} className={ACTION_BUTTON_CLASS} style={{ background: 'var(--gold)', color: 'var(--midnight)', ...FOCUS_STYLE }}>
      {label}
    </button>
  )
}

// devUser: see components/account/ExperienceView.tsx's identical prop.
export function LivingWorldDetailView({ worldId, apiBase = '/api/account', devUser }: { worldId: string; apiBase?: string; devUser?: string }) {
  const [world, setWorld] = useState<WorldSummary | null | undefined>(undefined)
  const [pending, setPending] = useState(false)
  const devUserQuery = devUser ? `?dev_user=${encodeURIComponent(devUser)}` : ''

  async function load() {
    try {
      const res = await fetch(`${apiBase}/living-worlds${devUserQuery}`)
      const json: ListResponse = await res.json().catch(() => ({}))
      if (!res.ok) { setWorld(null); return }
      setWorld(json.worlds?.find((w) => w.id === worldId) ?? null)
    } catch {
      setWorld(null)
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => { if (!cancelled) load() })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, worldId])

  async function act(action: string, locationId?: string) {
    setPending(true)
    try {
      const res = await fetch(`${apiBase}/living-worlds${devUserQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, worldId, locationId }),
      })
      if (res.ok) await load()
    } finally {
      setPending(false)
    }
  }

  if (world === undefined) {
    return <div className="h-32 w-full max-w-md animate-pulse rounded-md" style={{ background: 'var(--surface-line)' }} />
  }
  if (world === null) {
    return <p className="text-sm" style={{ color: 'var(--text-dim)' }}>This Living World isn&apos;t available right now.</p>
  }

  if (!world.canContinue) {
    return (
      <div className="flex max-w-md flex-col gap-3 text-sm leading-6" style={{ color: 'var(--text-dim)' }}>
        <p style={{ color: 'var(--paper)' }}>{world.name}</p>
        <p>You haven&apos;t entered this Living World yet.</p>
        <ActionButton label="Enter" pending={pending} onClick={() => act('enter')} />
      </div>
    )
  }

  // canContinue is true once a user has ever entered -- it does not mean
  // "currently active" (see WorldAccountSummary's own doc comment). After
  // Leave, status flips to "Not Active" but location/progress are
  // preserved; offer to resume (re-enter, which the runtime resumes at
  // the same location rather than resetting) instead of showing
  // Reflect/Next/Leave for a world the user isn't currently in.
  if (world.status !== 'Active') {
    return (
      <div className="flex max-w-md flex-col gap-3 text-sm leading-6" style={{ color: 'var(--text-dim)' }}>
        <p style={{ color: 'var(--paper)' }}>{world.name}</p>
        <p>Status: {world.status} &middot; Progress: {world.progress}</p>
        <p>Last location: {world.currentLocation ?? 'Not Started'}</p>
        <ActionButton label="Continue" pending={pending} onClick={() => act('enter')} />
      </div>
    )
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6 text-sm leading-6" style={{ color: 'var(--text-dim)' }}>
      <div>
        <p style={{ color: 'var(--paper)' }}>{world.name}</p>
        <p>Status: {world.status} &middot; Progress: {world.progress}</p>
      </div>

      <div>
        <p style={{ color: 'var(--paper)' }}>Current Location</p>
        <p>{world.currentLocation ?? 'Not Started'}</p>
      </div>

      {world.currentReflectionPrompt && (
        <div>
          <p style={{ color: 'var(--paper)' }}>Reflection</p>
          <p>{world.currentReflectionPrompt}</p>
          <ActionButton
            label="Reflect"
            pending={pending}
            onClick={() => act('reflect', world.currentLocationId ?? undefined)}
          />
        </div>
      )}

      <div>
        <p style={{ color: 'var(--paper)' }}>Next</p>
        {world.nextLocations.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-2">
            {world.nextLocations.map((loc) => (
              <ActionButton key={loc.id} label={`Visit ${loc.name}`} pending={pending} onClick={() => act('visit', loc.id)} />
            ))}
          </div>
        ) : (
          <p>Nowhere new to go from here yet.</p>
        )}
      </div>

      <ActionButton label="Leave" pending={pending} onClick={() => act('leave')} />
    </div>
  )
}
