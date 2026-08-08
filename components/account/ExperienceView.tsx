'use client'
import { useEffect, useState } from 'react'
import type { ExperienceProgress, ExperienceTransition } from '@avatark/experience-runtime'
import { AVATARK_WELCOME_JOURNEY } from '@/lib/experienceRuntime/journeyDefinition'

// Runtime Kernel Host Integration (Sprint 4), Phases 3/7/8. Renamed from
// this repo's earlier "JourneyView" using the compatibility aliases
// (ExperienceProgress/ExperienceTransition) @avatark/experience-runtime's
// index.ts already exports for exactly this purpose -- see
// docs/RUNTIME_GLOSSARY.md Part 2. `apiBase` lets the same component serve
// both the real, authenticated /account page and the dev-only,
// unauthenticated preview (this environment has no Supabase project
// configured at all, so the dev preview is the only way to exercise this
// component's real runtime behavior end-to-end here).
const EPISODE_TITLES = new Map(AVATARK_WELCOME_JOURNEY.episodes.map((e) => [e.id, e.title]))
const PRACTICE_TITLES = new Map(AVATARK_WELCOME_JOURNEY.practices.map((p) => [p.id, p.title]))
const MILESTONE_TITLES = new Map(AVATARK_WELCOME_JOURNEY.milestones.map((m) => [m.id, m.title]))
const REFLECTION_PROMPTS = new Map(AVATARK_WELCOME_JOURNEY.reflections.map((r) => [r.id, r.prompt]))

type NarrativeSummary = { status: string; seasonId: string; episodeId: string; sceneId: string } | null

type ExperienceApiResponse = {
  journey: { id: string; title: string }
  progress: ExperienceProgress | null
  history: ExperienceTransition[]
  narrative: NarrativeSummary
}

type ContextSnapshotLike = { fields: { currentPracticeId: { value: string | null } } }

type TimelineEvent = { id: string; type: string; occurredAt: string; target?: { type: string; id: string } }

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

function humanizeEventType(type: string): string {
  const words = type.split(/[._]/).filter(Boolean)
  if (words.length === 0) return type
  const [first, ...rest] = words
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(' ')
}

// devUser is a dev-only convenience (see lib/devOnlyGuard.ts's
// resolveDevUserId) letting Playwright address a guaranteed-fresh id on
// the same in-memory dev singletons, for the empty-state screenshot
// (Phase 9) -- ignored by the real, authenticated /api/account/* routes.
export function ExperienceView({ apiBase = '/api/account', devUser }: { apiBase?: string; devUser?: string }) {
  const [data, setData] = useState<ExperienceApiResponse | null | undefined>(undefined)
  const [activePracticeId, setActivePracticeId] = useState<string | null>(null)
  const [recentEvents, setRecentEvents] = useState<TimelineEvent[] | null>(null)
  const [pending, setPending] = useState(false)
  const devUserQuery = devUser ? `dev_user=${encodeURIComponent(devUser)}` : ''

  async function load(cancelledRef?: { current: boolean }) {
    try {
      const [journeyRes, contextRes, timelineRes] = await Promise.all([
        fetch(`${apiBase}/journey${devUserQuery ? `?${devUserQuery}` : ''}`),
        fetch(`${apiBase}/context${devUserQuery ? `?${devUserQuery}` : ''}`),
        fetch(`${apiBase}/timeline?limit=5${devUserQuery ? `&${devUserQuery}` : ''}`),
      ])
      if (cancelledRef?.current) return
      setData(journeyRes.ok ? await journeyRes.json() : null)
      if (contextRes.ok) {
        const snapshot: ContextSnapshotLike = await contextRes.json()
        if (!cancelledRef?.current) setActivePracticeId(snapshot.fields.currentPracticeId.value)
      }
      if (timelineRes.ok) {
        const { events } = await timelineRes.json()
        if (!cancelledRef?.current) setRecentEvents(events ?? [])
      }
    } catch {
      if (!cancelledRef?.current) setData(null)
    }
  }

  useEffect(() => {
    const cancelledRef = { current: false }
    // Deferred via Promise.resolve().then(...) -- same idiom
    // @avatark/account's CurrentContextCard uses for the identical
    // "call an adapter that eventually setStates" shape from an effect.
    Promise.resolve().then(() => { if (!cancelledRef.current) load(cancelledRef) })
    return () => { cancelledRef.current = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase])

  async function act(action: string, nodeId?: string) {
    setPending(true)
    try {
      const res = await fetch(`${apiBase}/journey${devUserQuery ? `?${devUserQuery}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, nodeId }),
      })
      if (res.ok) await load()
    } finally {
      setPending(false)
    }
  }

  if (data === undefined) {
    return <div className="h-32 w-full max-w-md animate-pulse rounded-md" style={{ background: 'var(--surface-line)' }} />
  }
  if (data === null) {
    return <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Your experience isn&apos;t available right now.</p>
  }

  const { journey, progress, narrative } = data

  if (!progress) {
    return (
      <div className="flex max-w-md flex-col gap-3 text-sm leading-6" style={{ color: 'var(--text-dim)' }}>
        <p style={{ color: 'var(--paper)' }}>{journey.title}</p>
        <p>You haven&apos;t started this experience yet.</p>
        <ActionButton label="Start Experience" pending={pending} onClick={() => act('start')} />
      </div>
    )
  }

  const completedChallenges = progress.completedChallengeIds ?? []
  const completedMilestones = progress.completedMilestoneIds ?? []
  const pendingReflections = progress.pendingReflectionIds ?? []

  return (
    <div className="flex max-w-2xl flex-col gap-6 text-sm leading-6" style={{ color: 'var(--text-dim)' }}>
      <div>
        <p style={{ color: 'var(--paper)' }}>{journey.title}</p>
        <p>Status: {progress.status} &middot; {progress.percentComplete}% complete</p>
        <div className="mt-2 h-2 w-full rounded-full" style={{ background: 'var(--surface-line)' }}>
          <div className="h-2 rounded-full" style={{ width: `${progress.percentComplete}%`, background: 'var(--gold)' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p style={{ color: 'var(--paper)' }}>Episodes</p>
          {progress.completedEpisodeIds.length > 0 ? (
            <ul className="list-inside list-disc">
              {progress.completedEpisodeIds.map((id) => <li key={id}>{EPISODE_TITLES.get(id) ?? id}</li>)}
            </ul>
          ) : (
            <p>No Episodes completed yet.</p>
          )}
          {progress.status === 'active' && progress.nextEpisode && (
            <div className="mt-2">
              <p>Next: {progress.nextEpisode.title}</p>
              <ActionButton label="Complete Episode" pending={pending} onClick={() => act('completeEpisode', progress.nextEpisode!.id)} />
            </div>
          )}
        </div>

        <div>
          <p style={{ color: 'var(--paper)' }}>Scenes</p>
          {narrative ? (
            <p>Current scene: {narrative.sceneId} ({narrative.status})</p>
          ) : (
            <div className="flex flex-col gap-2">
              <p>No Scenes started yet.</p>
              <ActionButton label="Start Narrative" pending={pending} onClick={() => act('startNarrative')} />
            </div>
          )}
          {narrative && narrative.status === 'active' && (
            <ActionButton label="Continue" pending={pending} onClick={() => act('advanceNarrative')} />
          )}
        </div>

        <div>
          <p style={{ color: 'var(--paper)' }}>Challenges</p>
          {completedChallenges.length > 0 ? (
            <ul className="list-inside list-disc">
              {completedChallenges.map((id) => <li key={id}>{PRACTICE_TITLES.get(id) ?? id}</li>)}
            </ul>
          ) : (
            <p>No Challenges completed yet.</p>
          )}
        </div>

        <div>
          <p style={{ color: 'var(--paper)' }}>Milestones</p>
          {completedMilestones.length > 0 ? (
            <ul className="list-inside list-disc">
              {completedMilestones.map((id) => <li key={id}>{MILESTONE_TITLES.get(id) ?? id}</li>)}
            </ul>
          ) : (
            <p>No Milestones reached yet.</p>
          )}
        </div>
      </div>

      {/* Practice Surface (Phase 8) -- never fabricated: Started/Continue
          only render when Context Runtime's currentPracticeId confirms a
          practice is actually active. */}
      <div>
        <p style={{ color: 'var(--paper)' }}>Practice</p>
        {activePracticeId ? (
          <div className="flex flex-col gap-1">
            <p>{PRACTICE_TITLES.get(activePracticeId) ?? activePracticeId} &middot; Started</p>
            <p>Completed: No &middot; Remaining: finish this practice to complete it</p>
            <ActionButton label="Continue" pending={pending} onClick={() => act('finishPractice', activePracticeId)} />
          </div>
        ) : progress.status === 'active' && progress.nextPractice ? (
          <div className="flex flex-col gap-1">
            <p>Ready for Practice: {progress.nextPractice.title}</p>
            <ActionButton label="Begin Practice" pending={pending} onClick={() => act('beginPractice', progress.nextPractice!.id)} />
          </div>
        ) : (
          <p>Ready for Practice.</p>
        )}
      </div>

      {/* Reflection Surface (Phase 7) -- never fabricated. */}
      <div>
        <p style={{ color: 'var(--paper)' }}>Reflection</p>
        {pendingReflections.length > 0 ? (
          <p>{REFLECTION_PROMPTS.get(pendingReflections[0]) ?? pendingReflections[0]}</p>
        ) : (
          <p>No active reflection.</p>
        )}
      </div>

      <div>
        <p style={{ color: 'var(--paper)' }}>Recent Activity</p>
        {recentEvents && recentEvents.length > 0 ? (
          <ul className="list-inside list-disc">
            {recentEvents.map((e) => <li key={e.id}>{humanizeEventType(e.type)}</li>)}
          </ul>
        ) : (
          <p>No activity yet.</p>
        )}
      </div>

      <div>
        <p style={{ color: 'var(--paper)' }}>History</p>
        {data.history.length > 0 ? (
          <ul className="list-inside list-disc">
            {data.history.map((t, i) => <li key={i}>{humanizeEventType(t.type)}{t.nodeId ? ` — ${t.nodeId}` : ''}</li>)}
          </ul>
        ) : (
          <p>No History yet.</p>
        )}
      </div>

      {progress.status === 'active' && progress.nextLivingWorld && (
        <div>
          <p style={{ color: 'var(--paper)' }}>Next Living World</p>
          <p>{progress.nextLivingWorld.title}</p>
          <ActionButton label="Enter World" pending={pending} onClick={() => act('enterWorld', progress.nextLivingWorld!.id)} />
        </div>
      )}

      <div className="flex gap-2">
        {progress.status === 'active' && <ActionButton label="Pause" pending={pending} onClick={() => act('pause')} />}
        {progress.status === 'paused' && <ActionButton label="Resume" pending={pending} onClick={() => act('resume')} />}
        {(progress.status === 'active' || progress.status === 'paused') && (
          <ActionButton label="Abandon" pending={pending} onClick={() => act('abandon')} />
        )}
      </div>

      {progress.status === 'completed' && <p style={{ color: 'var(--gold)' }}>Experience complete.</p>}
      {progress.status === 'abandoned' && <p>This experience was abandoned.</p>}
    </div>
  )
}
