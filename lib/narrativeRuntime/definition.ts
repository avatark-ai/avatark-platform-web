import type { NarrativeDefinition } from '@avatark/narrative-runtime'

// Sprint 4 (Runtime Host Integration): a generic, illustrative narrative
// definition, owned by this app -- same status as
// lib/experienceRuntime/journeyDefinition.ts's AVATARK_WELCOME_JOURNEY.
// No franchise content of any kind (no Krishna/Rama/Adhi Yogi/etc, per this
// sprint's explicit rule) -- just enough structure (one season, one
// episode, two scenes) for "Current Scene" to be a real, runtime-derived
// value instead of a placeholder.
export const AVATARK_WELCOME_NARRATIVE: NarrativeDefinition = {
  id: 'avatark-welcome-narrative',
  version: 1,
  title: 'Welcome Narrative',
  entrySeasonId: 'season-1',
  seasons: [
    {
      id: 'season-1',
      title: 'Season One',
      entryEpisodeId: 'narrative-episode-1',
      episodes: [
        {
          id: 'narrative-episode-1',
          title: 'Arrival',
          entrySceneId: 'scene-orientation',
          scenes: [
            {
              id: 'scene-orientation',
              title: 'Orientation',
              entryBeatId: 'beat-welcome',
              beats: [{ id: 'beat-welcome', kind: 'narration', next: { to: 'scene', sceneId: 'scene-first-steps' } }],
            },
            {
              id: 'scene-first-steps',
              title: 'First Steps',
              entryBeatId: 'beat-continue',
              beats: [{ id: 'beat-continue', kind: 'narration', next: { to: 'end' } }],
            },
          ],
        },
      ],
    },
  ],
}
