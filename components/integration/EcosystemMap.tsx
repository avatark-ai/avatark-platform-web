import type { EcosystemStageId } from "@/lib/integrations/ecosystemMap";
import type { IntegrationHealthEntry } from "@/lib/integrations/health";
import { ProductStatusCard } from "./ProductStatusCard";

// The mission's 7-node visual ecosystem map: Avatar -> Echo -> Prometheus
// -> Living Echo -> Arena -> Stream -> Cinema. Always a single
// horizontally scrollable rail (never flex-wrap) -- a node and the
// connector after it live in the same non-wrapping flex item, so at any
// viewport width the chain either fits or scrolls as one continuous
// strip. Stream/Cinema can never separate from the rest of the chain the
// way they could when this wrapped onto a second row with no connector
// carried over. Each node reuses ProductStatusCard in compact mode so
// its color/label always matches the same fact the Integration Health
// panel shows below it -- never a second, competing status computation.
export function EcosystemMap({ health, activeStage }: { health: IntegrationHealthEntry[]; activeStage: EcosystemStageId }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="-mx-1 flex min-w-0 items-stretch overflow-x-auto px-1 pb-2" style={{ scrollbarWidth: "thin" }}>
        {health.map((entry, index) => (
          <div key={entry.stage} className="flex shrink-0 items-center">
            <div className="w-[172px] shrink-0">
              <ProductStatusCard entry={entry} compact active={entry.stage === activeStage} />
            </div>
            {index < health.length - 1 && (
              <span aria-hidden className="mx-1.5 shrink-0 text-lg" style={{ color: "var(--text-dim)" }}>
                →
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs sm:hidden" style={{ color: "var(--text-dim)" }}>
        Scroll to see the full ecosystem chain →
      </p>
    </div>
  );
}
