import type { Recommendation } from "@/lib/integrations/summary";

const TONE_COLOR: Record<Recommendation["tone"], string> = {
  success: "#0ca30c",
  warning: "#fab219",
  info: "var(--gold)",
};

export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-lg border-l-4 border-t border-r border-b p-3"
      style={{ borderColor: "var(--surface-line)", borderLeftColor: TONE_COLOR[recommendation.tone], background: "var(--surface)" }}
    >
      <p className="text-sm font-semibold" style={{ color: "var(--paper)" }}>
        {recommendation.title}
      </p>
      <p className="text-xs leading-5" style={{ color: "var(--text-dim)" }}>
        {recommendation.message}
      </p>
    </div>
  );
}
