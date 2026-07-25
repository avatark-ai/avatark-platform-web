"use client";

import Link from "next/link";
import { useJourneySession } from "@/lib/journey/session";
import { PRACTICE_LABEL, WITNESS_LABEL } from "@/lib/onboarding/witness";
import { PROMETHEUSK_DISPLAY_NAME } from "@/lib/onboarding/prometheusk";
import { DISCOVER_HREF, ENTER_INVITATION_HREF, LIVING_ECHO_HREF, WATCH_FIRST_HREF } from "@/lib/echo/links";
import { Tabs, type TabDefinition } from "@/components/echo/shared/Tabs";
import type { JourneyContext } from "@/lib/journey/state";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function BeginningState() {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-base leading-7" style={{ color: "var(--paper)" }}>
        Your Echo begins with one practice and one reflection.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href={DISCOVER_HREF} className="rounded-md px-6 py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90" style={{ background: "var(--gold)", color: "var(--midnight)" }}>
          Browse a Practice
        </Link>
        <Link href={WATCH_FIRST_HREF} className="rounded-md border px-6 py-3 text-center text-sm font-semibold transition-colors hover:border-[var(--gold)]" style={{ borderColor: "var(--surface-line)", color: "var(--paper)" }}>
          Watch First
        </Link>
        <Link href={ENTER_INVITATION_HREF} className="rounded-md border px-6 py-3 text-center text-sm font-semibold transition-colors hover:border-[var(--gold)]" style={{ borderColor: "var(--surface-line)", color: "var(--paper)" }}>
          Enter an Invitation
        </Link>
      </div>
    </div>
  );
}

export function MyEchoView({ context }: { context: JourneyContext }) {
  const hasActivity = Boolean(context.witness || context.practiceCompletedAt);

  const tabs: TabDefinition[] = [
    {
      id: "overview",
      label: "Overview",
      content: hasActivity ? (
        <div className="flex flex-col gap-3 text-sm leading-6" style={{ color: "var(--text-dim)" }}>
          <p>My Echo is not a profile or a score — it&apos;s a record of what you&apos;ve practiced and reflected on.</p>
          <Link href={LIVING_ECHO_HREF} className="font-semibold underline underline-offset-4 hover:no-underline" style={{ color: "var(--gold)" }}>
            View Living Echo
          </Link>
        </div>
      ) : (
        <BeginningState />
      ),
    },
    {
      id: "timeline",
      label: "Timeline",
      content: context.startedAt ? (
        <ul className="flex flex-col gap-3 text-sm" style={{ color: "var(--text-dim)" }}>
          <li>
            <span className="font-semibold" style={{ color: "var(--paper)" }}>
              {formatDate(context.startedAt)}
            </span>{" "}
            — began the journey.
          </li>
          {context.witness && (
            <li>
              Started <span style={{ color: "var(--paper)" }}>{WITNESS_LABEL}</span>.
            </li>
          )}
          {context.practiceCompletedAt && (
            <li>
              <span className="font-semibold" style={{ color: "var(--paper)" }}>
                {formatDate(context.practiceCompletedAt)}
              </span>{" "}
              — completed a practice, verified by {PROMETHEUSK_DISPLAY_NAME}.
            </li>
          )}
        </ul>
      ) : (
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Nothing recorded yet.
        </p>
      ),
    },
    {
      id: "practices",
      label: "Practices",
      content: context.witness ? (
        <p className="text-sm" style={{ color: "var(--paper)" }}>
          {PRACTICE_LABEL}
        </p>
      ) : (
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          No practices borrowed yet.
        </p>
      ),
    },
    {
      id: "reflections",
      label: "Reflections",
      content: (
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Reflections happen during your practice on {PROMETHEUSK_DISPLAY_NAME}. A summary will appear here once
          there&apos;s more history to show.
        </p>
      ),
    },
    {
      id: "evidence",
      label: "Evidence",
      content: (
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          No evidence has been contributed yet.
        </p>
      ),
    },
    {
      id: "contributions",
      label: "Contributions",
      content: (
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Nothing has been passed forward yet.
        </p>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          My Echo
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">My Echo</h1>
      </div>
      <Tabs tabs={tabs} />
    </div>
  );
}

export function MyEchoPage() {
  const { context } = useJourneySession();
  return <MyEchoView context={context} />;
}
