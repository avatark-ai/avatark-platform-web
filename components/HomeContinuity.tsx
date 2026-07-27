"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { resolveClientPrincipal, type ClientPrincipalResult } from "@/lib/auth/resolveClientPrincipal";
import { readJourneyContext } from "@/lib/journey/state";
import { getContinuityAction } from "@/lib/journey/continuity";
import { PRACTICE_LABEL } from "@/lib/onboarding/witness";
import { PROMETHEUSK_DISPLAY_NAME } from "@/lib/onboarding/prometheusk";

// Phase 2 (returning-user continuity): the only real, already-verified
// continuation signal this repo has today is a signed-in session plus
// whatever RC5 already wrote into auth.users.user_metadata.journey (see
// lib/journey/state.ts). There is no cross-product Chronicle or universal
// resume state -- this renders nothing rather than invent one. Signed-out
// visitors and visitors with no journey data see no banner at all, so the
// four-intent home is what they get.
//
// RC1 Iteration 4 -- the heading used to read "You have a practice in
// progress" whenever `practiceCompletedAt` was set, which is backwards:
// that field means the practice was *completed*, not left mid-way. Fixed
// so each real state gets its own honest heading, and the CTA now reuses
// the same getContinuityAction() decision /journey/today already makes
// (Resume / Continue to the practice / Begin with an Echo) instead of a
// single generic "Continue your journey" link, so a returning visitor
// lands on the specific next step rather than one more page to read
// before finding it.
export function HomeContinuity() {
  const [principal, setPrincipal] = useState<ClientPrincipalResult | { status: "loading" }>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    resolveClientPrincipal().then((result) => {
      if (!cancelled) setPrincipal(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (principal.status !== "signed_in") return null;

  const journey = readJourneyContext(principal.metadata);
  if (!journey.practiceCompletedAt && !journey.witness && !journey.lastSeenAt) return null;

  const heading = journey.practiceCompletedAt
    ? `You completed ${PRACTICE_LABEL} on ${PROMETHEUSK_DISPLAY_NAME}.`
    : journey.witness
      ? "Your practice is right where you left it."
      : "Welcome back.";

  const action = getContinuityAction(journey);
  const ctaClassName =
    "rounded-full px-4 py-2 text-sm font-semibold echo-cta-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  const ctaStyle = { background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" } as const;

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-lg border px-6 py-4 text-center sm:flex-row sm:justify-between sm:text-left"
      style={{ borderColor: "var(--surface-line)", background: "color-mix(in srgb, var(--gold) 8%, transparent)" }}
    >
      <p className="text-sm" style={{ color: "var(--paper)" }}>
        {heading}
      </p>
      {action.external ? (
        <a href={action.href} className={ctaClassName} style={ctaStyle}>
          {action.ctaLabel}
        </a>
      ) : (
        <Link href={action.href} className={ctaClassName} style={ctaStyle}>
          {action.ctaLabel}
        </Link>
      )}
    </div>
  );
}
