import type { EcosystemStageId } from "@/lib/integrations/ecosystemMap";
import type { IntegrationHealthEntry } from "@/lib/integrations/health";
import { ProductStatusCard } from "./ProductStatusCard";

// The mission's 7-node visual ecosystem map: Avatar -> Echo -> Prometheus
// -> Living Echo -> Arena -> Stream -> Cinema. Each node reuses
// ProductStatusCard in compact mode so a node's color/label always
// matches the same fact the Integration Health panel shows below it --
// never a second, competing status computation for the same stage.
export function EcosystemMap({ health, activeStage }: { health: IntegrationHealthEntry[]; activeStage: EcosystemStageId }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {health.map((entry, index) => (
        <div key={entry.stage} className="flex items-center gap-2">
          <div className="w-36">
            <ProductStatusCard entry={entry} compact active={entry.stage === activeStage} />
          </div>
          {index < health.length - 1 && (
            <span aria-hidden className="hidden shrink-0 text-lg sm:inline" style={{ color: "var(--text-dim)" }}>
              →
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
