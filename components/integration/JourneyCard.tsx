import type { EcosystemStageId } from "@/lib/integrations/ecosystemMap";
import type { IntegrationProduct } from "@/lib/integrations/stages";
import type { JourneyStepId } from "@/lib/journey/stateMachine";
import type { OverallStatusView, IntegrationReadinessView } from "@/lib/integrations/summary";
import { OverallStatusPill, HealthStatusPill } from "./status";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
        {label}
      </span>
      <span className="text-sm sm:text-right" style={{ color: "var(--paper)" }}>
        {children}
      </span>
    </div>
  );
}

// The dashboard's top summary card. Three deliberately SEPARATE fields --
// Journey Status (can this participant keep going, within what's already
// built), Integration Readiness (is the very next cross-product handoff
// wired up), and Primary Blocker (the one specific fact, if any, actually
// stopping them) -- replacing the original single "Blocked" pill that
// conflated all three. A future Arena/Stream contract gap never shows up
// here unless it IS the immediate next transition; see
// lib/integrations/summary.ts's describeIntegrationReadiness for why
// these two fields are allowed to disagree (e.g. an expired invitation
// blocks the journey while Integration Readiness correctly stays
// "Ready" -- that's not a bug, it's the point).
export function JourneyCard({
  journeyStatus,
  integrationReadiness,
  primaryBlocker,
  currentStage,
  currentProduct,
  currentStep,
}: {
  journeyStatus: OverallStatusView;
  integrationReadiness: IntegrationReadinessView;
  primaryBlocker: string | null;
  currentStage: EcosystemStageId;
  currentProduct: IntegrationProduct;
  currentStep: JourneyStepId;
}) {
  return (
    <div
      className="flex flex-col gap-4 rounded-xl border p-5"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
    >
      <div className="flex flex-col gap-2.5 border-b pb-4" style={{ borderColor: "var(--surface-line)" }}>
        <Row label="Journey Status">
          <OverallStatusPill status={journeyStatus.status} />
        </Row>
        <Row label="Integration Readiness">
          <span className="inline-flex items-center gap-2">
            <HealthStatusPill status={integrationReadiness.status} />
          </span>
        </Row>
        <p className="text-xs leading-5" style={{ color: "var(--text-dim)" }}>
          {integrationReadiness.message}
        </p>
        <Row label="Primary Blocker">
          <span style={{ color: primaryBlocker ? "#d03b3b" : "#0ca30c" }}>{primaryBlocker ?? "None -- nothing blocking your next step."}</span>
        </Row>
      </div>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            Current Step
          </dt>
          <dd className="text-lg font-semibold" style={{ color: "var(--paper)" }}>
            {currentStep.replace(/_/g, " ")}
          </dd>
        </div>
      </dl>
    </div>
  );
}
