import type { Beat, Episode, NarrativeDefinition, Scene, Season, Transition } from "./types.ts"
import type { NarrativePosition } from "./state.ts"

export interface IndexedBeat {
  beat: Beat
  sceneId: string
  episodeId: string
  seasonId: string
}

export interface IndexedScene {
  scene: Scene
  episodeId: string
  seasonId: string
}

export interface IndexedEpisode {
  episode: Episode
  seasonId: string
}

// O(1) lookup by id across the whole definition, at every level. Built
// once per runtime instance (see runtime.ts) -- ids are assumed globally
// unique, which validation.ts enforces before a runtime is ever created.
export interface NarrativeIndex {
  definition: NarrativeDefinition
  beats: Map<string, IndexedBeat>
  scenes: Map<string, IndexedScene>
  episodes: Map<string, IndexedEpisode>
  seasons: Map<string, Season>
}

export function buildNarrativeIndex(definition: NarrativeDefinition): NarrativeIndex {
  const beats = new Map<string, IndexedBeat>()
  const scenes = new Map<string, IndexedScene>()
  const episodes = new Map<string, IndexedEpisode>()
  const seasons = new Map<string, Season>()

  for (const season of definition.seasons) {
    seasons.set(season.id, season)
    for (const episode of season.episodes) {
      episodes.set(episode.id, { episode, seasonId: season.id })
      for (const scene of episode.scenes) {
        scenes.set(scene.id, { scene, episodeId: episode.id, seasonId: season.id })
        for (const beat of scene.beats) {
          beats.set(beat.id, { beat, sceneId: scene.id, episodeId: episode.id, seasonId: season.id })
        }
      }
    }
  }

  return { definition, beats, scenes, episodes, seasons }
}

/** Resolves a scene to the position of its own entry beat. Null if the scene or its entry beat pointer is dangling. */
export function resolveEntryOfScene(index: NarrativeIndex, sceneId: string): NarrativePosition | null {
  const indexed = index.scenes.get(sceneId)
  if (!indexed) return null
  const beat = index.beats.get(indexed.scene.entryBeatId)
  if (!beat) return null
  return { seasonId: indexed.seasonId, episodeId: indexed.episodeId, sceneId, beatId: beat.beat.id }
}

/** Resolves an episode to the position of its own entry scene's entry beat. Null if any pointer along the chain is dangling. */
export function resolveEntryOfEpisode(index: NarrativeIndex, episodeId: string): NarrativePosition | null {
  const indexed = index.episodes.get(episodeId)
  if (!indexed) return null
  return resolveEntryOfScene(index, indexed.episode.entrySceneId)
}

/** Resolves a season to the position of its own entry episode's entry scene's entry beat. */
export function resolveEntryOfSeason(index: NarrativeIndex, seasonId: string): NarrativePosition | null {
  const season = index.seasons.get(seasonId)
  if (!season) return null
  return resolveEntryOfEpisode(index, season.entryEpisodeId)
}

/**
 * Resolves any Transition to a concrete beat position, or the literal
 * string "end", or null when the transition targets an id that does not
 * exist in this definition. Every Choice/Trigger outcome and narration
 * beat's `next` is resolved through this single function -- the one
 * place a transition target is validated against the definition.
 */
export function resolveTransition(index: NarrativeIndex, transition: Transition): NarrativePosition | "end" | null {
  switch (transition.to) {
    case "end":
      return "end"
    case "beat": {
      const indexed = index.beats.get(transition.beatId)
      if (!indexed) return null
      return { seasonId: indexed.seasonId, episodeId: indexed.episodeId, sceneId: indexed.sceneId, beatId: transition.beatId }
    }
    case "scene":
      return resolveEntryOfScene(index, transition.sceneId)
    case "episode":
      return resolveEntryOfEpisode(index, transition.episodeId)
    case "season":
      return resolveEntryOfSeason(index, transition.seasonId)
  }
}
