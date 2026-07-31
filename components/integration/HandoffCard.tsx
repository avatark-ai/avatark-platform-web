import type { JourneyStepId } from "@avatark/journey";
import type { IntegrationProduct } from "@/lib/integrations/stages";
import type { IntegrationHealthStatus } from "@/lib/integrations/ecosystemMap";

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

const JOURNEY_STATE_LABEL: Record<HandoffCardData["kind"], string> = {
  completed: "Completed",
  pending: "Pending",
};

// Two different vocabularies for the same 4 IntegrationHealthStatus
// values, because "this step already happened in the example journey"
// and "is the real product-side integration wired up" are different
// questions with different natural phrasing. A completed step that read
// "MISSING CONTRACT" with no other context looked like a contradiction
// (how did it complete if there's no contract?) -- "Simulated / Not
// wired" answers that directly: this example journey walked through the
// step, but the real cross-repo integration doesn't exist, so nothing
// was actually delivered anywhere.
const COMPLETED_INTEGRATION_LABEL: Record<IntegrationHealthStatus, string> = {
  ready: "Real",
  waiting: "Real mechanism, content unmapped",
  missing_contract: "Simulated / Not wired",
  optional: "Optional",
};
const PENDING_INTEGRATION_LABEL: Record<IntegrationHealthStatus, string> = {
  ready: "Ready",
  waiting: "Waiting on content/config",
  missing_contract: "Not wired yet",
  optional: "Optional",
};

const STATUS_COLOR: Record<IntegrationHealthStatus, string> = {
  ready: "#0ca30c",
  waiting: "#fab219",
  missing_contract: "#d03b3b",
  optional: "var(--text-dim)",
};

function explanationFor(data: HandoffCardData): string | null {
  if (data.kind !== "completed" || !data.adapterStatus || data.adapterStatus === "ready") return null;
  if (data.adapterStatus === "missing_contract") {
    return "This step happened in this example journey, but the real cross-product integration for this edge isn't wired up anywhere yet -- nothing was actually delivered to " + data.toProduct + ".";
  }
  return "This step happened in this example journey; the handoff mechanism is real, but this specific content isn't mapped on the " + data.toProduct + " side yet.";
}

function humanizeKey(key: string): string {
  const spaced = key.replace(/([A-Z])/g, " $1");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function humanizePayload(handoff: unknown): { label: string; value: string }[] {
  if (!handoff || typeof handoff !== "object") return [];
  return Object.entries(handoff as Record<string, unknown>).map(([key, value]) => ({
    label: humanizeKey(key),
    value: value === null || value === undefined || value === "" ? "--" : String(value),
  }));
}

// One cross-product handoff -- either already traversed
// (lib/integrations/journeyHistory.ts) or the immediate pending next
// step (dashboard.ts's DashboardView.nextOptions). All computation
// happens at the call site (app/integration/dashboard/page.tsx); this
// component only renders the resulting HandoffCardData. Journey state
// (did the participant do this) and integration state (is the real
// product-side wired up) are always shown as two separate labels, never
// one merged status -- see the label tables above.
export function HandoffCard({ data, showTechnical }: { data: HandoffCardData; showTechnical: boolean }) {
  const fields = humanizePayload(data.handoff);
  const explanation = explanationFor(data);
  const integrationLabel = data.adapterStatus
    ? (data.kind === "completed" ? COMPLETED_INTEGRATION_LABEL : PENDING_INTEGRATION_LABEL)[data.adapterStatus]
    : null;

  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-lg border p-3" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
      <p className="text-sm font-medium" style={{ color: "var(--paper)" }}>
        {data.from.replace(/_/g, " ")} → {data.to.replace(/_/g, " ")}{" "}
        <span style={{ color: "var(--text-dim)" }}>({data.toProduct})</span>
      </p>

      <div className="flex flex-col gap-1 text-xs">
        <span style={{ color: "var(--text-dim)" }}>
          Journey state: <span style={{ color: "var(--paper)", fontWeight: 600 }}>{JOURNEY_STATE_LABEL[data.kind]}</span>
        </span>
        {data.crossesBoundary && integrationLabel && (
          <span style={{ color: "var(--text-dim)" }}>
            Integration state:{" "}
            <span style={{ color: STATUS_COLOR[data.adapterStatus!], fontWeight: 600 }}>{integrationLabel}</span>
          </span>
        )}
      </div>

      {!data.crossesBoundary && (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          n/a -- stays within {data.toProduct}, no cross-product handoff.
        </p>
      )}

      {explanation && (
        <p className="rounded-md border-l-2 p-2 text-xs leading-5" style={{ borderColor: "var(--gold)", background: "var(--midnight)", color: "var(--text-dim)" }}>
          {explanation}
        </p>
      )}

      {data.crossesBoundary && fields.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
          {fields.map((field) => (
            <div key={field.label} className="contents">
              <dt style={{ color: "var(--text-dim)" }}>{field.label}</dt>
              <dd className="truncate" style={{ color: "var(--paper)" }} title={field.value}>
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {showTechnical && data.crossesBoundary && (
        <div className="flex flex-col gap-2 border-t pt-2" style={{ borderColor: "var(--surface-line)" }}>
          {data.adapterMessage && (
            <p className="text-xs leading-5" style={{ color: "var(--text-dim)" }}>
              {data.adapterMessage}
            </p>
          )}
          <details>
            <summary className="cursor-pointer text-xs font-semibold" style={{ color: "var(--gold)" }}>
              View payload
            </summary>
            <pre
              className="mt-2 overflow-x-auto rounded-md border p-2 text-xs leading-5"
              style={{ borderColor: "var(--surface-line)", background: "var(--midnight)", color: "var(--paper)" }}
            >
              {JSON.stringify(data.handoff, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
