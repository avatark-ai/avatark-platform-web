import type { Metadata } from "next";
import { createJourneyManifest } from "@/lib/journey/manifest";
import { JOURNEY_STEP_ORDER } from "@/lib/journey/stateMachine";
import { isPracticeHandoffAvailable } from "@/lib/onboarding/practiceHandoff";
import { isStreamHandoffAvailable } from "@/lib/onboarding/streamHandoff";
import { productForStep, boundaryCrossing } from "@/lib/integrations/stages";
import { describeIntegrationHealth } from "@/lib/integrations/health";
import { describeJourneySummary } from "@/lib/integrations/summary";
import { completedBoundaryCrossings } from "@/lib/integrations/journeyHistory";
import { ecosystemStageForProduct, healthStatusFromAdapterResult, STAGE_OWNER } from "@/lib/integrations/ecosystemMap";
import type { TimelineEntryData } from "@/components/integration/TimelineCard";
import type { HandoffCardData } from "@/components/integration/HandoffCard";
import type { PendingActionData } from "@/components/integration/PendingActionRow";
import { IntegrationDashboardClient } from "@/components/integration/IntegrationDashboardClient";

export const metadata: Metadata = {
  title: "Integration Dashboard",
};

// A single representative example journey's read-out across the whole
// ecosystem -- read-only, no backend, no persistence, no new APIs. Every
// status here is computed live from the frozen Journey Orchestrator
// (lib/journey/*) and Integration Layer (lib/integrations/*); this page
// adds no new business logic, only assembles their outputs (plus the
// small UX-only summary/action synthesis in describeJourneySummary and
// below) for the client component that renders the interactive
// Summary/Technical view toggle. The example manifest sits mid-journey
// (at "reflection", past Watch First and the practice intro) so every
// section has something real to show, including this repo's own
// documented gap (INTEGRATION_READINESS_REPORT.md): Echo's one seed
// practice ("the-promise-to-myself") has no verified PrometheusK
// mapping, so Journey Status honestly reads "Blocked" -- not a bug,
// a real, current ecosystem gap, scoped correctly (see summary.ts) so it
// never implies Arena/Stream (both untouched by this journey yet) are
// what's blocking.
export default function IntegrationDashboardPage() {
  const manifest = createJourneyManifest({
    journeyId: "example-journey",
    source: "invitation",
    entryPoint: "enter",
    invitationId: "tok_demo_invitation",
    watchFirstId: "story-demo",
    practiceId: "the-promise-to-myself",
    returnTo: "/continue",
    nextStep: "reflection",
    completedSteps: ["invitation_received", "invitation_accepted", "watch_first", "practice_intro", "practice_runtime"],
    metadata: { authState: "signed_in" },
  });

  const health = describeIntegrationHealth();
  const summary = describeJourneySummary(
    manifest,
    {
      invitationStatus: "pending",
      practiceAvailable: isPracticeHandoffAvailable(manifest.practiceId ?? ""),
      watchFirstAvailable: isStreamHandoffAvailable(manifest.watchFirstId ?? ""),
    },
    health
  );
  const { view, journeyStatus, integrationReadiness, primaryBlocker, recommendations } = summary;
  const currentStage = ecosystemStageForProduct(view.currentProduct);

  const timelineEntries: TimelineEntryData[] = JOURNEY_STEP_ORDER.map((step) => ({
    step,
    product: productForStep(step),
    state: manifest.completedSteps.includes(step) ? "completed" : step === manifest.nextStep ? "current" : "pending",
  }));

  const completedHandoffs: HandoffCardData[] = completedBoundaryCrossings(manifest).map(({ from, to, crossing }) => {
    const handoff = crossing.buildHandoff(manifest);
    const described = crossing.describeWithAdapter(handoff);
    return {
      key: `completed-${from}-${to}`,
      kind: "completed",
      from,
      to,
      toProduct: crossing.toProduct,
      crossesBoundary: true,
      handoff,
      adapterStatus: healthStatusFromAdapterResult(described),
      adapterMessage: described.message,
    };
  });

  // Only the single immediate pending crossing (if any) gets the full
  // HandoffCard treatment here -- every pending next option (crossing or
  // not) also gets a one-line PendingActionRow below, but that row never
  // repeats this card's payload/message, so the same transition can
  // appear in both sections without duplicating content.
  const pendingCrossingHandoffs: HandoffCardData[] = view.nextOptions
    .filter((option) => option.crossesBoundary)
    .map((option) => {
      const crossing = boundaryCrossing(view.currentStep, option.step)!;
      const described = crossing.describeWithAdapter(option.handoff);
      return {
        key: `pending-${view.currentStep}-${option.step}`,
        kind: "pending",
        from: view.currentStep,
        to: option.step,
        toProduct: option.product,
        crossesBoundary: true,
        handoff: option.handoff,
        adapterStatus: healthStatusFromAdapterResult(described),
        adapterMessage: described.message,
      };
    });

  const crossProductHandoffs: HandoffCardData[] = [...completedHandoffs, ...pendingCrossingHandoffs];

  const pendingActions: PendingActionData[] = view.nextOptions.map((option) => {
    if (!option.crossesBoundary) {
      return {
        key: `action-${view.currentStep}-${option.step}`,
        from: view.currentStep,
        to: option.step,
        product: option.product,
        actionLabel: `Advance to ${option.step.replace(/_/g, " ")} within ${option.product}.`,
        owner: STAGE_OWNER[ecosystemStageForProduct(option.product)],
        status: null,
      };
    }
    const crossing = boundaryCrossing(view.currentStep, option.step)!;
    const described = crossing.describeWithAdapter(option.handoff);
    const status = healthStatusFromAdapterResult(described);
    const actionLabel =
      status === "ready"
        ? `Ready to hand off to ${option.product}.`
        : status === "waiting"
          ? `Waiting on ${option.product} content/config mapping.`
          : `Not yet integrated with ${option.product}.`;
    return {
      key: `action-${view.currentStep}-${option.step}`,
      from: view.currentStep,
      to: option.step,
      product: option.product,
      actionLabel,
      owner: STAGE_OWNER[ecosystemStageForProduct(option.product)],
      status,
    };
  });

  return (
    <main className="mx-auto flex min-w-0 w-full max-w-6xl flex-col gap-8 px-6 py-12" style={{ background: "var(--midnight)", color: "var(--paper)" }}>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          Integration Dashboard
        </p>
        <h1 className="text-2xl font-semibold">A participant&apos;s journey across the AvatarK ecosystem</h1>
        <p className="max-w-2xl text-sm leading-6" style={{ color: "var(--text-dim)" }}>
          A read-only visualization of one representative journey, computed live from the existing Journey Orchestrator
          and Integration Layer. Nothing on this page is fetched, stored, or mutated.
        </p>
      </div>

      <IntegrationDashboardClient
        journeyStatus={journeyStatus}
        integrationReadiness={integrationReadiness}
        primaryBlocker={primaryBlocker}
        currentStage={currentStage}
        currentProduct={view.currentProduct}
        currentStep={view.currentStep}
        health={health}
        timelineEntries={timelineEntries}
        crossProductHandoffs={crossProductHandoffs}
        pendingActions={pendingActions}
        recommendations={recommendations}
      />
    </main>
  );
}
