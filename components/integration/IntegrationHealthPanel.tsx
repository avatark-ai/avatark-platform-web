import type { IntegrationHealthEntry } from "@/lib/integrations/health";
import { ProductStatusCard } from "./ProductStatusCard";

// The full Ready/Waiting/Missing Contract/Optional read-out, one
// ProductStatusCard per ecosystem stage, message included.
export function IntegrationHealthPanel({ health }: { health: IntegrationHealthEntry[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {health.map((entry) => (
        <ProductStatusCard key={entry.stage} entry={entry} />
      ))}
    </div>
  );
}
