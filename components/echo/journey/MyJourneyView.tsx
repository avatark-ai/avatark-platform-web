"use client";

import Link from "next/link";
import { useJourneySession } from "@/lib/journey/session";
import { INTENTIONS } from "@/lib/onboarding/intentions";
import { WITNESS_LABEL } from "@/lib/onboarding/witness";
import { MY_ECHO_HREF, TODAY_HREF } from "@/lib/echo/links";
import type { JourneyContext } from "@/lib/journey/state";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const STAGES = ["Invitation", "Story", "Practice", "Reflection", "Contribution"] as const;

function reachedStageCount(context: JourneyContext): number {
  if (context.practiceCompletedAt) return 4; // Reflection reached (Contribution is always a deliberate next step, never automatic)
  if (context.witness) return 2; // Story + Practice begun
  if (context.intention) return 1; // Invitation/beginning named
  return 0;
}

export function MyJourneyView({ context }: { context: JourneyContext }) {
  const intentionLabel = INTENTIONS.find((intention) => intention.id === context.intention)?.label;
  const reached = reachedStageCount(context);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          My Journey
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Your journey is not a score.</h1>
        <p className="text-base leading-7" style={{ color: "var(--text-dim)" }}>
          It is a record of what you are learning and becoming.
        </p>
      </div>

      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium" style={{ color: "var(--paper)" }}>
        {STAGES.map((stage, index) => (
          <li key={stage} className="flex items-center gap-3">
            <span
              className="rounded-full border px-3 py-1"
              style={{
                borderColor: index <= reached ? "var(--gold)" : "var(--surface-line)",
                color: index <= reached ? "var(--paper)" : "var(--text-dim)",
              }}
            >
              {stage}
            </span>
            {index < STAGES.length - 1 && (
              <span aria-hidden="true" style={{ color: "var(--gold)" }}>
                →
              </span>
            )}
          </li>
        ))}
      </ol>

      {context.startedAt ? (
        <>
          <div className="flex flex-col gap-1 rounded-md border p-5" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
            <p className="text-xs uppercase tracking-wide" style={{ color: "var(--gold)" }}>
              {formatDate(context.startedAt)}
            </p>
            <p className="text-base" style={{ color: "var(--paper)" }}>
              {intentionLabel ? (
                <>
                  Named what mattered: <span className="font-semibold">&ldquo;{intentionLabel}&rdquo;</span>
                </>
              ) : (
                "Began the journey."
              )}
            </p>
            {context.witness && (
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>
                Started {WITNESS_LABEL}.
              </p>
            )}
            {context.practiceCompletedAt && (
              <p className="text-sm" style={{ color: "var(--gold)" }}>
                Completed a practice on {formatDate(context.practiceCompletedAt)}.
              </p>
            )}
          </div>
          <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
            Avoid vanity metrics — this page grows as you return to practice and reflection, not as a count to chase.
          </p>
        </>
      ) : (
        <>
          <p className="text-base leading-7" style={{ color: "var(--paper)" }}>
            You haven&apos;t begun your journey yet.
          </p>
          <Link
            href="/start"
            className="inline-block w-fit rounded-md px-8 py-3 text-center text-base font-semibold transition-opacity hover:opacity-90"
            style={{ background: "var(--gold)", color: "var(--midnight)" }}
          >
            Begin with an Echo
          </Link>
        </>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={MY_ECHO_HREF}
          className="rounded-md border px-6 py-3 text-center text-sm font-semibold transition-colors hover:border-[var(--gold)]"
          style={{ borderColor: "var(--surface-line)", color: "var(--paper)" }}
        >
          View My Echo
        </Link>
        <Link
          href={TODAY_HREF}
          className="rounded-md border px-6 py-3 text-center text-sm font-semibold transition-colors hover:border-[var(--gold)]"
          style={{ borderColor: "var(--surface-line)", color: "var(--paper)" }}
        >
          Continue Today
        </Link>
      </div>
    </div>
  );
}

export function MyJourneyPage() {
  const { context } = useJourneySession();
  return <MyJourneyView context={context} />;
}
