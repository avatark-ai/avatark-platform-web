import type { ReactNode } from "react";

// Shared kicker/title/subtitle scaffold so each of the 9 beats
// (components/ai4/steps/*) only has to supply its own copy and unique
// visual, not re-derive the same heading layout nine times.
export function StepFrame({
  kicker,
  title,
  subtitle,
  children,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="ai4-step-enter flex w-full flex-col items-center gap-8 text-center sm:gap-10">
      <div className="flex flex-col items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--gold)" }}>
          {kicker}
        </p>
        <h2 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl" style={{ color: "var(--paper)" }}>
          {title}
        </h2>
      </div>
      {subtitle ? (
        <p className="max-w-[560px] text-base leading-7 sm:text-lg" style={{ color: "var(--text-dim)" }}>
          {subtitle}
        </p>
      ) : null}
      {children}
    </div>
  );
}
