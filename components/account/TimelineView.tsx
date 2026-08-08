'use client'
import { useEffect, useState } from 'react'

// Runtime Kernel Host Integration (Sprint 4), Phase 4. Real user history
// only, from @avatark/experience-registry via /api/account/timeline --
// newest first (the registry's own listRecentEvents already orders this
// way; never re-sorted or aggregated here). No analytics: this view lists
// events, it never counts/segments/charts them.
type TimelineEvent = {
  id: string
  type: string
  occurredAt: string
  target?: { type: string; id: string }
}

// Named event kinds this sprint's mission calls out explicitly -- shown
// for readability only; @avatark/experience-registry accepts any
// well-formed "namespace.verb_phrase" string beyond this list (see
// docs/RUNTIME_KERNEL_IMPLEMENTATION.md), so an unlisted type still
// renders (humanized), it just isn't given a bespoke label here.
const EVENT_LABELS: Record<string, string> = {
  started: 'Started',
  'world.entered': 'Entered World',
  'world.left': 'Left World',
  'world.location_visited': 'Visited Location',
  practice_started: 'Practice Started',
  'practice.started': 'Practice Started',
  practice_finished: 'Practice Completed',
  'practice.completed': 'Practice Completed',
  'reflection.created': 'Reflection Added',
  milestone_reached: 'Milestone',
  'challenge.started': 'Challenge Started',
  'challenge.completed': 'Challenge',
  episode_completed: 'Episode Completed',
  'episode.completed': 'Episode Completed',
}

function labelFor(type: string): string {
  if (EVENT_LABELS[type]) return EVENT_LABELS[type]
  const words = type.split(/[._]/).filter(Boolean)
  if (words.length === 0) return type
  const [first, ...rest] = words
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(' ')
}

// devUser: see components/account/ExperienceView.tsx's identical prop.
export function TimelineView({ apiBase = '/api/account', devUser }: { apiBase?: string; devUser?: string }) {
  const [events, setEvents] = useState<TimelineEvent[] | null | undefined>(undefined)
  const devUserQuery = devUser ? `?dev_user=${encodeURIComponent(devUser)}` : ''

  useEffect(() => {
    let cancelled = false
    fetch(`${apiBase}/timeline${devUserQuery}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => { if (!cancelled) setEvents(json?.events ?? null) })
      .catch(() => { if (!cancelled) setEvents(null) })
    return () => { cancelled = true }
  }, [apiBase, devUserQuery])

  if (events === undefined) {
    return <div className="h-32 w-full max-w-md animate-pulse rounded-md" style={{ background: 'var(--surface-line)' }} />
  }
  if (events === null) {
    return <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Your timeline isn&apos;t available right now.</p>
  }
  if (events.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--text-dim)' }}>No History Yet.</p>
  }

  return (
    <div className="flex max-w-md flex-col gap-3 text-sm leading-6" style={{ color: 'var(--text-dim)' }}>
      <p style={{ color: 'var(--paper)' }}>Timeline</p>
      <ol className="flex flex-col gap-2">
        {events.map((event) => (
          <li key={event.id} className="border-l-2 pl-3" style={{ borderColor: 'var(--surface-line)' }}>
            <p style={{ color: 'var(--paper)' }}>{labelFor(event.type)}</p>
            {event.target && <p className="text-xs">{event.target.type}: {event.target.id}</p>}
            <p className="text-xs">{new Date(event.occurredAt).toLocaleString()}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
