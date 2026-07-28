import type { Metadata } from "next";
import { createJourneyManifest } from "@/lib/journey/manifest";
import { JOURNEY_STEP_ORDER } from "@/lib/journey/stateMachine";
import { isPracticeHandoffAvailable } from "@/lib/onboarding/practiceHandoff";
import { isStreamHandoffAvailable } from "@/lib/onboarding/streamHandoff";
import { productForStep, boundaryCrossing } from "@/lib/integrations/stages";
import { describeIntegrationHealth } from "@/lib/integrations/health";
import { describeJourneySummary } from "@/lib/integrations/summary";
import { completedBoundaryCrossings } from "@/lib/integrations/journeyHistory";
import { ecosystemStageForProduct, healthStatusFromAdapterResult } from "@/lib/integrations/ecosystemMap";
import { JourneyCard } from "@/components/integration/JourneyCard";
import { EcosystemMap } from "@/components/integration/EcosystemMap";
import { IntegrationHealthPanel } from "@/components/integration/IntegrationHealthPanel";
import { TimelineCard, type TimelineEntryData } from "@/components/integration/TimelineCard";
import { HandoffCard, type HandoffCardData } from "@/components/integration/HandoffCard";
import { RecommendationCard } from "@/components/integration/RecommendationCard";

export const metadata: Metadata = {
  title: "Integration Dashboard",
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold" style={{ color: "var(--paper)" }}>
      {children}
    </h2>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm" style={{ color: "var(--text-dim)" }}>
      {children}
    </p>
  );
}

// A single representative example journey's read-out across the whole
// ecosystem -- read-only, no backend, no persistence, no new APIs. Every
// number/status here is computed live from the frozen Journey
// Orchestrator (lib/journey/*) and Integration Layer (lib/integrations/*)
// -- this page adds no new business logic, only assembles their existing
// outputs into the sections/cards the mission asked for. The example
// manifest below is deliberately placed mid-journey (at "reflection",
// past Watch First and the practice intro) so every section has
// something real to show, including the one honest blocker this repo's
// own INTEGRATION_READINESS_REPORT.md already documents: Echo's one seed
// practice ("the-promise-to-myself") has no verified PrometheusK mapping,
// so `practiceAvailable` is false and the Overall Journey Status reads
// "Blocked" -- not a bug in this page, a real, current ecosystem gap.
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
  const { view, overallStatus, recommendations } = summary;
  const currentStage = ecosystemStageForProduct(view.currentProduct);

  const timelineEntries: TimelineEntryData[] = JOURNEY_STEP_ORDER.map((step) => ({
    step,
    product: productForStep(step),
    state: manifest.completedSteps.includes(step) ? "completed" : step === manifest.nextStep ? "current" : "pending",
  }));
  const recentlyCompleted = timelineEntries.filter((entry) => entry.state === "completed").slice(-3);

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

  const pendingHandoffs: HandoffCardData[] = view.nextOptions.map((option) => {
    const crossing = boundaryCrossing(view.currentStep, option.step);
    const described = crossing ? crossing.describeWithAdapter(option.handoff) : null;
    return {
      key: `pending-${view.currentStep}-${option.step}`,
      kind: "pending",
      from: view.currentStep,
      to: option.step,
      toProduct: option.product,
      crossesBoundary: option.crossesBoundary,
      handoff: option.handoff,
      adapterStatus: described ? healthStatusFromAdapterResult(described) : null,
      adapterMessage: described?.message ?? null,
    };
  });

  const crossProductHandoffs = [...completedHandoffs, ...pendingHandoffs.filter((h) => h.crossesBoundary)];
  const pendingActions = pendingHandoffs;

  return (
    <main
      className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12"
      style={{ background: "var(--midnight)", color: "var(--paper)" }}
    >
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

      <JourneyCard
        overallStatus={overallStatus}
        currentStage={currentStage}
        currentProduct={view.currentProduct}
        currentStep={view.currentStep}
      />

      <section className="flex flex-col gap-4">
        <SectionHeading>Ecosystem Map</SectionHeading>
        <EcosystemMap health={health} activeStage={currentStage} />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>Integration Health</SectionHeading>
        <IntegrationHealthPanel health={health} />
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading>Journey Timeline</SectionHeading>
        <div className="flex flex-col gap-2">
          {timelineEntries.map((entry) => (
            <TimelineCard key={entry.step} entry={entry} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading>Recently Completed</SectionHeading>
        {recentlyCompleted.length === 0 ? (
          <EmptyNote>Nothing completed yet.</EmptyNote>
        ) : (
          <div className="flex flex-col gap-2">
            {recentlyCompleted.map((entry) => (
              <TimelineCard key={entry.step} entry={entry} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading>Cross-product Handoffs</SectionHeading>
        {crossProductHandoffs.length === 0 ? (
          <EmptyNote>No cross-product handoffs apply to this journey&apos;s current position.</EmptyNote>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {crossProductHandoffs.map((data) => (
              <HandoffCard key={data.key} data={data} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading>Pending Actions</SectionHeading>
        {pendingActions.length === 0 ? (
          <EmptyNote>n/a -- this journey has reached its terminal step.</EmptyNote>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pendingActions.map((data) => (
              <HandoffCard key={data.key} data={data} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeading>Recommendations</SectionHeading>
        <div className="flex flex-col gap-2">
          {recommendations.map((recommendation) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} />
          ))}
        </div>
      </section>
    </main>
  );
}
