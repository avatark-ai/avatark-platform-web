import type { EcosystemStageId } from "@/lib/integrations/ecosystemMap";
import type { IntegrationProduct } from "@/lib/integrations/stages";
import type { JourneyStepId } from "@/lib/journey/stateMachine";
import type { OverallStatusView } from "@/lib/integrations/summary";
import { OverallStatusPill } from "./status";

// The dashboard's top summary card -- Overall Journey Status, Current
// Stage, and Current Product, read straight off a JourneyDashboardSummary
// (lib/integrations/summary.ts) and a DashboardView (dashboard.ts). No
// computation here, same discipline as the existing
// components/dev/IntegrationDashboardView.tsx.
export function JourneyCard({
  overallStatus,
  currentStage,
  currentProduct,
  currentStep,
}: {
  overallStatus: OverallStatusView;
  currentStage: EcosystemStageId;
  currentProduct: IntegrationProduct;
  currentStep: JourneyStepId;
}) {
  return (
    <div
      className="flex flex-col gap-4 rounded-xl border p-5"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Overall Journey Status
        </p>
        <OverallStatusPill status={overallStatus.status} />
      </div>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            Current Stage
          </dt>
          <dd className="text-lg font-semibold" style={{ color: "var(--paper)" }}>
            {currentStage}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            Current Product
          </dt>
          <dd className="text-lg font-semibold" style={{ color: "var(--paper)" }}>
            {currentProduct}
          </dd>
        </div>
      </dl>
      <p className="text-xs" style={{ color: "var(--text-dim)" }}>
        Currently at step <span style={{ color: "var(--paper)" }}>{currentStep.replace(/_/g, " ")}</span>.
      </p>
    </div>
  );
}
