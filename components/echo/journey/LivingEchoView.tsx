"use client";

import Link from "next/link";
import { useJourneySession } from "@/lib/journey/session";
import { getIntentionLabel } from "@/lib/journey/continuity";
import { WITNESS_LABEL } from "@/lib/onboarding/witness";
import { DISCOVER_HREF, MY_ECHO_HREF } from "@/lib/echo/links";
import type { JourneyContext } from "@/lib/journey/state";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function LivingEchoView({ context }: { context: JourneyContext }) {
  const intentionLabel = getIntentionLabel(context);
  const hasObservation = Boolean(intentionLabel && context.practiceCompletedAt);

  return (
    <div className="flex flex-col">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
        Living Echo
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Your Echo grows through reflection.</h1>

      <div className="mt-10 rounded-2xl border p-7" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
        {hasObservation ? (
          <div className="flex flex-col gap-3">
            <p className="text-lg leading-8" style={{ color: "var(--paper)" }}>
              You began with &ldquo;{intentionLabel}&rdquo; and completed {WITNESS_LABEL} on{" "}
              {context.practiceCompletedAt ? formatDate(context.practiceCompletedAt) : "a recent date"}.
            </p>
            <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
              That&apos;s one real observation — not yet enough history to call it a pattern. This is an
              observation, not a diagnosis.
            </p>
          </div>
        ) : (
          <p className="text-base leading-7" style={{ color: "var(--text-dim)" }}>
            Not enough history yet to observe a pattern. As you return to practice and reflection, patterns worth
            noticing will start to appear here — never a score, never a diagnosis.
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Link
          href={DISCOVER_HREF}
          className="rounded-full px-7 py-3 text-center text-sm font-semibold transition-transform hover:scale-[1.02] hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
        >
          Recommended Next Practice
        </Link>
        <Link
          href={MY_ECHO_HREF}
          className="text-sm font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: "var(--paper)", outlineColor: "var(--gold)" }}
        >
          Back to My Echo
        </Link>
      </div>
    </div>
  );
}

export function LivingEchoPage() {
  const { context } = useJourneySession();
  return <LivingEchoView context={context} />;
}
