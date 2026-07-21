// RC1 Iteration 4 -- the single "what should this visitor do next"
// decision, extracted from app/journey/today/page.tsx's TodayView so the
// home page (components/HomeContinuity.tsx) can offer the same specific
// Resume/Continue affordance instead of a generic "Continue your
// journey" link, without a second, independently-drifting copy of this
// same if/else. Uses only JourneyContext -- the same real, already-
// verified continuation signal this repo has had since RC5 (see
// lib/journey/state.ts). Not a Recommendation surface: it names no
// cross-product signal, computes nothing, and reads no data beyond this
// user's own three journey fields.
import { INTENTIONS } from "../onboarding/intentions.ts";
import { buildContinueUrl, PROMETHEUSK_DISPLAY_NAME } from "../onboarding/prometheusk.ts";
import { WITNESS_SLUG } from "../onboarding/witness.ts";
import type { JourneyContext } from "./state.ts";

export interface ContinuityAction {
  body: string;
  ctaLabel: string;
  href: string;
  external: boolean;
}

export function getContinuityAction(context: JourneyContext): ContinuityAction {
  // A completion receipt only ever gets verified at /continue (see
  // lib/onboarding/receipt.ts), which records practiceCompletedAt
  // immediately -- but witness/intention are only persisted into this
  // same JourneyContext later, when /journey/today's effect absorbs them
  // from the URL (see lib/journey/session.tsx's absorbIntentionParams). A
  // visitor who completes a practice and never clicks through to
  // /journey/today (e.g. closes the tab from /continue) has
  // practiceCompletedAt set with witness/intention still null. Checking
  // practiceCompletedAt first, ahead of witness/intention, keeps that
  // visitor from being told to "Begin with an Echo" again.
  if (context.practiceCompletedAt || context.witness) {
    return {
      body: `Your practice is right where you left it, on ${PROMETHEUSK_DISPLAY_NAME} -- pick up where you left off, or see what it recommends next.`,
      ctaLabel: "Return to your practice",
      href: buildContinueUrl(),
      external: true,
    };
  }

  if (!context.intention) {
    return {
      body: "You haven't begun an Echo yet. Every journey here starts with one small practice.",
      ctaLabel: "Begin with an Echo",
      href: "/start",
      external: false,
    };
  }

  return {
    body: "You named what you're after. The next step is waiting exactly where you left it.",
    ctaLabel: "Continue to the practice",
    href: `/witness/${WITNESS_SLUG}?intention=${context.intention}`,
    external: false,
  };
}

export function getIntentionLabel(context: JourneyContext): string | undefined {
  return INTENTIONS.find((i) => i.id === context.intention)?.label;
}
