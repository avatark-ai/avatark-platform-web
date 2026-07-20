"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { resolveClientPrincipal, type ClientPrincipalResult } from "@/lib/auth/resolveClientPrincipal";
import { readJourneyContext } from "@/lib/journey/state";

// Phase 2 (returning-user continuity): the only real, already-verified
// continuation signal this repo has today is a signed-in session plus
// whatever RC5 already wrote into auth.users.user_metadata.journey (see
// lib/journey/state.ts). There is no cross-product Chronicle or universal
// resume state -- this renders nothing rather than invent one. Signed-out
// visitors and visitors with no journey data see no banner at all, so the
// four-intent home is what they get.
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
  if (!journey.practiceCompletedAt && !journey.lastSeenAt) return null;

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-lg border px-6 py-4 text-center sm:flex-row sm:justify-between sm:text-left"
      style={{ borderColor: "var(--surface-line)", background: "color-mix(in srgb, var(--gold) 8%, transparent)" }}
    >
      <p className="text-sm" style={{ color: "var(--paper)" }}>
        {journey.practiceCompletedAt ? "You have a practice in progress." : "Welcome back."}
      </p>
      <Link
        href="/journey"
        className="rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ background: "var(--gold)", color: "var(--midnight)" }}
      >
        Continue your journey
      </Link>
    </div>
  );
}
