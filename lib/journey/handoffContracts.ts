import type { JourneyManifest } from "./manifest.ts";

// ============================================================
// Product handoff contracts -- one interface per edge in the Entry
// Engine's architecture diagram (Echo -> StreamK -> PrometheusK -> Living
// Echo -> Arena). These are orchestration contracts only: a typed
// payload shape plus a pure projection from JourneyManifest, never a
// network call, redirect, or fetch. This repository owns orchestration;
// it does not own practice runtime, content publishing, the media
// player, Arena, or Studio -- these contracts describe the boundary,
// they do not cross it.
//
// Each contract states plainly whether a real implementation exists
// today, so this file is never mistaken for claiming more than what's
// actually built.

/**
 * Echo -> StreamK (Watch First). No real implementation exists yet --
 * Watch First is a single static page today, and
 * lib/onboarding/streamHandoff.ts's registry is deliberately empty (no
 * story content ships, no StreamK content id has ever been verified).
 * This describes the intended shape for when a real per-story StreamK
 * handoff ships.
 */
export interface EchoToStreamKHandoff {
  journeyId: string;
  invitationId: string | null;
  watchFirstId: string;
  returnTo: string;
}

export function buildEchoToStreamKHandoff(manifest: JourneyManifest): EchoToStreamKHandoff | null {
  if (!manifest.watchFirstId || !manifest.returnTo) return null;
  return {
    journeyId: manifest.journeyId,
    invitationId: manifest.invitationId,
    watchFirstId: manifest.watchFirstId,
    returnTo: manifest.returnTo,
  };
}

/**
 * StreamK -> PrometheusK (Watch First finished, or an invitation named a
 * practice directly -> practice runtime). Real today for the
 * practice-direct path via lib/onboarding/practiceHandoff.ts
 * (PracticeHandoffTarget) + lib/onboarding/prometheusk.ts
 * (OnboardingHandoffContext, buildBorrowUrl) -- this contract names the
 * same fields as that real implementation, it does not invent a second
 * shape for the same edge.
 */
export interface StreamKToPrometheusHandoff {
  journeyId: string;
  practiceId: string;
  witness: string;
  invitationId: string | null;
  cohortId: string | null;
  returnTo: string;
}

export function buildStreamKToPrometheusHandoff(manifest: JourneyManifest): StreamKToPrometheusHandoff | null {
  if (!manifest.practiceId || !manifest.returnTo) return null;
  return {
    journeyId: manifest.journeyId,
    practiceId: manifest.practiceId,
    witness: manifest.practiceId,
    invitationId: manifest.invitationId,
    cohortId: manifest.cohortId,
    returnTo: manifest.returnTo,
  };
}

/**
 * PrometheusK -> Living Echo. Real today only via the RC5 signed-receipt
 * loop (lib/onboarding/receipt.ts, verified server-side in
 * app/continue/page.tsx) -- Living Echo itself is PrometheusK's own
 * internal record (packages/product-registry's description of
 * "prometheusk"), not a separate product this repo integrates with
 * directly. This is the one boundary this platform ever observes: a
 * verified completion fact, nothing about Living Echo's contents.
 */
export interface PrometheusToLivingEchoHandoff {
  journeyId: string;
  practiceId: string;
  completedAt: string;
}

export function buildPrometheusToLivingEchoHandoff(
  manifest: JourneyManifest,
  completedAt: string
): PrometheusToLivingEchoHandoff | null {
  if (!manifest.practiceId) return null;
  return { journeyId: manifest.journeyId, practiceId: manifest.practiceId, completedAt };
}

/**
 * Living Echo -> Arena(K). No implementation anywhere in this repo --
 * ArenaK integration is a distinct, larger, unscoped effort (see
 * docs/ecosystem/WAVE1_REGISTRY_INTEGRATION_REPORT.md's "Return-to-
 * Platform flow is missing for GameK, ArenaK, and StreamK"). Contract
 * only, describing the intended recommendation handoff once one exists.
 */
export type LivingEchoToArenaRecommendationReason = "practice_completed" | "cohort_invite" | "manual";

export interface LivingEchoToArenaHandoff {
  journeyId: string;
  recommendationReason: LivingEchoToArenaRecommendationReason;
  returnTo: string | null;
}

export function buildLivingEchoToArenaHandoff(
  manifest: JourneyManifest,
  recommendationReason: LivingEchoToArenaRecommendationReason
): LivingEchoToArenaHandoff {
  return { journeyId: manifest.journeyId, recommendationReason, returnTo: manifest.returnTo };
}
