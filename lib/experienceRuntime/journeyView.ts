import type { JourneyRuntime } from '@avatark/experience-runtime'
import { NarrativeRuntimeError, type NarrativeRuntime } from '@avatark/narrative-runtime'
import type { ContextRuntime } from '@avatark/context-runtime'
import { AVATARK_WELCOME_JOURNEY } from './journeyDefinition.ts'

export const JOURNEY_ACTIONS = new Set([
  'start',
  'resume',
  'pause',
  'abandon',
  'advance',
  'completeEpisode',
  'enterWorld',
  'beginPractice',
  'finishPractice',
])
export const NARRATIVE_ACTIONS = new Set(['startNarrative', 'advanceNarrative'])
export const JOURNEY_VIEW_ACTIONS = new Set([...JOURNEY_ACTIONS, ...NARRATIVE_ACTIONS])

// Shared, runtime-instance-agnostic response shaping -- used by both the
// real, per-request Supabase-backed route (app/api/account/journey/route.ts)
// and the dev-only, in-memory route (app/api/dev/account/journey/route.ts).
// Lives here, not inside either route.ts, since Next.js route files only
// permit a fixed set of exports (GET/POST/etc + a few config options).

/** A user who has never started the narrative gets `null` (never fabricated), not an error. */
export async function narrativeSummary(narrativeRuntime: NarrativeRuntime, subjectId: string) {
  try {
    const next = await narrativeRuntime.getNext(subjectId)
    return {
      status: next.status,
      seasonId: next.seasonId,
      episodeId: next.episodeId,
      sceneId: next.sceneId,
    }
  } catch (err) {
    if (err instanceof NarrativeRuntimeError) return null
    throw err
  }
}

export async function toJourneyViewResponse(
  runtime: JourneyRuntime,
  narrativeRuntime: NarrativeRuntime,
  subjectId: string,
) {
  const [progress, history, narrative] = await Promise.all([
    runtime.getProgress(subjectId),
    runtime.history(subjectId),
    narrativeSummary(narrativeRuntime, subjectId),
  ])
  return {
    journey: { id: AVATARK_WELCOME_JOURNEY.id, title: AVATARK_WELCOME_JOURNEY.title },
    progress,
    history: history.transitions,
    narrative,
  }
}

// JourneyProgress (the runtime's own computed view) has no "is a practice
// currently active" field -- beginPractice()'d-but-not-yet-finished and
// never-started look identical in nextPractice. Rather than add a field to
// @avatark/experience-runtime's own type (a kernel-package change this
// sprint's "no architecture changes" rule avoids), the Host keeps
// @avatark/context-runtime's currentPracticeId/currentEpisodeId axes in
// sync on every relevant transition -- exactly the same
// Host-writes-context-after-every-transition pattern
// lib/runtimeKernel/orchestrator.ts already uses for currentLivingWorldId.
// contextRuntime is optional so callers that don't have one degrade
// gracefully (no context sync, not a failure).
export async function applyJourneyViewAction(
  runtime: JourneyRuntime,
  narrativeRuntime: NarrativeRuntime,
  subjectId: string,
  action: string,
  nodeId: string | null,
  contextRuntime?: ContextRuntime,
  productId = 'avatark',
): Promise<void> {
  switch (action) {
    case 'start':
      await runtime.start(subjectId)
      break
    case 'resume':
      await runtime.resume(subjectId)
      break
    case 'pause':
      await runtime.pause(subjectId)
      break
    case 'abandon':
      await runtime.abandon(subjectId)
      break
    case 'advance':
      await runtime.advance(subjectId)
      break
    case 'completeEpisode':
      await runtime.completeEpisode(subjectId, nodeId!)
      await contextRuntime?.setContext(subjectId, { currentEpisodeId: nodeId }, { productId })
      break
    case 'enterWorld':
      await runtime.enterWorld(subjectId, nodeId!)
      await contextRuntime?.setContext(subjectId, { currentLivingWorldId: nodeId }, { productId })
      break
    case 'beginPractice':
      await runtime.beginPractice(subjectId, nodeId!)
      await contextRuntime?.setContext(subjectId, { currentPracticeId: nodeId }, { productId })
      break
    case 'finishPractice':
      await runtime.finishPractice(subjectId, nodeId!)
      await contextRuntime?.setContext(subjectId, { currentPracticeId: null }, { productId })
      break
    case 'startNarrative':
      await narrativeRuntime.startNarrative(subjectId)
      break
    case 'advanceNarrative':
      await narrativeRuntime.advance(subjectId)
      break
  }
}
