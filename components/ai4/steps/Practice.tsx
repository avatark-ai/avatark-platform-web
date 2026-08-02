"use client";

import { useState } from "react";
import { StepFrame } from "@/components/ai4/StepFrame";
import type { StepProps } from "./types";

export function Practice({ reflection }: StepProps) {
  const [begun, setBegun] = useState(false);

  return (
    <StepFrame kicker="05 · Practice" title="The world offers something to do, not just something to watch.">
      <div
        className="flex h-32 w-32 items-center justify-center rounded-full border-2 transition-transform duration-[3000ms] ease-in-out"
        style={{
          borderColor: "var(--gold)",
          background: "color-mix(in srgb, var(--gold) 12%, transparent)",
          transform: begun ? "scale(1.15)" : "scale(0.85)",
        }}
        aria-hidden="true"
      />
      <p className="max-w-[480px] text-sm leading-6" style={{ color: "var(--text-dim)" }}>
        {begun
          ? "Breathe in as it grows. Breathe out as it settles. A small, repeatable ritual — the same shape a longer practice takes."
          : "A short ritual, in place of a paragraph of instructions."}
      </p>
      <button
        type="button"
        onClick={() => setBegun((value) => !value)}
        className="rounded-full px-7 py-3 text-sm font-semibold echo-cta-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
      >
        {begun ? "Complete the Practice" : "Begin the Practice"}
      </button>
      {begun && reflection ? (
        <p className="motion-emerge-instant text-xs font-medium uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          Shaped by what you carried: {reflection}
        </p>
      ) : null}
    </StepFrame>
  );
}
