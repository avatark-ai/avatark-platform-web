// Wires @avatark/account's CurrentContextCard to @avatark/context-runtime
// (via /api/account/context) and @avatark/experience-runtime (via
// /api/account/journey), without teaching either runtime anything about
// Account or about each other -- this file is the one place that merges
// the two, per the Host-coordinates-everything architecture
// (docs/RUNTIME_KERNEL_ARCHITECTURE.md Part 2).
//
// Mapping notes (Sprint 4, Runtime Host Integration -- extends the
// original 4-field mapping from Sprint "Platform RC" unchanged):
// - "journey" keeps its original mapping (currentNarrativeId) for
//   backward compatibility -- see docs/RUNTIME_GLOSSARY.md Part 2 for why
//   this field predates, and is distinct from, "experience" below.
// - "experience"/"episode"/"scene"/"practice"/"reflection"/"location" are
//   all real @avatark/context-runtime axes, mapped 1:1 -- no extra fetch
//   needed for any of them.
// - "challenge"/"milestone"/"journeyStatus"/"progress" are NOT
//   context-runtime axes at all (context-runtime has no "challenge" or
//   "milestone" concept) -- they're derived from
//   @avatark/experience-runtime's JourneyProgress, fetched separately and
//   merged here. A missing/failed journey fetch degrades those four
//   fields to null (never fabricated), without failing the whole card.
import type { CurrentContextAdapter, CurrentContextState } from '@avatark/account'
import type { ContextSnapshot } from '@avatark/context-runtime'
import type { JourneyProgress } from '@avatark/experience-runtime'
import { AVATARK_WELCOME_JOURNEY } from '../experienceRuntime/journeyDefinition.ts'

export function toCurrentContextState(
  snapshot: ContextSnapshot,
  journeyProgress: JourneyProgress | null,
): CurrentContextState {
  const nextChallenge =
    journeyProgress?.nextPractice?.kind === 'challenge' ? journeyProgress.nextPractice.title : null

  const mostRecentMilestoneId = journeyProgress?.completedMilestoneIds.at(-1) ?? null
  const milestoneTitle = mostRecentMilestoneId
    ? AVATARK_WELCOME_JOURNEY.milestones.find((m) => m.id === mostRecentMilestoneId)?.title ?? mostRecentMilestoneId
    : null

  return {
    livingWorld: snapshot.fields.currentLivingWorldId.value,
    journey: snapshot.fields.currentNarrativeId.value,
    episode: snapshot.fields.currentEpisodeId.value,
    practice: snapshot.fields.currentPracticeId.value,
    experience: snapshot.fields.currentExperienceId.value,
    scene: snapshot.fields.currentSceneId.value,
    reflection: snapshot.fields.currentReflectionId.value,
    location: snapshot.fields.currentLocationId.value,
    challenge: nextChallenge,
    milestone: milestoneTitle,
    journeyStatus: journeyProgress?.status ?? null,
    progress: journeyProgress ? `${journeyProgress.percentComplete}%` : null,
  }
}

// fetchImpl is injectable so the mapping + error-handling logic is
// testable without a real network call or a signed-in session.
export function createContextAdapter(fetchImpl: typeof fetch = fetch): CurrentContextAdapter {
  return {
    async get() {
      const [contextRes, journeyRes] = await Promise.all([
        fetchImpl('/api/account/context'),
        fetchImpl('/api/account/journey'),
      ])

      const contextJson = await contextRes.json().catch(() => ({}))
      if (!contextRes.ok) return { error: contextJson.error ?? `Request failed (${contextRes.status})` }

      // A failed/unavailable journey fetch degrades the four
      // experience-derived fields to null -- it never fails the whole
      // Current Context card, since context data on its own is still
      // valid and worth showing.
      const journeyJson = journeyRes.ok ? await journeyRes.json().catch(() => null) : null
      const journeyProgress: JourneyProgress | null = journeyJson?.progress ?? null

      return { data: toCurrentContextState(contextJson as ContextSnapshot, journeyProgress) }
    },
  }
}

export const currentContextAdapter: CurrentContextAdapter = createContextAdapter()
