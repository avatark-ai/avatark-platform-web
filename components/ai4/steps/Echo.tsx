import { StepFrame } from "@/components/ai4/StepFrame";
import type { StepProps } from "./types";

export function Echo({ reflection }: StepProps) {
  return (
    <StepFrame kicker="07 · Echo" title="Your reflection becomes part of a continuing memory.">
      <div
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border p-6 text-left"
        style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          Your Echo
        </p>
        <p className="text-2xl font-semibold" style={{ color: "var(--paper)" }}>
          {reflection ?? "Not yet chosen"}
        </p>
        <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
          {reflection
            ? `“${reflection}” doesn't end when this demo does. It becomes a thread AvatarK carries forward — yours to return to.`
            : "Choose a reflection earlier in the journey and it will live here."}
        </p>
      </div>
      <p className="max-w-[520px] text-sm leading-6" style={{ color: "var(--text-dim)" }}>
        One reflection is a moment. Many, over time, become a living archive — personal, and part of something larger.
      </p>
    </StepFrame>
  );
}
