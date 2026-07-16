// Stable intention identifiers for RC1's /start step. The id (not the
// displayed sentence) is what travels through URL state, so copy can
// change later without breaking anything already in flight.
export type IntentionId =
  | "clarity"
  | "calm"
  | "habits"
  | "leadership"
  | "stuck"
  | "curious";

export interface Intention {
  id: IntentionId;
  label: string;
}

// RC6A.1 -- reordered (display order only, ids/URL contract unchanged):
// the two higher-friction, most-immediate emotional states ("stuck",
// "calm") lead, ahead of the more aspirational/goal-oriented options,
// with "curious" -- the lowest-commitment, just-browsing option --
// moved last.
export const INTENTIONS: Intention[] = [
  { id: "stuck", label: "I feel stuck." },
  { id: "calm", label: "I want to feel calmer." },
  { id: "clarity", label: "I want more clarity." },
  { id: "habits", label: "I want better habits." },
  { id: "leadership", label: "I want to lead better." },
  { id: "curious", label: "I am simply curious." },
];

export function isIntentionId(value: string | null): value is IntentionId {
  return !!value && INTENTIONS.some((intention) => intention.id === value);
}
