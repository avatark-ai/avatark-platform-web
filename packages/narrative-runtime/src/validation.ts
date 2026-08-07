import type { NarrativeDefinition } from "./types.ts"
import { buildNarrativeIndex, resolveTransition } from "./definitionIndex.ts"

export interface NarrativeDefinitionValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Pure structural check -- no eval, no I/O. Every id referenced by an
 * entry pointer or a Transition must resolve inside this same
 * definition, and every id declared at season/episode/scene/beat level
 * must be globally unique (Transitions and refs.ts's index resolve by id
 * alone, irrespective of nesting). Runtime construction refuses to
 * proceed against a definition this rejects (see runtime.ts).
 */
export function validateNarrativeDefinition(definition: NarrativeDefinition): NarrativeDefinitionValidationResult {
  const errors: string[] = []

  const seasonIds = new Set<string>()
  const episodeIds = new Set<string>()
  const sceneIds = new Set<string>()
  const beatIds = new Set<string>()

  if (definition.seasons.length === 0) {
    errors.push("Definition must declare at least one season.")
  }

  for (const season of definition.seasons) {
    if (seasonIds.has(season.id)) errors.push(`Duplicate season id "${season.id}".`)
    seasonIds.add(season.id)

    if (season.episodes.length === 0) errors.push(`Season "${season.id}" must declare at least one episode.`)

    for (const episode of season.episodes) {
      if (episodeIds.has(episode.id)) errors.push(`Duplicate episode id "${episode.id}".`)
      episodeIds.add(episode.id)

      if (episode.scenes.length === 0) errors.push(`Episode "${episode.id}" must declare at least one scene.`)

      for (const scene of episode.scenes) {
        if (sceneIds.has(scene.id)) errors.push(`Duplicate scene id "${scene.id}".`)
        sceneIds.add(scene.id)

        if (scene.beats.length === 0) errors.push(`Scene "${scene.id}" must declare at least one beat.`)

        for (const beat of scene.beats) {
          if (beatIds.has(beat.id)) errors.push(`Duplicate beat id "${beat.id}".`)
          beatIds.add(beat.id)

          if (beat.kind === "choice") {
            if (beat.choices.length === 0) errors.push(`Choice beat "${beat.id}" must declare at least one choice.`)
            const choiceIds = new Set<string>()
            for (const choice of beat.choices) {
              if (choiceIds.has(choice.id)) errors.push(`Beat "${beat.id}" declares duplicate choice id "${choice.id}".`)
              choiceIds.add(choice.id)
            }
          } else if (beat.kind === "trigger") {
            if (beat.triggers.length === 0) errors.push(`Trigger beat "${beat.id}" must declare at least one trigger.`)
            const triggerIds = new Set<string>()
            for (const trig of beat.triggers) {
              if (triggerIds.has(trig.id)) errors.push(`Beat "${beat.id}" declares duplicate trigger id "${trig.id}".`)
              triggerIds.add(trig.id)
            }
          }
        }
      }
    }
  }

  // Entry-pointer and transition-target resolution needs an index; build
  // one even over a definition already known to be malformed -- the
  // index itself never throws (duplicate ids just last-write-win the
  // map), so this pass can still surface *additional* dangling-reference
  // errors alongside the duplicate-id errors above.
  const index = buildNarrativeIndex(definition)

  if (!index.seasons.has(definition.entrySeasonId)) {
    errors.push(`entrySeasonId "${definition.entrySeasonId}" does not match any season.`)
  }

  for (const season of definition.seasons) {
    if (!index.episodes.has(season.entryEpisodeId) || index.episodes.get(season.entryEpisodeId)?.seasonId !== season.id) {
      errors.push(`Season "${season.id}"'s entryEpisodeId "${season.entryEpisodeId}" does not match one of its own episodes.`)
    }
    for (const episode of season.episodes) {
      if (!index.scenes.has(episode.entrySceneId) || index.scenes.get(episode.entrySceneId)?.episodeId !== episode.id) {
        errors.push(`Episode "${episode.id}"'s entrySceneId "${episode.entrySceneId}" does not match one of its own scenes.`)
      }
      for (const scene of episode.scenes) {
        if (!index.beats.has(scene.entryBeatId) || index.beats.get(scene.entryBeatId)?.sceneId !== scene.id) {
          errors.push(`Scene "${scene.id}"'s entryBeatId "${scene.entryBeatId}" does not match one of its own beats.`)
        }
        for (const beat of scene.beats) {
          if (beat.kind === "narration") {
            if (resolveTransition(index, beat.next) === null) {
              errors.push(`Narration beat "${beat.id}"'s next transition targets an id that does not exist.`)
            }
          } else if (beat.kind === "choice") {
            for (const choice of beat.choices) {
              if (resolveTransition(index, choice.outcome.transition) === null) {
                errors.push(`Choice "${choice.id}" on beat "${beat.id}" targets an id that does not exist.`)
              }
            }
          } else if (beat.kind === "trigger") {
            for (const trig of beat.triggers) {
              if (resolveTransition(index, trig.outcome.transition) === null) {
                errors.push(`Trigger "${trig.id}" on beat "${beat.id}" targets an id that does not exist.`)
              }
            }
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
