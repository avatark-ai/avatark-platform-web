import type { JourneyStepId } from "@avatark/journey";
import type { IntegrationProduct } from "@/lib/integrations/stages";
import type { IntegrationHealthStatus } from "@/lib/integrations/ecosystemMap";
import { HealthStatusPill } from "./status";

export interface PendingActionData {
  key: string;
  from: JourneyStepId;
  to: JourneyStepId;
  product: IntegrationProduct;
  /** A short, synthesized one-liner -- deliberately its own phrasing, not
   *  a copy of the fuller adapter message shown in Cross-product Handoffs. */
  actionLabel: string;
  owner: string;
  /** null when this step stays within one product -- nothing to integrate. */
  status: IntegrationHealthStatus | null;
}

// A one-line summary of what's next and who owns it -- deliberately NOT
// a HandoffCard: no payload, no adapter message, no JSON. Cross-product
// Handoffs (HandoffCard) already shows the full detail for the same
// upcoming transition when it crosses a boundary; this row exists so
// "what do I need to do next" doesn't require reading a full card twice.
export function PendingActionRow({ data }: { data: PendingActionData }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="truncate text-sm" style={{ color: "var(--paper)" }}>
          {data.actionLabel}
        </p>
        <p className="truncate text-xs" style={{ color: "var(--text-dim)" }}>
          {data.to.replace(/_/g, " ")} ({data.product}) -- owner: {data.owner}
        </p>
      </div>
      {data.status && (
        <div className="shrink-0">
          <HealthStatusPill status={data.status} />
        </div>
      )}
    </div>
  );
}
