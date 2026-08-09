import type { WorldId } from "@avatark/runtime-contracts"
import type { AdaptationSignal } from "./signal.ts"
import type { AdaptationPressure } from "./pressure.ts"
import type { AdaptationDecision } from "./decision.ts"
import type { AdaptationEffect } from "./effect.ts"

// Sprint 15: the single, renderer-neutral output of one wake's
// adaptation pass -- @avatark/world-adaptation-runtime's own
// `runWorldAdaptation` (pure) returns exactly this shape; the Host
// layer (lib/worldAdaptation/hostService.ts) persists `pressures`/
// `effects` and applies whichever effects have a legitimate existing
// write boundary. Every field here is either an input restated for
// auditability (`signals`) or a plain derived fact -- never a rendered
// sentence, never a moral/engagement score.
export interface WorldAdaptationResult {
  worldId: WorldId
  tick: number
  signals: AdaptationSignal[]
  pressures: AdaptationPressure[]
  decisions: AdaptationDecision[]
  effects: AdaptationEffect[]
}
