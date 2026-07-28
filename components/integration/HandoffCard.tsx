import type { JourneyStepId } from "@/lib/journey/stateMachine";
import type { IntegrationProduct } from "@/lib/integrations/stages";
import type { IntegrationHealthStatus } from "@/lib/integrations/ecosystemMap";
import { HealthStatusPill } from "./status";

export interface HandoffCardData {
  key: string;
  kind: "completed" | "pending";
  from: JourneyStepId;
  to: JourneyStepId;
  toProduct: IntegrationProduct;
  crossesBoundary: boolean;
  handoff: unknown;
  adapterStatus: IntegrationHealthStatus | null;
  adapterMessage: string | null;
}

// One cross-product handoff -- either already traversed
// (lib/integrations/journeyHistory.ts) or a pending next step
// (dashboard.ts's DashboardView.nextOptions). All computation happens at
// the call site (app/integration/dashboard/page.tsx); this component
// only renders the resulting HandoffCardData. When the transition stays
// within one product (!crossesBoundary), there is no handoff object to
// show -- same honest "n/a" convention as the existing
// components/dev/IntegrationDashboardView.tsx.
export function HandoffCard({ data }: { data: HandoffCardData }) {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border p-3"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          {data.kind === "completed" ? "Completed" : "Pending"}
        </span>
        {data.adapterStatus && <HealthStatusPill status={data.adapterStatus} />}
      </div>
      <p className="text-sm" style={{ color: "var(--paper)" }}>
        {data.from.replace(/_/g, " ")} → {data.to.replace(/_/g, " ")}{" "}
        <span style={{ color: "var(--text-dim)" }}>({data.toProduct})</span>
      </p>
      {data.crossesBoundary ? (
        <>
          {data.adapterMessage && (
            <p className="text-xs leading-5" style={{ color: "var(--text-dim)" }}>
              {data.adapterMessage}
            </p>
          )}
          <pre
            className="overflow-x-auto rounded-md border p-2 text-xs leading-5"
            style={{ borderColor: "var(--surface-line)", background: "var(--midnight)", color: "var(--paper)" }}
          >
            {JSON.stringify(data.handoff, null, 2)}
          </pre>
        </>
      ) : (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          n/a -- stays within {data.toProduct}, no cross-product handoff.
        </p>
      )}
    </div>
  );
}
