import Link from "next/link";
import type { Metadata } from "next";
import { createJourneyManifest } from "@avatark/journey";
import { describeDashboard } from "@/lib/integrations/dashboard";
import { isPracticeHandoffAvailable } from "@/lib/onboarding/practiceHandoff";
import { IntegrationDashboardView } from "@/components/dev/IntegrationDashboardView";

export const metadata: Metadata = {
  title: "Integration Dashboard — dev",
};

// A developer-only read-out of a single JourneyManifest's orchestration
// state -- Integration Sprint RC1. Not linked from any nav (see
// components/echo/shell/EchoShell.tsx's /dev exclusion); no
// authentication, no backend, purely a display over
// lib/integrations/dashboard.ts. The example below is one representative
// manifest (an invitation-sourced journey, signed in, currently at the
// practice intro) -- for a live, interactive one, see the simulator.
export default function IntegrationDashboardPage() {
  const exampleManifest = createJourneyManifest({
    journeyId: "example-journey",
    source: "invitation",
    entryPoint: "enter",
    invitationId: "tok_demo_invitation",
    practiceId: "the-promise-to-myself",
    returnTo: "/continue",
    nextStep: "practice_intro",
    completedSteps: ["invitation_received", "invitation_accepted"],
    metadata: { authState: "signed_in" },
  });

  const view = describeDashboard(exampleManifest, {
    invitationStatus: "pending",
    practiceAvailable: isPracticeHandoffAvailable("the-promise-to-myself"),
    watchFirstAvailable: true,
  });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12" style={{ background: "var(--midnight)", color: "var(--paper)" }}>
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          Integration Sprint RC1 — dev only
        </p>
        <h1 className="text-2xl font-semibold">Integration Dashboard</h1>
        <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
          A read-out of one example journey&apos;s orchestration state. For an interactive walk
          through every scenario, see the{" "}
          <Link href="/dev/integration/simulator" className="underline underline-offset-4">
            simulator
          </Link>
          .
        </p>
      </div>
      <IntegrationDashboardView view={view} />
    </main>
  );
}
