import type { IntegrationHealthStatus } from "@/lib/integrations/ecosystemMap";
import type { OverallJourneyStatus } from "@/lib/integrations/summary";

// ============================================================
// Shared status color/label lookup for every card in components/integration/.
// Colors are the dataviz skill's fixed status palette (validated against
// this app's --midnight dark surface: good/warning/critical all clear
// 3:1 contrast) -- "optional"/"not_started"/"in_progress" aren't
// severities, so they stay off that fixed palette and use this app's own
// tokens instead (--text-dim/--gold) rather than inventing a 5th/6th/7th
// status hue. Every pill pairs the color with a text label (StatusPill
// below) -- color is never the only signal, per the skill's own rule.
const HEALTH_STATUS_LABEL: Record<IntegrationHealthStatus, string> = {
  ready: "Ready",
  waiting: "Waiting",
  missing_contract: "Missing Contract",
  optional: "Optional",
};

const HEALTH_STATUS_COLOR: Record<IntegrationHealthStatus, string> = {
  ready: "#0ca30c",
  waiting: "#fab219",
  missing_contract: "#d03b3b",
  optional: "var(--text-dim)",
};

const OVERALL_STATUS_LABEL: Record<OverallJourneyStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  blocked: "Blocked",
  complete: "Complete",
};

const OVERALL_STATUS_COLOR: Record<OverallJourneyStatus, string> = {
  not_started: "var(--text-dim)",
  in_progress: "var(--gold)",
  blocked: "#d03b3b",
  complete: "#0ca30c",
};

function Pill({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
      style={{ borderColor: color, color: "var(--paper)" }}
    >
      <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

export function HealthStatusPill({ status }: { status: IntegrationHealthStatus }) {
  return <Pill color={HEALTH_STATUS_COLOR[status]} label={HEALTH_STATUS_LABEL[status]} />;
}

export function OverallStatusPill({ status }: { status: OverallJourneyStatus }) {
  return <Pill color={OVERALL_STATUS_COLOR[status]} label={OVERALL_STATUS_LABEL[status]} />;
}

export function healthStatusColor(status: IntegrationHealthStatus): string {
  return HEALTH_STATUS_COLOR[status];
}
