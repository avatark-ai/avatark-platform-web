// NON-PUBLIC EDITORIAL FIXTURE -- AVK-FOUNDER-LIVING-WORLDS-02.
//
// Conditionally approved copy that depends on WorldK canon records the AvatarK lane
// may not write (WorldK canon C-1 / C-2, see
// _claude_reports/AVK_FOUNDER_LIVING_WORLDS_02/WORLDK-CANON-DEPENDENCIES.md).
//
// This file is imported ONLY by *.test.ts files (enforced by
// worldkConditionalCopy.test.ts). No page, component or content file renders it, so the
// text cannot reach a build, a Preview or Production. Publishing it requires (1) the
// WorldK lane recording C-1 and C-2 in its canon, and (2) a separate gate that moves the
// paragraphs into content/foundation/founder-letter.md and LW-12-R into
// livingWorldsCopy.ts. No substitute wording is rendered in its place.

export type WorldkCanonCondition = 'C-1' | 'C-2'

export interface ConditionalCopyEntry {
  id: string
  text: string
  sha256: string
  requires: WorldkCanonCondition[]
  status: 'WITHHELD_PENDING_WORLDK_CANON'
  surface: string
  insertion: string
}

// The WorldK canon revision checked at construction (read-only): neither C-1
// (sc:mahabharata externalMentions) nor C-2 (Forest Intelligence & Research Center
// design-location entry) is recorded in it.
export const WORLDK_CANON_CHECKED = {
  file: 'worldk-face/scripts/living-forest-story-canon.v1.0.1.json',
  version: '1.0.1',
  sha256: '5e13a8905e2316886545bff4d69f5237b30c3c92424cfd9c6a6e171fa2e9d2e1',
  c1Recorded: false,
  c2Recorded: false,
} as const

export const WORLDK_CONDITIONAL_COPY: readonly ConditionalCopyEntry[] = [
  {
    id: 'AVK-FLW-FL-406-CC-1',
    text: "The first of these is Living Forest, a persistent forest world being developed for WorldK, an AvatarK product. VANAM is its contemporary gateway, with a Forest Intelligence & Research Center in design. Living Forest is being designed around rivers, watersheds, seasons, and the forests of the Ramayana: Chitrakoot beside the Mandakini, and Panchavati beside the Godavari. The Ramayana is the first collection of stories the forest will hold.",
    sha256: 'dcf442444dee97af59e297b58bf05b67f9f3cd565aee08d83c37ddb653f9c49a',
    requires: ['C-2'],
    status: 'WITHHELD_PENDING_WORLDK_CANON',
    surface: 'content/foundation/founder-letter.md -> /founder/future',
    insertion: 'after AVK-FLW-FL-405, before AVK-FLW-FL-407',
  },
  {
    id: 'AVK-FLW-FL-406-CC-2',
    text: "In time, I hope the same living forest can welcome other epic traditions, including the Mahabharata, while preserving each story's distinct geography, sources and meaning.",
    sha256: '452fa3f50ff436dd8a0a183d8005f8ee23272db56da8a9ea51de2d5e36f2b763',
    requires: ['C-1'],
    status: 'WITHHELD_PENDING_WORLDK_CANON',
    surface: 'content/foundation/founder-letter.md -> /founder/future',
    insertion: 'after AVK-FLW-FL-406-CC-1, before AVK-FLW-FL-407',
  },
  {
    id: 'AVK-FLW-LW-12-R',
    text: "The Forest Intelligence & Research Center: a planned place within VANAM where visitors are intended to study the forest's waters, seasons and life.",
    sha256: '755c791a51836cb8f30f718d6d355b52b0aef3098b41a671dca2adce25a3a945',
    requires: ['C-2'],
    status: 'WITHHELD_PENDING_WORLDK_CANON',
    surface: 'components/foundation/sections/FoundationLivingWorlds.tsx -> /foundation#living-worlds',
    insertion: 'Living Forest block line 2, after AVK-FLW-LW-11, chip AVK-FLW-ST-02',
  },
]
