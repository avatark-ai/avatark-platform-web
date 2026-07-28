import type { IntegrationHealthEntry } from "@/lib/integrations/health";
import { ProductStatusCard } from "./ProductStatusCard";

// The full Ready/Waiting/Missing Contract/Optional read-out, one
// ProductStatusCard per ecosystem stage. In Summary view (showTechnical
// false) each card is compact (stage + pill only) -- the longer
// implementation-note messages (file paths, mechanism detail) only
// appear in Technical view.
export function IntegrationHealthPanel({ health, showTechnical }: { health: IntegrationHealthEntry[]; showTechnical: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {health.map((entry) => (
        <ProductStatusCard key={entry.stage} entry={entry} compact={!showTechnical} />
      ))}
    </div>
  );
}
