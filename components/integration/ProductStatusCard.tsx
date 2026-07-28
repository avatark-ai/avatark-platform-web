import type { IntegrationHealthEntry } from "@/lib/integrations/health";
import { HealthStatusPill } from "./status";

// One ecosystem stage's integration health -- reused both inside
// IntegrationHealthPanel (full, with message) and EcosystemMap (compact,
// label + pill only, `active` adds the gold ring for the current stage).
export function ProductStatusCard({
  entry,
  compact = false,
  active = false,
}: {
  entry: IntegrationHealthEntry;
  compact?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border p-3"
      style={{
        borderColor: active ? "var(--gold)" : "var(--surface-line)",
        background: "var(--surface)",
        boxShadow: active ? "0 0 0 1px var(--gold)" : undefined,
      }}
    >
      <div className={compact ? "flex flex-col items-start gap-1.5" : "flex items-center justify-between gap-2"}>
        <span className="text-sm font-semibold" style={{ color: "var(--paper)" }}>
          {entry.stage}
        </span>
        <HealthStatusPill status={entry.status} />
      </div>
      {!compact && (
        <p className="text-xs leading-5" style={{ color: "var(--text-dim)" }}>
          {entry.message}
        </p>
      )}
    </div>
  );
}
