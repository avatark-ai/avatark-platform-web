import { StepFrame } from "@/components/ai4/StepFrame";
import { REFLECTION_CHIPS } from "@/lib/ai4/reflection";
import type { StepProps } from "./types";

export function Reflect({ reflection, onSelectReflection }: StepProps) {
  return (
    <StepFrame kicker="02 · Reflect" title="What stayed with you after the story ended?">
      <div className="flex max-w-xl flex-wrap justify-center gap-3">
        {REFLECTION_CHIPS.map((chip) => {
          const selected = chip === reflection;
          return (
            <button
              key={chip}
              type="button"
              onClick={() => onSelectReflection(chip)}
              aria-pressed={selected}
              className="rounded-full border px-5 py-2.5 text-sm font-medium transition echo-cta-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor: selected ? "var(--gold)" : "var(--surface-line)",
                background: selected ? "color-mix(in srgb, var(--gold) 16%, transparent)" : "var(--surface)",
                color: "var(--paper)",
                outlineColor: "var(--gold)",
              }}
            >
              {chip}
            </button>
          );
        })}
      </div>
      <p
        className="motion-emerge-instant min-h-[1.75rem] text-sm font-medium"
        key={reflection ?? "none"}
        style={{ color: "var(--gold)" }}
      >
        {reflection ? `Carried forward: ${reflection}` : "Choose whatever is true right now — there is no wrong answer."}
      </p>
    </StepFrame>
  );
}
