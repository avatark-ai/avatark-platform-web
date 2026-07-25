"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useJourneySession } from "@/lib/journey/session";
import { getContinuityAction } from "@/lib/journey/continuity";
import { PRACTICE_LABEL } from "@/lib/onboarding/witness";
import { JOURNAL_HREF, MY_ECHO_HREF } from "@/lib/echo/links";
import type { JourneyContext } from "@/lib/journey/state";

function TodayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intentionParam = searchParams.get("intention");
  const witnessParam = searchParams.get("witness");
  const { principal, context, displayName, absorbIntentionParams } = useJourneySession();

  useEffect(() => {
    if (principal.status !== "signed_in") return;
    if (!intentionParam && !witnessParam) return;
    absorbIntentionParams({ intention: intentionParam, witness: witnessParam }).then(() => {
      router.replace("/today");
    });
  }, [principal.status, intentionParam, witnessParam, absorbIntentionParams, router]);

  return <TodayView context={context} displayName={displayName} />;
}

// Calm by design: one primary recommendation, one reflection prompt (only
// when there's something real to reflect on), one quiet continuation --
// never more than that stacked on the page at once.
export function TodayView({ context, displayName }: { context: JourneyContext; displayName: string | null }) {
  const greeting = displayName ? `Welcome back, ${displayName}.` : "Welcome back.";
  const recommendation = getContinuityAction(context);

  return (
    <div className="flex flex-col">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
        Today
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{greeting}</h1>

      <div className="mt-10 rounded-2xl border p-7" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          Today&apos;s recommendation
        </p>
        <p className="mt-3 text-lg leading-8" style={{ color: "var(--paper)" }}>
          {recommendation.body}
        </p>
        {recommendation.external ? (
          <a
            href={recommendation.href}
            className="mt-6 inline-block w-fit rounded-full px-8 py-3 text-center text-base font-semibold transition-transform hover:scale-[1.02] hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
          >
            {recommendation.ctaLabel}
          </a>
        ) : (
          <Link
            href={recommendation.href}
            className="mt-6 inline-block w-fit rounded-full px-8 py-3 text-center text-base font-semibold transition-transform hover:scale-[1.02] hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
          >
            {recommendation.ctaLabel}
          </Link>
        )}
      </div>

      {context.practiceCompletedAt && (
        <p className="mt-8 text-base leading-7" style={{ color: "var(--text-dim)" }}>
          What changed since {PRACTICE_LABEL}?{" "}
          <Link
            href={JOURNAL_HREF}
            className="font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
          >
            Reflect in your journal
          </Link>
        </p>
      )}

      <Link
        href={MY_ECHO_HREF}
        className="mt-8 text-sm font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ color: "var(--text-dim)", outlineColor: "var(--gold)" }}
      >
        View My Echo →
      </Link>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" role="status" aria-label="Loading today">
      <div className="h-3 w-16 rounded-full" style={{ background: "var(--surface-line)" }} />
      <div className="h-8 w-2/3 rounded-full" style={{ background: "var(--surface-line)" }} />
      <div className="mt-4 h-32 rounded-2xl" style={{ background: "var(--surface)" }} />
    </div>
  );
}

export function TodayHome() {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <TodayContent />
    </Suspense>
  );
}
