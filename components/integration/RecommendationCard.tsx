import type { Recommendation } from "@/lib/integrations/summary";

const TONE_COLOR: Record<Recommendation["tone"], string> = {
  success: "#0ca30c",
  warning: "#fab219",
  info: "var(--gold)",
};

// Blocker/owner/next-action shown as 3 distinct fields -- never a single
// paragraph -- so "what's wrong", "whose job is it", and "what exactly
// do I do" are each scannable on their own.
export function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border-l-4 border-t border-r border-b p-3"
      style={{ borderColor: "var(--surface-line)", borderLeftColor: TONE_COLOR[recommendation.tone], background: "var(--surface)" }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Blocker
        </span>
        <span className="text-sm" style={{ color: "var(--paper)" }}>
          {recommendation.blocker}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            Owner
          </span>
          <span className="text-sm" style={{ color: "var(--paper)" }}>
            {recommendation.owner}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            Next Action
          </span>
          <span className="text-sm font-medium" style={{ color: "var(--paper)" }}>
            {recommendation.nextAction}
          </span>
        </div>
      </div>
    </div>
  );
}
