// ============================================================
// Explicit Echo -> PrometheusK practice-handoff contract.
//
// The mapping from an Echo practice slug to its real PrometheusK
// destination (journey + practice UUID) lives here, and only here --
// never derived from a display title, never silently substituted for a
// different practice. This replaces the previous behavior in
// lib/onboarding/prometheusk.ts, where buildBorrowUrl always hard-routed
// every handoff to one fixed target regardless of which practice was
// requested.
//
// Verified mismatch (audited 2026-07-26): Echo's one seed practice,
// "the-promise-to-myself" ("The Two-Minute Check-In", a short daily
// return-to-a-decision practice, sourced from "The Returner" archetype),
// was always handed to PrometheusK's "The First 90 Days Drift"
// (builder-journey / aad2380d-8d13-4499-8ac9-eb37d9f41cbb) -- a real,
// different, unrelated 12-minute weekly long-arc practice. Cross-checked
// against prometheusk-web's full practice registry (5 real practices
// total): none of them is a content match for "The Two-Minute Check-In."
// Per explicit product decision, this practice is left unmapped (an
// honest "unavailable" state) rather than pointed at the wrong practice
// again or at a weak guess.
import { safeReturnPath } from "@avatark/auth";

export interface PracticeHandoffTarget {
  journeyId: string;
  practiceId: string;
}

// Every field a caller needs to describe *why* a handoff is happening,
// not just where to. sourceProduct/sourceRoute/echoSlug/witness/
// invitationId/cohortId are breadcrumbs (same as before); practiceSlug is
// the one field this module ever uses to resolve a destination.
export interface PracticeHandoffContext {
  sourceProduct: "echo";
  sourceRoute: string;
  echoSlug: string | null;
  practiceSlug: string;
  witness?: string | null;
  invitationId?: string | null;
  cohortId?: string | null;
  returnTo: string;
}

// Every Echo practice slug that has ever existed must have an entry here.
// `null` is an explicit, deliberate "no verified PrometheusK match yet,"
// not an omission -- resolvePracticeHandoffTarget treats a missing key
// and an explicit `null` identically (unavailable), so there is no way
// for a new practice to accidentally inherit some other practice's
// target by falling through a default case.
const PRACTICE_HANDOFF_REGISTRY: Record<string, PracticeHandoffTarget | null> = {
  "the-promise-to-myself": null,
};

export function resolvePracticeHandoffTarget(practiceSlug: string): PracticeHandoffTarget | null {
  return PRACTICE_HANDOFF_REGISTRY[practiceSlug] ?? null;
}

export function isPracticeHandoffAvailable(practiceSlug: string): boolean {
  return resolvePracticeHandoffTarget(practiceSlug) !== null;
}

// Builds an absolute, same-origin returnTo URL from a (possibly
// attacker-influenced) raw path, reusing the one shared allowlist guard
// every other redirect target in this repo uses -- never a second,
// looser check invented for this one caller. Rejects anything that isn't
// a same-origin relative path (protocol-relative, absolute, malformed)
// by falling back to `fallbackPath`.
export function buildSafeReturnTo(origin: string, rawPath: string | null | undefined, fallbackPath = "/continue"): string {
  return `${origin}${safeReturnPath(rawPath, fallbackPath)}`;
}
