import { recoverJourney, type JourneyRecoveryAction } from "../journey/recovery.ts";
import type { JourneyManifest } from "../journey/manifest.ts";
import { describeDashboard, type DashboardView, type DescribeDashboardInput } from "./dashboard.ts";
import { ecosystemStageForProduct } from "./ecosystemMap.ts";
import type { IntegrationHealthEntry } from "./health.ts";

// ============================================================
// Two small, pure presentational derivations for the Integration
// Dashboard's "Overall Journey Status" and "Recommendations" sections,
// plus the one function (describeJourneySummary) that wires them to
// describeDashboard (dashboard.ts, frozen) for a single call site.
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

const BLOCKING_REASONS = new Set(["expired_invitation", "invalid_invitation", "missing_practice", "missing_watch_first"]);

export function classifyOverallStatus(recovery: JourneyRecoveryAction | null): OverallStatusView {
  if (!recovery) return { status: "not_started", label: "Not Started" };
  if (BLOCKING_REASONS.has(recovery.reason)) return { status: "blocked", label: "Blocked" };
  if (recovery.reason === "already_completed") return { status: "complete", label: "Complete" };
  return { status: "in_progress", label: "In Progress" };
}

export type RecommendationTone = "success" | "warning" | "info";

export interface Recommendation {
  id: string;
  tone: RecommendationTone;
  title: string;
  message: string;
}

/**
 * The primary recommendation always reflects the same fact
 * view.status/recovery already surfaced elsewhere on the dashboard --
 * never a second, competing message. Additional "info" recommendations
 * follow for each pending boundary-crossing next step whose ecosystem
 * stage reads "missing_contract" in describeIntegrationHealth: a
 * forward-looking, ecosystem-wide fact ("the next real product this
 * journey would reach has no implementation anywhere yet"), not a
 * restatement of the primary message.
 */
export function deriveRecommendations(
  view: DashboardView,
  recovery: JourneyRecoveryAction | null,
  health: IntegrationHealthEntry[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (recovery && BLOCKING_REASONS.has(recovery.reason)) {
    recommendations.push({ id: "primary-status", tone: "warning", title: "Resolve this journey's blocker", message: recovery.message });
  } else if (recovery?.reason === "already_completed") {
    recommendations.push({ id: "primary-status", tone: "success", title: "Journey complete", message: recovery.message });
  } else if (recovery?.reason === "resumable") {
    recommendations.push({ id: "primary-status", tone: "info", title: "Resume where you left off", message: recovery.message });
  } else {
    const tone: RecommendationTone = view.status.source === "ready" ? "success" : "warning";
    const title = view.status.source === "adapter" ? "Waiting on the next product boundary" : "Ready to continue";
    recommendations.push({ id: "primary-status", tone, title, message: view.status.message });
  }

  for (const option of view.nextOptions) {
    if (!option.crossesBoundary) continue;
    const stage = ecosystemStageForProduct(option.product);
    const entry = health.find((h) => h.stage === stage);
    if (entry?.status === "missing_contract") {
      recommendations.push({
        id: `missing-contract-${stage}`,
        tone: "info",
        title: `${stage} has no integration built yet`,
        message: entry.message,
      });
    }
  }

  return recommendations;
}

export interface JourneyDashboardSummary {
  view: DashboardView;
  recovery: JourneyRecoveryAction | null;
  overallStatus: OverallStatusView;
  recommendations: Recommendation[];
}

/** The one call site a dashboard page needs: describeDashboard, recoverJourney, and both derivations above, run once each against the same manifest/input. */
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
  const overallStatus = classifyOverallStatus(recovery);
  const recommendations = deriveRecommendations(view, recovery, health);
  return { view, recovery, overallStatus, recommendations };
}
