// The single RC3 Guide -- a deliberately generic archetype, not a real,
// named, consenting individual (same honesty standard as
// lib/onboarding/witness.ts). Swappable by design: when a real,
// consented practitioner is later designed in (see
// docs/INVITATION_MIGRATION.md, Phase 1), only this file should need
// to change -- app/guide/[slug] just renders whatever's here.
export const GUIDE_SLUG = "the-returner";

export interface Guide {
  archetype: string;
  role: string;
  mission: string;
  giftMessage: string;
}

export const GUIDE: Guide = {
  archetype: "The Returner",
  role: "CEO of a major global manufacturing company",
  mission:
    "Crossed a threshold decades ago, and came back to make sure the crossing doesn't just evaporate for whoever's next.",
  giftMessage:
    "I know what this threshold is. I crossed it. Here is what I carried forward.",
};
