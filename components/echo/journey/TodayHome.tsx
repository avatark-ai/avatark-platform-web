"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useJourneySession } from "@/lib/journey/session";
import { getContinuityAction, getIntentionLabel } from "@/lib/journey/continuity";
import { PRACTICE_LABEL } from "@/lib/onboarding/witness";
import { PROMETHEUSK_DISPLAY_NAME } from "@/lib/onboarding/prometheusk";
import { JOURNAL_HREF, LIVING_ECHO_HREF } from "@/lib/echo/links";
import type { JourneyContext } from "@/lib/journey/state";

const ctaStyle = { background: "var(--gold)", color: "var(--midnight)" } as const;

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

export function TodayView({ context, displayName }: { context: JourneyContext; displayName: string | null }) {
  const intentionLabel = getIntentionLabel(context);
  const greeting = displayName ? `Welcome back, ${displayName}.` : "Welcome back.";
  const recommendation = getContinuityAction(context);
  const hasSnapshot = Boolean(intentionLabel || context.witness);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          Today
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">{greeting}</h1>
      </div>

      {hasSnapshot && (
        <div className="flex flex-col gap-4 rounded-md border p-5" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
          {intentionLabel && (
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
                Current intention
              </p>
              <p className="text-base" style={{ color: "var(--paper)" }}>
                {intentionLabel}
              </p>
            </div>
          )}
          {context.witness && (
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
                Current practice
              </p>
              <p className="text-base" style={{ color: "var(--paper)" }}>
                {PRACTICE_LABEL}
              </p>
            </div>
          )}
          {context.practiceCompletedAt && (
            <p className="text-sm" style={{ color: "var(--gold)" }}>
              ✓ Completion verified by {PROMETHEUSK_DISPLAY_NAME}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Today&apos;s Recommendation
        </p>
        <p className="text-base leading-7" style={{ color: "var(--paper)" }}>
          {recommendation.body}
        </p>
        {recommendation.external ? (
          <a href={recommendation.href} className="mt-1 inline-block w-fit rounded-md px-8 py-3 text-center text-base font-semibold transition-opacity hover:opacity-90" style={ctaStyle}>
            {recommendation.ctaLabel}
          </a>
        ) : (
          <Link href={recommendation.href} className="mt-1 inline-block w-fit rounded-md px-8 py-3 text-center text-base font-semibold transition-opacity hover:opacity-90" style={ctaStyle}>
            {recommendation.ctaLabel}
          </Link>
        )}
      </div>

      {context.practiceCompletedAt && (
        <div className="flex flex-col gap-2 rounded-md border p-5" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            Reflect on a Recent Practice
          </p>
          <p className="text-sm leading-6" style={{ color: "var(--paper)" }}>
            What changed since {PRACTICE_LABEL}?
          </p>
          <Link href={JOURNAL_HREF} className="text-sm font-semibold underline underline-offset-4 hover:no-underline" style={{ color: "var(--gold)" }}>
            Open Journal
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-md border p-5" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Living Echo Insight
        </p>
        <p className="text-sm leading-6" style={{ color: "var(--paper)" }}>
          {hasSnapshot ? "A pattern may be forming as you return to practice." : "Not enough history yet to observe a pattern."}
        </p>
        <Link href={LIVING_ECHO_HREF} className="text-sm font-semibold underline underline-offset-4 hover:no-underline" style={{ color: "var(--gold)" }}>
          View My Echo
        </Link>
      </div>
    </div>
  );
}

export function TodayHome() {
  return (
    <Suspense fallback={<p className="text-sm" style={{ color: "var(--text-dim)" }}>Loading…</p>}>
      <TodayContent />
    </Suspense>
  );
}
