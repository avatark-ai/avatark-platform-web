import { StepFrame } from "@/components/ai4/StepFrame";
import type { StepProps } from "./types";

export function Return({ reflection }: StepProps) {
  return (
    <StepFrame kicker="07 · Return" title="The system remembers. That's the reason to come back.">
      <p className="max-w-[520px] text-base leading-7 sm:text-lg" style={{ color: "var(--text-dim)" }}>
        {reflection
          ? `Next time, the forest already knows you carried “${reflection}” with you. The story continues where you left it.`
          : "Every return begins with what you carried last time. The story continues where you left it."}
      </p>
      <p className="text-sm font-medium" style={{ color: "var(--gold)" }}>
        Watch. Reflect. Continue.
      </p>
      <p className="mt-2 text-xs" style={{ color: "var(--text-dim)" }}>
        Built on the AvatarK platform — StreamK · CinemaK · StudioK · GameK · ArenaK · PrometheusK
      </p>
    </StepFrame>
  );
}
