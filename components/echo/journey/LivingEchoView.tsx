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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          Living Echo
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Your Echo grows through reflection.</h1>
      </div>

      <div className="flex flex-col gap-3 rounded-md border p-5" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
        {hasObservation ? (
          <>
            <p className="text-sm leading-6" style={{ color: "var(--paper)" }}>
              You began with &ldquo;{intentionLabel}&rdquo; and completed {WITNESS_LABEL} on{" "}
              {context.practiceCompletedAt ? formatDate(context.practiceCompletedAt) : "a recent date"}.
            </p>
            <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
              That&apos;s one real observation — not yet enough history to call it a pattern. This is an
              observation, not a diagnosis.
            </p>
          </>
        ) : (
          <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
            Not enough history yet to observe a pattern. As you return to practice and reflection, patterns worth
            noticing will start to appear here.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={DISCOVER_HREF} className="rounded-md px-6 py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90" style={{ background: "var(--gold)", color: "var(--midnight)" }}>
          Recommended Next Practice
        </Link>
        <Link href={MY_ECHO_HREF} className="rounded-md border px-6 py-3 text-center text-sm font-semibold transition-colors hover:border-[var(--gold)]" style={{ borderColor: "var(--surface-line)", color: "var(--paper)" }}>
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
