import { recoverJourney, type JourneyRecoveryAction, type JourneyRecoveryReason, type JourneyManifest } from "@avatark/journey";
import { boundaryCrossing } from "./stages.ts";
import { describeDashboard, type DashboardView, type DescribeDashboardInput } from "./dashboard.ts";
import { ecosystemStageForProduct, healthStatusFromAdapterResult, STAGE_OWNER, type IntegrationHealthStatus } from "./ecosystemMap.ts";
import type { IntegrationHealthEntry } from "./health.ts";

// ============================================================
// UX pass (2026-07-28): the dashboard's original single "Blocked" pill
// conflated 3 different questions viewers actually have -- "can this
// participant keep going", "is the very next cross-product handoff
// wired up", and "what, specifically, is in the way." This file now
// answers each separately, so a future missing Arena/Stream contract
// (which the Integration Health panel still reports honestly) never
// reads as if it stops a participant who's only as far as Prometheus/
// Living Echo -- integrationReadiness and primaryBlocker are always
// scoped to THIS journey's immediate next transition, never the
// ecosystem-wide rollup (that's what health.ts/IntegrationHealthPanel is
// for).
//
// Both derivations need the *actual* recovery reason, not just
// DashboardStatus.source -- describeDashboard's own "recovery" source
// covers 4 real blockers (expired/invalid invitation, missing
// practice/Watch First) *and* 2 non-blocking cases recovery.ts also
// models under the same source (an already-finished journey, and a
// perfectly normal in-progress one being resumed). DashboardStatus only
// exposes {source, message}, discarding which of the 6
// JourneyRecoveryReason values actually applied -- so this file calls
// the frozen recoverJourney a second time with the same inputs
// describeDashboard already used, rather than mis-reading "recovery" as
// always meaning "blocked".
export type OverallJourneyStatus = "not_started" | "in_progress" | "blocked" | "complete";

export interface OverallStatusView {
  status: OverallJourneyStatus;
  label: string;
}

// missing_watch_first is deliberately NOT here: recovery.ts's own comment
// calls it a graceful degradation ("same non-blocking spirit as Watch
// First already being optional in the state machine") -- it redirects
// onward to practice_intro rather than stopping the participant, so
// journeyStatus must read "in_progress", not "blocked", exactly the
// "a future/optional gap must not imply the participant is stuck" rule
// this UX pass asked for.
const BLOCKING_REASONS = new Set<JourneyRecoveryReason>(["expired_invitation", "invalid_invitation", "missing_practice"]);

export function classifyOverallStatus(recovery: JourneyRecoveryAction | null): OverallStatusView {
  if (!recovery) return { status: "not_started", label: "Not Started" };
  if (BLOCKING_REASONS.has(recovery.reason)) return { status: "blocked", label: "Blocked" };
  if (recovery.reason === "already_completed") return { status: "complete", label: "Complete" };
  return { status: "in_progress", label: "In Progress" };
}

export interface IntegrationReadinessView {
  status: IntegrationHealthStatus;
  message: string;
}

/**
 * Scoped ONLY to this journey's immediate next transition -- never an
 * ecosystem-wide rollup. An expired/invalid invitation is a journey
 * problem, not an integration one, so it reads "ready" here even while
 * journeyStatus reads "blocked": the two fields are allowed to disagree,
 * that disagreement IS the point (this is a journey blocker, not a
 * contract gap). A missing-practice/missing-Watch-First block *is* an
 * integration gap, so it's reflected here via the real adapter's own
 * health status, not a fabricated one.
 */
function describeIntegrationReadiness(view: DashboardView, recovery: JourneyRecoveryAction | null): IntegrationReadinessView {
  if (recovery?.reason === "missing_practice" || recovery?.reason === "missing_watch_first") {
    const crossing =
      recovery.reason === "missing_practice"
        ? boundaryCrossing("practice_intro", "practice_runtime")
        : boundaryCrossing("invitation_accepted", "watch_first");
    if (crossing) {
      const handoff = crossing.buildHandoff(view.manifest);
      const described = crossing.describeWithAdapter(handoff);
      return { status: healthStatusFromAdapterResult(described), message: described.message };
    }
  }

  const crossingOption = view.nextOptions.find((option) => option.crossesBoundary);
  if (!crossingOption) {
    return { status: "ready", message: "Nothing to integrate for the current step -- it stays within one product." };
  }
  const crossing = boundaryCrossing(view.currentStep, crossingOption.step);
  const described = crossing!.describeWithAdapter(crossingOption.handoff);
  return { status: healthStatusFromAdapterResult(described), message: described.message };
}

export type RecommendationTone = "success" | "warning" | "info";

export interface Recommendation {
  id: string;
  tone: RecommendationTone;
  /** What's wrong, or "None" when nothing is. */
  blocker: string;
  /** Who/what owns fixing it. */
  owner: string;
  /** The exact next action, an imperative sentence. */
  nextAction: string;
}

function primaryRecommendation(view: DashboardView, recovery: JourneyRecoveryAction | null): Recommendation {
  if (recovery?.reason === "expired_invitation" || recovery?.reason === "invalid_invitation") {
    return {
      id: "primary-status",
      tone: "warning",
      blocker: recovery.message,
      owner: "Whoever issued this invitation",
      nextAction: "Ask for a new invitation link.",
    };
  }
  if (recovery?.reason === "missing_practice") {
    return {
      id: "primary-status",
      tone: "warning",
      blocker: recovery.message,
      owner: STAGE_OWNER.Prometheus,
      nextAction: `Map practice \`${view.manifest.practiceId}\` in PrometheusK to unblock the runtime handoff.`,
    };
  }
  if (recovery?.reason === "missing_watch_first") {
    // Non-blocking: recovery.ts already redirects onward to practice_intro.
    return {
      id: "primary-status",
      tone: "info",
      blocker: "None",
      owner: STAGE_OWNER.Stream,
      nextAction: `Continuing straight to the practice intro -- Watch First content \`${view.manifest.watchFirstId}\` has no StreamK mapping, but this doesn't stop the journey.`,
    };
  }
  if (recovery?.reason === "already_completed") {
    return {
      id: "primary-status",
      tone: "success",
      blocker: "None",
      owner: "—",
      nextAction: "Nothing further needed -- this journey already reached Arena.",
    };
  }
  if (recovery?.reason === "resumable") {
    return {
      id: "primary-status",
      tone: "info",
      blocker: "None",
      owner: "—",
      nextAction: `Resume at ${view.currentStep.replace(/_/g, " ")}.`,
    };
  }

  const crossingOption = view.nextOptions.find((option) => option.crossesBoundary);
  if (crossingOption) {
    return {
      id: "primary-status",
      tone: "info",
      blocker: "None",
      owner: STAGE_OWNER[ecosystemStageForProduct(crossingOption.product)],
      nextAction: `Continue to ${crossingOption.step.replace(/_/g, " ")} (hands off to ${crossingOption.product}).`,
    };
  }
  if (view.nextOptions.length === 0) {
    return { id: "primary-status", tone: "success", blocker: "None", owner: "—", nextAction: "Nothing pending." };
  }
  return {
    id: "primary-status",
    tone: "success",
    blocker: "None",
    owner: "—",
    nextAction: `Continue to ${view.nextOptions[0].step.replace(/_/g, " ")} within ${view.currentProduct}.`,
  };
}

/**
 * Always exactly one primary recommendation (blocker/owner/nextAction
 * for the immediate next transition), plus one "info" recommendation
 * per pending boundary-crossing next step whose ecosystem stage reads
 * "missing_contract" -- explicitly noted as NOT blocking current
 * progress, since these describe a future edge, not this journey's next
 * step (unless that future edge and the next step are the same one, in
 * which case the primary recommendation above already covers it).
 */
export function deriveRecommendations(
  view: DashboardView,
  recovery: JourneyRecoveryAction | null,
  health: IntegrationHealthEntry[]
): Recommendation[] {
  const recommendations: Recommendation[] = [primaryRecommendation(view, recovery)];

  for (const option of view.nextOptions) {
    if (!option.crossesBoundary) continue;
    const stage = ecosystemStageForProduct(option.product);
    const entry = health.find((h) => h.stage === stage);
    if (entry?.status === "missing_contract") {
      recommendations.push({
        id: `missing-contract-${stage}`,
        tone: "info",
        blocker: `${entry.message} This does not block your current progress.`,
        owner: STAGE_OWNER[stage],
        nextAction: `Build the ${stage} adapter/handoff contract before this edge can go live.`,
      });
    }
  }

  return recommendations;
}

export interface JourneyDashboardSummary {
  view: DashboardView;
  recovery: JourneyRecoveryAction | null;
  journeyStatus: OverallStatusView;
  integrationReadiness: IntegrationReadinessView;
  /** Non-null only when journeyStatus is "blocked" -- a real blocker of the immediate next transition. */
  primaryBlocker: string | null;
  recommendations: Recommendation[];
}

/** The one call site a dashboard page needs: describeDashboard, recoverJourney, and every derivation above, run once each against the same manifest/input. */
export function describeJourneySummary(
  manifest: JourneyManifest,
  input: DescribeDashboardInput,
  health: IntegrationHealthEntry[]
): JourneyDashboardSummary {
  const view = describeDashboard(manifest, input);
  const recovery = recoverJourney({
    invitationStatus: input.invitationStatus,
    manifest,
    practiceAvailable: input.practiceAvailable,
    watchFirstAvailable: input.watchFirstAvailable,
  });
  const journeyStatus = classifyOverallStatus(recovery);
  const integrationReadiness = describeIntegrationReadiness(view, recovery);
  const primaryBlocker = journeyStatus.status === "blocked" ? recovery!.message : null;
  const recommendations = deriveRecommendations(view, recovery, health);
  return { view, recovery, journeyStatus, integrationReadiness, primaryBlocker, recommendations };
}
