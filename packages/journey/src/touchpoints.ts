// Phase 2 -- a generic, higher-level touchpoint vocabulary, distinct from
// (and not a replacement for) JourneyStepId, which models this specific
// repo's 9-step invitation->arena graph. JourneyTouchpointKind names the
// broad kind of moment a cross-product journey helper might need to
// recognize, independent of any one product's own step graph. Purely
// additive: nothing here is wired into lib/journey/continuity.ts or any
// real page.
export type JourneyTouchpointKind =
  | "anonymous"
  | "invitation"
  | "practice"
  | "reflection"
  | "community"
  | "story"
  | "living_echo"
  | "return_visit"
  | "product_switch"
  | "cross_product_continuation"
