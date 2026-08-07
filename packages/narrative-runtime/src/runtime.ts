import type {
  Beat,
  ChoiceBeat,
  Choice,
  NarrationBeat,
  NarrativeDefinition,
  NarrativeFlags,
  NarrativeReferences,
  Transition,
  Trigger,
  TriggerBeat,
  TriggerCondition,
} from "./types.ts"
import type { NarrativeHistory, NarrativeState, NarrativeStatus } from "./state.ts"
import type { NarrativeRepository } from "./repository.ts"
import { buildNarrativeIndex, resolveEntryOfSeason, resolveTransition, type NarrativeIndex } from "./definitionIndex.ts"
import { validateNarrativeDefinition } from "./validation.ts"
import {
  NarrativeAlreadyStartedError,
  NarrativeDefinitionError,
  NarrativeInvalidChoiceError,
  NarrativeInvalidTriggerError,
  NarrativeRuntimeError,
  NarrativeStateNotFoundError,
} from "./errors.ts"

export interface NarrativeNextView {
  status: NarrativeStatus
  seasonId: string
  episodeId: string
  sceneId: string
  /** Null only when status is "completed" -- there is no current beat once a narrative has ended. */
  beat: Beat | null
  availableChoices: Choice[]
  refs?: NarrativeReferences
}

export interface NarrativeRuntimeOptions {
  definition: NarrativeDefinition
  repository: NarrativeRepository
  /** Injectable clock for deterministic tests. Defaults to the real wall clock. */
  now?: () => Date
}

export interface NarrativeRuntime {
  startNarrative(userId: string): Promise<NarrativeState>
  resumeNarrative(userId: string): Promise<NarrativeState>
  startEpisode(userId: string, episodeId: string): Promise<NarrativeState>
  completeBeat(userId: string): Promise<NarrativeState>
  choose(userId: string, choiceId: string): Promise<NarrativeState>
  trigger(userId: string, triggerId: string): Promise<NarrativeState>
  advance(userId: string): Promise<NarrativeState>
  pause(userId: string): Promise<NarrativeState>
  resume(userId: string): Promise<NarrativeState>
  completeScene(userId: string): Promise<NarrativeState>
  completeEpisode(userId: string): Promise<NarrativeState>
  getNext(userId: string): Promise<NarrativeNextView>
  getHistory(userId: string): Promise<NarrativeHistory>
}

function evaluateTriggerCondition(condition: TriggerCondition, flags: NarrativeFlags): boolean {
  switch (condition.op) {
    case "always":
      return true
    case "flagSet":
      return condition.flag in flags
    case "flagEquals":
      return flags[condition.flag] === condition.value
  }
}

/**
 * Builds a runtime bound to one validated NarrativeDefinition. Throws
 * NarrativeDefinitionError immediately if the definition is malformed --
 * a runtime is never constructed against a definition whose transitions
 * or entry pointers don't resolve, so every operation below can trust
 * resolveTransition() to succeed for anything the definition itself
 * names (defensive re-checks remain only for ids the definition did not
 * name, which cannot occur through this API).
 */
export function createNarrativeRuntime(options: NarrativeRuntimeOptions): NarrativeRuntime {
  const { definition, repository, now = () => new Date() } = options

  const validation = validateNarrativeDefinition(definition)
  if (!validation.valid) throw new NarrativeDefinitionError(validation.errors)

  const index: NarrativeIndex = buildNarrativeIndex(definition)

  function nowIso(): string {
    return now().toISOString()
  }

  async function loadState(userId: string): Promise<NarrativeState> {
    const state = await repository.getState(userId, definition.id)
    if (!state) throw new NarrativeStateNotFoundError(userId, definition.id)
    return state
  }

  async function loadActiveState(userId: string): Promise<NarrativeState> {
    const state = await loadState(userId)
    if (state.status !== "active") {
      throw new NarrativeRuntimeError(`Narrative is "${state.status}", not active, for user "${userId}".`)
    }
    return state
  }

  function currentBeat(state: NarrativeState): Beat {
    const indexed = index.beats.get(state.progress.beatId)
    if (!indexed) throw new NarrativeRuntimeError(`Current beat "${state.progress.beatId}" no longer exists in this definition.`)
    return indexed.beat
  }

  function markBeatCompleted(state: NarrativeState, beatId: string): void {
    if (!state.progress.completedBeatIds.includes(beatId)) state.progress.completedBeatIds.push(beatId)
  }

  function applyTransition(state: NarrativeState, transition: Transition): void {
    const target = resolveTransition(index, transition)
    if (target === null) {
      throw new NarrativeRuntimeError("Transition target does not exist in this definition.")
    }
    if (target === "end") {
      state.status = "completed"
      state.history.entries.push({ at: nowIso(), kind: "narrativeCompleted" })
      return
    }
    if (target.sceneId !== state.progress.sceneId) {
      if (!state.progress.completedSceneIds.includes(state.progress.sceneId)) {
        state.progress.completedSceneIds.push(state.progress.sceneId)
      }
      state.history.entries.push({
        at: nowIso(),
        kind: "sceneCompleted",
        sceneId: state.progress.sceneId,
        episodeId: state.progress.episodeId,
        seasonId: state.progress.seasonId,
      })
    }
    if (target.episodeId !== state.progress.episodeId) {
      if (!state.progress.completedEpisodeIds.includes(state.progress.episodeId)) {
        state.progress.completedEpisodeIds.push(state.progress.episodeId)
      }
      state.history.entries.push({
        at: nowIso(),
        kind: "episodeCompleted",
        episodeId: state.progress.episodeId,
        seasonId: state.progress.seasonId,
      })
    }
    state.progress.seasonId = target.seasonId
    state.progress.episodeId = target.episodeId
    state.progress.sceneId = target.sceneId
    state.progress.beatId = target.beatId
  }

  function doCompleteBeat(state: NarrativeState, beat: NarrationBeat): void {
    markBeatCompleted(state, beat.id)
    state.history.entries.push({
      at: nowIso(),
      kind: "beatCompleted",
      beatId: beat.id,
      sceneId: state.progress.sceneId,
      episodeId: state.progress.episodeId,
      seasonId: state.progress.seasonId,
    })
    applyTransition(state, beat.next)
  }

  function doChoose(state: NarrativeState, beat: ChoiceBeat, choice: Choice): void {
    markBeatCompleted(state, beat.id)
    state.history.entries.push({
      at: nowIso(),
      kind: "choiceMade",
      beatId: beat.id,
      choiceId: choice.id,
      sceneId: state.progress.sceneId,
      episodeId: state.progress.episodeId,
      seasonId: state.progress.seasonId,
    })
    if (choice.outcome.setFlags) state.flags = { ...state.flags, ...choice.outcome.setFlags }
    applyTransition(state, choice.outcome.transition)
  }

  function doTrigger(state: NarrativeState, beat: TriggerBeat, trig: Trigger): void {
    markBeatCompleted(state, beat.id)
    state.history.entries.push({
      at: nowIso(),
      kind: "triggerFired",
      beatId: beat.id,
      triggerId: trig.id,
      sceneId: state.progress.sceneId,
      episodeId: state.progress.episodeId,
      seasonId: state.progress.seasonId,
    })
    if (trig.outcome.setFlags) state.flags = { ...state.flags, ...trig.outcome.setFlags }
    applyTransition(state, trig.outcome.transition)
  }

  async function persist(state: NarrativeState): Promise<NarrativeState> {
    state.updatedAt = nowIso()
    await repository.saveState(state)
    return structuredClone(state)
  }

  return {
    async startNarrative(userId) {
      const existing = await repository.getState(userId, definition.id)
      if (existing) throw new NarrativeAlreadyStartedError(userId, definition.id)

      const position = resolveEntryOfSeason(index, definition.entrySeasonId)
      if (!position) throw new NarrativeRuntimeError("Definition's entry point does not resolve.")

      const startedAt = nowIso()
      const state: NarrativeState = {
        userId,
        narrativeId: definition.id,
        status: "active",
        progress: { ...position, completedBeatIds: [], completedSceneIds: [], completedEpisodeIds: [] },
        flags: {},
        history: {
          entries: [
            {
              at: startedAt,
              kind: "started",
              seasonId: position.seasonId,
              episodeId: position.episodeId,
              sceneId: position.sceneId,
              beatId: position.beatId,
            },
          ],
        },
        startedAt,
        updatedAt: startedAt,
      }
      return persist(state)
    },

    async resumeNarrative(userId) {
      const state = await loadState(userId)
      return structuredClone(state)
    },

    async startEpisode(userId, episodeId) {
      const state = await loadActiveState(userId)
      if (!index.episodes.has(episodeId)) throw new NarrativeRuntimeError(`Unknown episode "${episodeId}".`)
      applyTransition(state, { to: "episode", episodeId })
      state.history.entries.push({
        at: nowIso(),
        kind: "episodeStarted",
        episodeId,
        seasonId: state.progress.seasonId,
      })
      return persist(state)
    },

    async completeBeat(userId) {
      const state = await loadActiveState(userId)
      const beat = currentBeat(state)
      if (beat.kind !== "narration") {
        throw new NarrativeRuntimeError(`Beat "${beat.id}" is a "${beat.kind}" beat; use choose() or trigger() instead of completeBeat().`)
      }
      doCompleteBeat(state, beat)
      return persist(state)
    },

    async choose(userId, choiceId) {
      const state = await loadActiveState(userId)
      const beat = currentBeat(state)
      if (beat.kind !== "choice") {
        throw new NarrativeRuntimeError(`Beat "${beat.id}" is a "${beat.kind}" beat; choose() only applies to choice beats.`)
      }
      const choice = beat.choices.find((c) => c.id === choiceId)
      if (!choice) throw new NarrativeInvalidChoiceError(choiceId, beat.id)
      doChoose(state, beat, choice)
      return persist(state)
    },

    async trigger(userId, triggerId) {
      const state = await loadActiveState(userId)
      const beat = currentBeat(state)
      if (beat.kind !== "trigger") {
        throw new NarrativeRuntimeError(`Beat "${beat.id}" is a "${beat.kind}" beat; trigger() only applies to trigger beats.`)
      }
      const trig = beat.triggers.find((t) => t.id === triggerId)
      if (!trig) throw new NarrativeInvalidTriggerError(`"${triggerId}" is not a valid trigger for beat "${beat.id}".`)
      if (!evaluateTriggerCondition(trig.when, state.flags)) {
        throw new NarrativeInvalidTriggerError(`Trigger "${triggerId}" on beat "${beat.id}" is not currently satisfied.`)
      }
      doTrigger(state, beat, trig)
      return persist(state)
    },

    async advance(userId) {
      const state = await loadActiveState(userId)
      const beat = currentBeat(state)
      if (beat.kind === "narration") {
        doCompleteBeat(state, beat)
      } else if (beat.kind === "trigger") {
        const trig = beat.triggers.find((t) => evaluateTriggerCondition(t.when, state.flags))
        if (!trig) throw new NarrativeRuntimeError(`No trigger on beat "${beat.id}" is currently satisfied; cannot advance automatically.`)
        doTrigger(state, beat, trig)
      } else {
        throw new NarrativeRuntimeError(`Beat "${beat.id}" requires an explicit choose().`)
      }
      return persist(state)
    },

    async pause(userId) {
      const state = await loadState(userId)
      if (state.status !== "active") {
        throw new NarrativeRuntimeError(`Only an active narrative can be paused (current status: "${state.status}").`)
      }
      state.status = "paused"
      state.history.entries.push({ at: nowIso(), kind: "paused" })
      return persist(state)
    },

    async resume(userId) {
      const state = await loadState(userId)
      if (state.status !== "paused") {
        throw new NarrativeRuntimeError(`Only a paused narrative can be resumed (current status: "${state.status}").`)
      }
      state.status = "active"
      state.history.entries.push({ at: nowIso(), kind: "resumed" })
      return persist(state)
    },

    async completeScene(userId) {
      const state = await loadActiveState(userId)
      const sceneId = state.progress.sceneId
      if (!state.progress.completedSceneIds.includes(sceneId)) {
        state.progress.completedSceneIds.push(sceneId)
        state.history.entries.push({
          at: nowIso(),
          kind: "sceneCompleted",
          sceneId,
          episodeId: state.progress.episodeId,
          seasonId: state.progress.seasonId,
        })
      }
      return persist(state)
    },

    async completeEpisode(userId) {
      const state = await loadActiveState(userId)
      const episodeId = state.progress.episodeId
      if (!state.progress.completedEpisodeIds.includes(episodeId)) {
        state.progress.completedEpisodeIds.push(episodeId)
        state.history.entries.push({
          at: nowIso(),
          kind: "episodeCompleted",
          episodeId,
          seasonId: state.progress.seasonId,
        })
      }
      return persist(state)
    },

    async getNext(userId) {
      const state = await loadState(userId)
      if (state.status === "completed") {
        return {
          status: "completed",
          seasonId: state.progress.seasonId,
          episodeId: state.progress.episodeId,
          sceneId: state.progress.sceneId,
          beat: null,
          availableChoices: [],
        }
      }
      const beat = currentBeat(state)
      return {
        status: state.status,
        seasonId: state.progress.seasonId,
        episodeId: state.progress.episodeId,
        sceneId: state.progress.sceneId,
        beat: structuredClone(beat),
        availableChoices: beat.kind === "choice" ? structuredClone(beat.choices) : [],
        refs: beat.refs ? structuredClone(beat.refs) : undefined,
      }
    },

    async getHistory(userId) {
      const state = await loadState(userId)
      return structuredClone(state.history)
    },
  }
}
