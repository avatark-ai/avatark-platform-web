"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { STEPS } from "./steps";
import {
  clearStoredDemoState,
  readStoredReflection,
  readStoredStep,
  writeStoredReflection,
  writeStoredStep,
  type ReflectionChip,
} from "@/lib/ai4/reflection";

// The guided Ai4 conference journey: one shell, seven in-place beats
// (components/ai4/steps/*), never seven separate page loads. Step and
// reflection state persist to localStorage only, so a mid-demo refresh (a
// real risk on conference Wi-Fi) resumes exactly where the visitor left
// off instead of dropping them back to a blank first screen.
export function PresentationShell() {
  const [step, setStep] = useState(0);
  const [reflection, setReflection] = useState<ReflectionChip | null>(null);

  useEffect(() => {
    // Always start from the same "step 0, no reflection" state the server
    // rendered -- localStorage is only readable client-side, so reading it
    // during the initial render would make the client's first paint
    // disagree with the server's HTML. Deferred one frame after mount
    // instead, same pattern RevealOnView (@avatark/motion) uses for its
    // own client-only hydration.
    const id = requestAnimationFrame(() => {
      setStep(readStoredStep());
      setReflection(readStoredReflection());
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") goTo(step + 1);
      if (event.key === "ArrowLeft") goTo(step - 1);
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [step]);

  function goTo(next: number) {
    const clamped = Math.min(Math.max(next, 0), STEPS.length - 1);
    setStep(clamped);
    writeStoredStep(clamped);
  }

  function handleSelectReflection(chip: ReflectionChip) {
    setReflection(chip);
    writeStoredReflection(chip);
  }

  function handleRestart() {
    clearStoredDemoState();
    setStep(0);
    setReflection(null);
  }

  const current = STEPS[step];
  const CurrentStep = current.Component;
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="flex min-h-screen w-full flex-col" style={{ background: "var(--midnight)", color: "var(--paper)" }}>
      <header className="flex items-center justify-between gap-4 px-6 py-5 sm:px-10">
        <span className="text-sm font-semibold uppercase tracking-[0.25em]" style={{ color: "var(--paper)" }}>
          AvatarK
        </span>
        <Link
          href="/"
          className="text-xs font-medium link-underline-draw focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: "var(--text-dim)", outlineColor: "var(--gold)" }}
        >
          Exit Demo
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
        <CurrentStep reflection={reflection} onSelectReflection={handleSelectReflection} />
      </main>

      <footer className="flex flex-col items-center gap-4 px-6 pb-8 pt-2 sm:px-10">
        <div className="flex items-center gap-2" role="tablist" aria-label="Demo progress">
          {STEPS.map((s, index) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={index === step}
              aria-label={`${index + 1}. ${s.label}`}
              onClick={() => goTo(index)}
              className="h-2 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                width: index === step ? "1.75rem" : "0.5rem",
                background: index === step ? "var(--gold)" : "var(--surface-line)",
                outlineColor: "var(--gold)",
              }}
            />
          ))}
        </div>

        <div className="flex w-full max-w-sm items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            disabled={isFirst}
            className="rounded-full border px-5 py-2 text-sm font-medium transition disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: "var(--surface-line)", color: "var(--paper)", outlineColor: "var(--gold)" }}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="text-xs font-medium link-underline-draw focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: "var(--text-dim)", outlineColor: "var(--gold)" }}
          >
            Restart Demo
          </button>
          <button
            type="button"
            onClick={() => goTo(step + 1)}
            disabled={isLast}
            className="rounded-full px-5 py-2 text-sm font-semibold echo-cta-primary disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
          >
            Next
          </button>
        </div>
      </footer>
    </div>
  );
}
