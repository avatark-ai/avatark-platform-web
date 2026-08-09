// Sprint 19, Phase 0 §5 (reconciled): the one new gate this domain adds.
// Deliberately a closed, small union -- a denial always names exactly
// one of these reasons, never a generic string, so a caller (and a
// test) can assert on WHICH invariant blocked participation.
export type ParticipationDenialReason =
  | "ENCOUNTER_NOT_AVAILABLE" // re-resolved live availability said no -- the same honest "no fabricated success" posture Sprint 7/8 already held for select-encounter
  | "NARRATIVE_GATE_CLOSED" // the rule is narrative-protected and the protected-narrative gate has not resolved open

export type ParticipationAuthorization =
  | { authorized: true }
  | { authorized: false; reason: ParticipationDenialReason }
