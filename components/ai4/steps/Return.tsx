import { StepFrame } from "@/components/ai4/StepFrame";
import type { StepProps } from "./types";

export function Return({ reflection }: StepProps) {
  return (
    <StepFrame kicker="09 · Return" title="Every story continues.">
      <div className="flex max-w-[480px] flex-col gap-2 text-base leading-7 sm:text-lg" style={{ color: "var(--text-dim)" }}>
        <p>Reflection becomes memory.</p>
        <p>Memory becomes living worlds.</p>
        <p>Living worlds become places you return to.</p>
      </div>
      {reflection ? (
        <p className="motion-emerge-instant text-xs font-medium uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          You carried “{reflection}” with you.
        </p>
      ) : null}
      <div className="mt-4 flex flex-col items-center gap-1">
        <p className="text-lg font-semibold" style={{ color: "var(--paper)" }}>
          Movies end.
        </p>
        <p className="text-lg font-semibold" style={{ color: "var(--gold)" }}>
          Living worlds remember.
        </p>
      </div>
      <div className="mt-6 flex flex-col items-center gap-1">
        <p className="text-sm font-semibold" style={{ color: "var(--gold)" }}>
          One platform.
        </p>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Many living worlds.
        </p>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Every story continues.
        </p>
      </div>
    </StepFrame>
  );
}
