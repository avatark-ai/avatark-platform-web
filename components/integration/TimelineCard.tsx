import type { JourneyStepId } from "@/lib/journey/stateMachine";
import type { IntegrationProduct } from "@/lib/integrations/stages";

export type TimelineEntryState = "completed" | "current" | "pending";

export interface TimelineEntryData {
  step: JourneyStepId;
  product: IntegrationProduct;
  state: TimelineEntryState;
}

const STATE_COLOR: Record<TimelineEntryState, string> = {
  completed: "#0ca30c",
  current: "var(--gold)",
  pending: "var(--text-dim)",
};

const STATE_LABEL: Record<TimelineEntryState, string> = {
  completed: "Completed",
  current: "Current",
  pending: "Pending",
};

// One row of the Journey Timeline -- reused as-is (filtered to only
// "completed" entries) for the Recently Completed section, so both
// sections read as the same visual language rather than two competing
// designs for the same underlying JourneyStepId data.
export function TimelineCard({ entry }: { entry: TimelineEntryData }) {
  const color = STATE_COLOR[entry.state];
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
      <span aria-hidden className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium" style={{ color: "var(--paper)" }}>
          {entry.step.replace(/_/g, " ")}
        </span>
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>
          {entry.product}
        </span>
      </div>
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
        {STATE_LABEL[entry.state]}
      </span>
    </div>
  );
}
