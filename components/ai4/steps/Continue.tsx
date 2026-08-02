import { StepFrame } from "@/components/ai4/StepFrame";

const NODES = ["Story", "Reflection", "Living World"];

// A conceptual bridge only -- deliberately not wired to the production
// receipt-gated /continue route (app/continue/page.tsx), which requires an
// HMAC token the demo has no safe way to mint. This step explains the same
// idea in the abstract instead of reusing that gated flow.
export function Continue() {
  return (
    <StepFrame kicker="03 · Continue" title="The narrative does not end with passive viewing.">
      <div className="flex w-full max-w-lg items-center justify-between gap-2 sm:gap-4">
        {NODES.map((node, index) => (
          <div key={node} className="flex flex-1 items-center gap-2 sm:gap-4">
            <div className="flex flex-1 flex-col items-center gap-2">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold"
                style={{ borderColor: "var(--gold)", color: "var(--paper)", background: "color-mix(in srgb, var(--gold) 12%, transparent)" }}
              >
                {index + 1}
              </span>
              <span className="text-sm font-medium" style={{ color: "var(--paper)" }}>
                {node}
              </span>
            </div>
            {index < NODES.length - 1 ? (
              <span aria-hidden="true" className="h-px flex-1" style={{ background: "var(--gold)", opacity: 0.5 }} />
            ) : null}
          </div>
        ))}
      </div>
      <p className="max-w-[560px] text-base leading-7 sm:text-lg" style={{ color: "var(--text-dim)" }}>
        What you carried out of the story becomes the doorway into a place you can actually stand in — not another
        video, a world.
      </p>
    </StepFrame>
  );
}
