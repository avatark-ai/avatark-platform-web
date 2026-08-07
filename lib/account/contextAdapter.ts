// Wires @avatark/account's CurrentContextCard to @avatark/context-runtime
// via /api/account/context, without teaching the runtime package
// anything about Account. @avatark/account's CurrentContextState predates
// this runtime and only exposes four legacy-named axes; this file is the
// one place that maps between the two, so neither package has to know
// about the other's shape.
//
// Mapping note: "journey" has no direct counterpart among the runtime's
// thirteen axes. The closest concept is currentNarrativeId (a narrative
// arc reads naturally as a "journey"), so that's the mapping used below
// -- not currentExperienceId, which is the broader "which product
// experience" axis, and not @avatark/journey's unrelated handoff concept
// (see docs/CONSUMER_PLATFORM_ARCHITECTURE.md §7).
import type { CurrentContextAdapter, CurrentContextState } from '@avatark/account'
import type { ContextSnapshot } from '@avatark/context-runtime'

export function toCurrentContextState(snapshot: ContextSnapshot): CurrentContextState {
  return {
    livingWorld: snapshot.fields.currentLivingWorldId.value,
    journey: snapshot.fields.currentNarrativeId.value,
    episode: snapshot.fields.currentEpisodeId.value,
    practice: snapshot.fields.currentPracticeId.value,
  }
}

// fetchImpl is injectable so the mapping + error-handling logic is
// testable without a real network call or a signed-in session.
export function createContextAdapter(fetchImpl: typeof fetch = fetch): CurrentContextAdapter {
  return {
    async get() {
      const res = await fetchImpl('/api/account/context')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) return { error: json.error ?? `Request failed (${res.status})` }
      return { data: toCurrentContextState(json as ContextSnapshot) }
    },
  }
}

export const currentContextAdapter: CurrentContextAdapter = createContextAdapter()
