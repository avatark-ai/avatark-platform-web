"use client";

import { useMemo, useState } from "react";
import {
  simulateJourney,
  type SimulatorScenario,
  type SimulatorAuthState,
  type SimulatorStageView,
} from "@/lib/integrations/simulate";
import { describeDashboard } from "@/lib/integrations/dashboard";
import { isPracticeHandoffAvailable } from "@/lib/onboarding/practiceHandoff";
import { isStreamHandoffAvailable } from "@/lib/onboarding/streamHandoff";
import { IntegrationDashboardView } from "./IntegrationDashboardView";

const SCENARIOS: { id: SimulatorScenario; label: string }[] = [
  { id: "invitation", label: "Invitation" },
  { id: "practice", label: "Practice" },
  { id: "watch_first", label: "Watch First" },
  { id: "journey", label: "Journey" },
];

const AUTH_STATES: { id: SimulatorAuthState; label: string }[] = [
  { id: "guest", label: "Guest" },
  { id: "signed_in", label: "Signed In" },
];

// A fixed example value, not `new Date()` -- this is a visualization
// tool showing what a Living Echo handoff's shape looks like, not a real
// completion tracker, and a fixed constant keeps server and client
// render output identical (no hydration mismatch) with no effect/loading
// state needed at all.
const EXAMPLE_COMPLETED_AT = "2026-01-01T00:00:00.000Z";

function PickerGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
}: {
  legend: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={value === option.id}
            className="rounded-full border px-4 py-1.5 text-sm font-medium"
            style={{
              borderColor: "var(--surface-line)",
              background: value === option.id ? "var(--gold)" : "transparent",
              color: value === option.id ? "var(--midnight)" : "var(--paper)",
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function StageCard({ stage }: { stage: SimulatorStageView }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-4"
      style={{
        borderColor: "var(--surface-line)",
        background: stage.visited ? "var(--surface)" : "transparent",
        opacity: stage.visited ? 1 : 0.55,
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold" style={{ color: "var(--paper)" }}>
          {stage.product}
        </h3>
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>
          {stage.visited ? stage.steps.join(", ") : "not visited"}
        </span>
      </div>
      <p className="text-xs leading-5" style={{ color: "var(--text-dim)" }}>
        {stage.incomingHandoffNote}
      </p>
      {stage.incomingHandoff !== null && (
        <pre
          className="overflow-x-auto rounded-lg border p-3 text-xs leading-5"
          style={{ borderColor: "var(--surface-line)", background: "var(--midnight)", color: "var(--paper)" }}
        >
          {JSON.stringify(stage.incomingHandoff, null, 2)}
        </pre>
      )}
    </div>
  );
}

// The Integration Simulator: pick a scenario + auth state, see the exact
// handoff object at every stage of AvatarK -> StreamK -> Prometheus ->
// Living Echo -> Arena. Everything below is computed client-side, purely
// from lib/integrations/simulate.ts -- no network request of any kind.
export function IntegrationSimulatorView() {
  const [scenario, setScenario] = useState<SimulatorScenario>("invitation");
  const [authState, setAuthState] = useState<SimulatorAuthState>("guest");

  const stages = useMemo<SimulatorStageView[]>(
    () => simulateJourney(scenario, authState, "simulator-journey", EXAMPLE_COMPLETED_AT),
    [scenario, authState]
  );

  const startingStage = stages.find((stage) => stage.visited && stage.manifestAtEntry);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
        <PickerGroup legend="Scenario" options={SCENARIOS} value={scenario} onChange={setScenario} />
        <PickerGroup legend="Auth state" options={AUTH_STATES} value={authState} onChange={setAuthState} />
      </div>

      {startingStage?.manifestAtEntry && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
            Current position
          </h2>
          <IntegrationDashboardView
            view={describeDashboard(startingStage.manifestAtEntry, {
              invitationStatus: null,
              practiceAvailable: startingStage.manifestAtEntry.practiceId
                ? isPracticeHandoffAvailable(startingStage.manifestAtEntry.practiceId)
                : true,
              watchFirstAvailable: startingStage.manifestAtEntry.watchFirstId
                ? isStreamHandoffAvailable(startingStage.manifestAtEntry.watchFirstId)
                : true,
            })}
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          AvatarK → StreamK → Prometheus → Living Echo → Arena
        </h2>
        <div className="flex flex-col gap-4">
          {stages.map((stage) => (
            <StageCard key={stage.product} stage={stage} />
          ))}
        </div>
      </div>
    </div>
  );
}
