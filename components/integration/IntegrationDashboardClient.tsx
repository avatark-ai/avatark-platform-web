"use client";

import { useMemo, useState } from "react";
import type { EcosystemStageId } from "@/lib/integrations/ecosystemMap";
import type { IntegrationHealthEntry } from "@/lib/integrations/health";
import type { IntegrationProduct } from "@/lib/integrations/stages";
import type { JourneyStepId } from "@/lib/journey/stateMachine";
import type { OverallStatusView, IntegrationReadinessView, Recommendation } from "@/lib/integrations/summary";
import { JourneyCard } from "./JourneyCard";
import { EcosystemMap } from "./EcosystemMap";
import { IntegrationHealthPanel } from "./IntegrationHealthPanel";
import { TimelineCard, type TimelineEntryData } from "./TimelineCard";
import { HandoffCard, type HandoffCardData } from "./HandoffCard";
import { PendingActionRow, type PendingActionData } from "./PendingActionRow";
import { RecommendationCard } from "./RecommendationCard";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold" style={{ color: "var(--paper)" }}>
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

function ViewModeToggle({ showTechnical, onChange }: { showTechnical: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-full border" style={{ borderColor: "var(--surface-line)" }}>
      {(["Summary", "Technical details"] as const).map((label, index) => {
        const active = index === 1 ? showTechnical : !showTechnical;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(index === 1)}
            className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors"
            style={{
              background: active ? "var(--gold)" : "transparent",
              color: active ? "var(--midnight)" : "var(--text-dim)",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// Around the current step -- 2 before, current, 2 after -- so the
// Journey Timeline reads "at a glance" by default instead of forcing a
// scroll through all 9 steps; this also absorbs the old, separate
// "Recently Completed" section (its last-3-completed slice always fell
// inside this same window), so that content isn't shown twice.
function condensedWindow(entries: TimelineEntryData[]): TimelineEntryData[] {
  const currentIndex = entries.findIndex((entry) => entry.state === "current");
  if (currentIndex === -1) return entries;
  const start = Math.max(0, currentIndex - 2);
  const end = Math.min(entries.length, currentIndex + 3);
  return entries.slice(start, end);
}

export interface IntegrationDashboardClientProps {
  journeyStatus: OverallStatusView;
  integrationReadiness: IntegrationReadinessView;
  primaryBlocker: string | null;
  currentStage: EcosystemStageId;
  currentProduct: IntegrationProduct;
  currentStep: JourneyStepId;
  health: IntegrationHealthEntry[];
  timelineEntries: TimelineEntryData[];
  crossProductHandoffs: HandoffCardData[];
  pendingActions: PendingActionData[];
  recommendations: Recommendation[];
}

export function IntegrationDashboardClient({
  journeyStatus,
  integrationReadiness,
  primaryBlocker,
  currentStage,
  currentProduct,
  currentStep,
  health,
  timelineEntries,
  crossProductHandoffs,
  pendingActions,
  recommendations,
}: IntegrationDashboardClientProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const [showFullTimeline, setShowFullTimeline] = useState(false);

  const displayedTimeline = useMemo(
    () => (showFullTimeline ? timelineEntries : condensedWindow(timelineEntries)),
    [showFullTimeline, timelineEntries]
  );
  const isCondensed = displayedTimeline.length < timelineEntries.length;

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <JourneyCard
        journeyStatus={journeyStatus}
        integrationReadiness={integrationReadiness}
        primaryBlocker={primaryBlocker}
        currentStage={currentStage}
        currentProduct={currentProduct}
        currentStep={currentStep}
      />

      <section className="flex min-w-0 flex-col gap-3">
        <SectionHeading>Ecosystem Map</SectionHeading>
        <EcosystemMap health={health} activeStage={currentStage} />
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          Summary shows the essentials. Technical details adds implementation notes and raw payloads.
        </p>
        <div className="self-start sm:self-auto">
          <ViewModeToggle showTechnical={showTechnical} onChange={setShowTechnical} />
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-3">
          <SectionHeading>Integration Health</SectionHeading>
          <IntegrationHealthPanel health={health} showTechnical={showTechnical} />
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          <SectionHeading>Pending Actions</SectionHeading>
          {pendingActions.length === 0 ? (
            <EmptyNote>n/a -- this journey has reached its terminal step.</EmptyNote>
          ) : (
            <div className="flex flex-col gap-2">
              {pendingActions.map((data) => (
                <PendingActionRow key={data.key} data={data} />
              ))}
            </div>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <SectionHeading>Journey Timeline</SectionHeading>
            {timelineEntries.length !== displayedTimeline.length || isCondensed ? (
              <button
                type="button"
                onClick={() => setShowFullTimeline((value) => !value)}
                className="text-xs font-semibold underline underline-offset-4"
                style={{ color: "var(--gold)" }}
              >
                {showFullTimeline ? "Show condensed view" : `Show full timeline (${timelineEntries.length} steps)`}
              </button>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            {displayedTimeline.map((entry) => (
              <TimelineCard key={entry.step} entry={entry} />
            ))}
          </div>
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          <SectionHeading>Cross-product Handoffs</SectionHeading>
          {crossProductHandoffs.length === 0 ? (
            <EmptyNote>No cross-product handoffs apply to this journey&apos;s current position.</EmptyNote>
          ) : (
            <div className="flex min-w-0 flex-col gap-3">
              {crossProductHandoffs.map((data) => (
                <HandoffCard key={data.key} data={data} showTechnical={showTechnical} />
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <SectionHeading>Recommendations</SectionHeading>
        <div className="flex flex-col gap-2">
          {recommendations.map((recommendation) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} />
          ))}
        </div>
      </section>
    </div>
  );
}
