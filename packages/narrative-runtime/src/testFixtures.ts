import type { NarrativeDefinition } from "./types.ts"

// A single unbranching path across two episodes and three scenes --
// exercises linear play, scene-boundary crossing (b2 -> sc2, same
// episode), episode-boundary crossing (b3 -> e2), and completion (b4 ->
// end). Shared by runtime.test.ts's linear/resume/completion/scene-
// transition/user-isolation cases so those tests don't each hand-roll an
// equivalent definition.
export function buildLinearDefinition(): NarrativeDefinition {
  return {
    id: "def-linear",
    version: 1,
    title: "Linear Test Narrative",
    entrySeasonId: "s1",
    seasons: [
      {
        id: "s1",
        title: "Season One",
        entryEpisodeId: "e1",
        episodes: [
          {
            id: "e1",
            title: "Episode One",
            entrySceneId: "sc1",
            scenes: [
              {
                id: "sc1",
                title: "Scene One",
                entryBeatId: "b1",
                beats: [
                  { id: "b1", kind: "narration", next: { to: "beat", beatId: "b2" } },
                  { id: "b2", kind: "narration", next: { to: "scene", sceneId: "sc2" } },
                ],
              },
              {
                id: "sc2",
                title: "Scene Two",
                entryBeatId: "b3",
                beats: [{ id: "b3", kind: "narration", next: { to: "episode", episodeId: "e2" } }],
              },
            ],
          },
          {
            id: "e2",
            title: "Episode Two",
            entrySceneId: "sc3",
            scenes: [
              {
                id: "sc3",
                title: "Scene Three",
                entryBeatId: "b4",
                beats: [{ id: "b4", kind: "narration", next: { to: "end" } }],
              },
            ],
          },
        ],
      },
    ],
  }
}

// A single choice fans out into two paths that reconverge at a trigger
// beat gated on the flag each path's outcome sets -- exercises
// branching, invalid choice, world/practice/reflection/asset refs, and
// both trigger() and advance()'s auto-fire behavior.
export function buildBranchingDefinition(): NarrativeDefinition {
  return {
    id: "def-branch",
    version: 1,
    title: "Branching Test Narrative",
    entrySeasonId: "s1",
    seasons: [
      {
        id: "s1",
        title: "Season One",
        entryEpisodeId: "e1",
        episodes: [
          {
            id: "e1",
            title: "Episode One",
            entrySceneId: "sc1",
            scenes: [
              {
                id: "sc1",
                title: "Choice Scene",
                entryBeatId: "b1",
                beats: [
                  {
                    id: "b1",
                    kind: "choice",
                    choices: [
                      {
                        id: "choice-good",
                        label: "Do the good thing",
                        outcome: { id: "out-good", setFlags: { path: "good" }, transition: { to: "beat", beatId: "b2" } },
                      },
                      {
                        id: "choice-bad",
                        label: "Do the bad thing",
                        outcome: { id: "out-bad", setFlags: { path: "bad" }, transition: { to: "beat", beatId: "b3" } },
                      },
                    ],
                  },
                  {
                    id: "b2",
                    kind: "narration",
                    refs: {
                      world: { worldId: "world-1" },
                      practice: { practiceId: "practice-1" },
                      reflection: { reflectionId: "reflection-1" },
                      asset: { assetId: "asset-1", kind: "video" },
                    },
                    next: { to: "beat", beatId: "b4" },
                  },
                  { id: "b3", kind: "narration", next: { to: "beat", beatId: "b4" } },
                  {
                    id: "b4",
                    kind: "trigger",
                    triggers: [
                      {
                        id: "trig-good-path",
                        when: { op: "flagEquals", flag: "path", value: "good" },
                        outcome: { id: "out-trig-good", transition: { to: "end" } },
                      },
                      {
                        id: "trig-fallback",
                        when: { op: "always" },
                        outcome: { id: "out-trig-fallback", transition: { to: "end" } },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  }
}
