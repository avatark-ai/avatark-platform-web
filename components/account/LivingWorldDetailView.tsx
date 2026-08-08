'use client'
import { useEffect, useState } from 'react'
import { renderLocationForWeb, transitionLabel } from '@/lib/renderer/webExperienceRenderer'
import type { LocationExperience, TransitionAffordance } from '@avatark/renderer-contracts'

// Runtime Kernel Host Integration (Sprint 5, Living Vrindavan vertical
// slice; evolved Sprint 6 with a renderer-neutral Experience Description
// layer). Generic over any world id -- no location name, franchise, or
// graph shape is hardcoded here. Everything renders from whatever
// AccountLivingWorldSummary the host's living-worlds API returns for this
// worldId: current location, legal next locations (derived server-side
// from the world's own authored graph), an authored reflection prompt
// when the current location carries one, and (Sprint 6) a renderer-
// neutral `currentLocationExperience`/`nextLocations[].experience` this
// component maps through @avatark/renderer-contracts' RendererAdapter
// contract into concrete, web-only presentation -- never the other way
// around. A world with no such data (the four other, still-generic-
// fixture-backed worlds) renders the same honest empty states this
// component already showed before Sprint 6, with zero visual
// differentiation -- an absence, never a fabrication.
type WorldSummary = {
  id: string
  name: string
  status: string
  description: string
  progress: string
  currentLocation: string | null
  currentLocationId: string | null
  canContinue: boolean
  nextLocations: { id: string; name: string; experience: LocationExperience | null; transitionAffordance: TransitionAffordance | null }[]
  currentReflectionPrompt: string | null
  currentLocationExperience: LocationExperience | null
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

// Reads and tracks the viewer's OS-level reduced-motion preference. The
// site-wide `@media (prefers-reduced-motion: reduce)` rule in
// app/globals.css already collapses every CSS transition/animation
// duration to ~0 regardless of this value -- this hook exists for the
// smaller set of decisions that are about whether to compute/render
// something at all (ambient-motion capability negotiation), not merely
// how long a CSS transition takes.
function useReducedMotionPreference(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(query.matches)
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return reduced
}

// devUser: see components/account/ExperienceView.tsx's identical prop.
export function LivingWorldDetailView({ worldId, apiBase = '/api/account', devUser }: { worldId: string; apiBase?: string; devUser?: string }) {
  const [world, setWorld] = useState<WorldSummary | null | undefined>(undefined)
  const [pending, setPending] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  // Sprint 6's "location transition" world-presence signal: a soft
  // cross-fade whenever currentLocationId changes, rather than an
  // instant content swap. Same one-frame-delay mount pattern
  // @avatark/motion's PageEnter already uses elsewhere in this app.
  const [locationVisible, setLocationVisible] = useState(true)
  const reducedMotionPreferred = useReducedMotionPreference()
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

  useEffect(() => {
    setLocationVisible(false)
    const id = requestAnimationFrame(() => setLocationVisible(true))
    return () => cancelAnimationFrame(id)
  }, [world?.currentLocationId])

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
        <h2 style={{ color: 'var(--paper)' }}>{world.name}</h2>
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
        <h2 style={{ color: 'var(--paper)' }}>{world.name}</h2>
        <p>Status: {world.status} &middot; Progress: {world.progress}</p>
        <p>Last location: {world.currentLocation ?? 'Not Started'}</p>
        <ActionButton label="Continue" pending={pending} onClick={() => act('enter')} />
      </div>
    )
  }

  // Sprint 6: the one and only place this component crosses the renderer
  // boundary -- an authored LocationExperience (renderer-neutral) goes in,
  // a web-only presentation (color, labels, a caption) comes out. A world
  // with no Experience Description authored yet (present === null) falls
  // through to the exact same layout this component rendered before
  // Sprint 6, with no accent, no atmosphere line, no sound toggle.
  const presentation = world.currentLocationExperience
    ? renderLocationForWeb(world.currentLocationExperience, { reducedMotionPreferred, soundEnabled })
    : null

  const cardBackground = presentation
    ? `radial-gradient(120% 140% at 15% 0%, color-mix(in oklch, ${presentation.accentColor} 16%, transparent), transparent 60%)`
    : undefined

  return (
    <div
      className="flex max-w-2xl flex-col gap-6 rounded-lg p-6 text-sm leading-6"
      style={{
        color: 'var(--text-dim)',
        background: cardBackground,
        boxShadow: presentation ? `inset 0 0 0 1px color-mix(in oklch, ${presentation.accentColor} 22%, transparent)` : undefined,
        transition: `background ${presentation?.transitionDurationMs ?? 400}ms ease, box-shadow ${presentation?.transitionDurationMs ?? 400}ms ease`,
      }}
    >
      <div>
        <h2 style={{ color: 'var(--paper)' }}>{world.name}</h2>
        <p>Status: {world.status} &middot; Progress: {world.progress}</p>
      </div>

      <div
        aria-live="polite"
        style={{ opacity: locationVisible ? 1 : 0, transition: `opacity ${presentation?.transitionDurationMs ?? 400}ms ease` }}
      >
        <h3 style={{ color: 'var(--paper)' }}>Current Location</h3>
        <p>{world.currentLocation ?? 'Not Started'}</p>
        {presentation && (
          <p className="text-xs" style={{ color: presentation.accentColor }}>
            {presentation.biomeLabel} &middot; {presentation.atmosphereLabel}
          </p>
        )}
        {world.currentLocationExperience && world.currentLocationExperience.time.preferredState !== 'unspecified' && (
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{transitionLabelForTime(world.currentLocationExperience.time.preferredState)}</p>
        )}
        {world.currentLocationExperience && world.currentLocationExperience.soundscape.motifs.length > 0 && (
          <button
            type="button"
            aria-pressed={soundEnabled}
            onClick={() => setSoundEnabled((v) => !v)}
            className="mt-2 rounded-md px-2 py-1 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ border: '1px solid var(--surface-line)', color: 'var(--text-dim)', ...FOCUS_STYLE }}
          >
            {soundEnabled ? 'Ambient sound: On' : 'Ambient sound: Off'}
            {soundEnabled && presentation?.soundscapeCaption ? ` — ${presentation.soundscapeCaption}` : ''}
          </button>
        )}
      </div>

      {world.currentReflectionPrompt && (
        <div>
          <h3 style={{ color: 'var(--paper)' }}>Reflection</h3>
          <p>{world.currentReflectionPrompt}</p>
          <ActionButton
            label="Reflect"
            pending={pending}
            onClick={() => act('reflect', world.currentLocationId ?? undefined)}
          />
        </div>
      )}

      <div>
        <h3 style={{ color: 'var(--paper)' }}>{nextSectionHeading(world.nextLocations)}</h3>
        {world.nextLocations.length > 0 ? (
          <div role="group" aria-label="Next locations" className="flex flex-wrap gap-2 mt-2">
            {world.nextLocations.map((loc) => (
              <span key={loc.id} className="inline-flex items-center gap-1.5">
                {loc.experience && (
                  <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: renderLocationForWeb(loc.experience, { reducedMotionPreferred, soundEnabled: false }).accentColor }}
                  />
                )}
                <ActionButton label={`Visit ${loc.name}`} pending={pending} onClick={() => act('visit', loc.id)} />
              </span>
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

function transitionLabelForTime(preferredState: string): string {
  return preferredState.replace(/\b\w/g, (c) => c.toUpperCase())
}

// If every legal next move shares one authored transition affordance,
// name it (e.g. "Choose your path") instead of the generic "Next" -- but
// only when every candidate agrees; a mixed set falls back to the
// neutral heading rather than picking one arbitrarily.
function nextSectionHeading(nextLocations: WorldSummary['nextLocations']): string {
  if (nextLocations.length === 0) return 'Next'
  const [first, ...rest] = nextLocations
  if (rest.every((loc) => loc.transitionAffordance === first.transitionAffordance)) {
    return transitionLabel(first.transitionAffordance)
  }
  return 'Next'
}
