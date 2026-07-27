"use client";

// Phase 4's "Authenticate if required" + "Accept invitation" steps.
// Standalone (not the (echoJourney) route group's JourneySessionProvider
// -- that pairs with an AuthGate that redirects signed-out visitors away
// entirely, which is wrong here: an invitation preview must work
// signed-out too, same as /witness/[slug] and /guide/[slug] already do).
//
// Signed in: records the acceptance (best-effort, never blocks the
// "Continue" CTA -- same convention as touchLastSeen) and links straight
// to the destination. Signed out: offers both "continue without an
// account" (today's existing, unbroken behavior) and "sign in to save
// this to your Journey," which preserves the invitation token through
// the existing return-URL mechanism so accepting resumes right here
// after authenticating.
import { useEffect, useState } from "react";
import Link from "next/link";
import { resolveClientPrincipal, type ClientPrincipalResult } from "@/lib/auth/resolveClientPrincipal";
import { createClient } from "@/lib/supabase/client";
import { readJourneyContext, recordInvitationAcceptance } from "@/lib/journey/state";
import { writeGuestContext } from "@/lib/journey/guestContext";
import { SIGN_IN_HREF } from "@/lib/echo/links";
import { invitationSignInReturnPath } from "@/lib/invitations/signInReturn";

export function InvitationAcceptGate({
  token,
  continueHref,
  continueLabel = "Continue",
  practiceSlug = null,
}: {
  token: string;
  continueHref: string;
  continueLabel?: string;
  /** The practice this invitation names, if any -- remembered in the guest context so Watch First/practice-intro can pick it back up. */
  practiceSlug?: string | null;
}) {
  const [principal, setPrincipal] = useState<ClientPrincipalResult | { status: "loading" }>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    resolveClientPrincipal().then(async (result) => {
      if (cancelled) return;
      setPrincipal(result);
      if (result.status !== "signed_in") return;
      try {
        const supabase = createClient();
        const current = readJourneyContext(result.metadata);
        await recordInvitationAcceptance(supabase, current, token);
      } catch {
        // Best-effort, same as touchLastSeen -- never blocks continuing.
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (principal.status === "loading") {
    return (
      <div className="h-11 w-40 animate-pulse rounded-full" style={{ background: "var(--surface-line)" }} aria-hidden="true" />
    );
  }

  if (principal.status === "signed_in") {
    return (
      <Link
        href={continueHref}
        className="echo-cta-primary inline-flex items-center gap-1.5 self-start rounded-full px-7 py-3 text-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
      >
        {continueLabel}
      </Link>
    );
  }

  function acceptAsGuest() {
    // Provisional only -- never the authoritative invitation claim (that
    // stays whatever the resolver says server-side on each visit). Just
    // enough breadcrumb so continuing as a guest survives a navigation
    // and can hand off cleanly if this visitor signs in later (see
    // JourneySessionProvider's mount-time merge).
    writeGuestContext({
      invitationToken: token,
      witness: practiceSlug,
      intendedPracticeId: practiceSlug,
      step: "accepted",
      acceptedAt: new Date().toISOString(),
      intendedReturnRoute: continueHref,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href={continueHref}
          onClick={acceptAsGuest}
          className="echo-cta-primary inline-flex items-center gap-1.5 self-start rounded-full px-7 py-3 text-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
        >
          Continue as guest
        </Link>
        <Link
          href={`${SIGN_IN_HREF}?return=${encodeURIComponent(invitationSignInReturnPath(token))}`}
          className="text-sm font-medium link-underline-draw focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: "var(--text-dim)", outlineColor: "var(--gold)" }}
        >
          Sign in to save this to your Journey
        </Link>
      </div>
      <p className="text-xs" style={{ color: "var(--text-dim)" }}>
        You can watch and explore first — signing in is what actually saves your progress to your Journey.
      </p>
    </div>
  );
}
