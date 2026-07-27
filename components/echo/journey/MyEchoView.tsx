"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useJourneySession } from "@/lib/journey/session";
import { PRACTICE_LABEL, WITNESS_LABEL } from "@/lib/onboarding/witness";
import { PROMETHEUSK_DISPLAY_NAME } from "@/lib/onboarding/prometheusk";
import { DISCOVER_HREF, ENTER_INVITATION_HREF, LIVING_ECHO_HREF, WATCH_FIRST_HREF } from "@/lib/echo/links";
import { Tabs, type TabDefinition } from "@/components/echo/shared/Tabs";
import type { JourneyContext } from "@/lib/journey/state";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
      <p className="text-sm font-semibold" style={{ color: "var(--paper)" }}>
        {title}
      </p>
      <p className="mt-1.5 text-sm leading-6" style={{ color: "var(--text-dim)" }}>
        {body}
      </p>
    </div>
  );
}

function BeginningState() {
  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-md text-lg leading-8" style={{ color: "var(--paper)" }}>
        Your Echo begins with one practice and one reflection.
      </p>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Link
          href={DISCOVER_HREF}
          className="rounded-full px-6 py-3 text-center text-sm font-semibold transition-transform hover:scale-[1.02] hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
        >
          Browse a Practice
        </Link>
        <Link
          href={WATCH_FIRST_HREF}
          className="text-sm font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: "var(--paper)", outlineColor: "var(--gold)" }}
        >
          Watch First
        </Link>
        <Link
          href={ENTER_INVITATION_HREF}
          className="text-sm font-medium underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: "var(--paper)", outlineColor: "var(--gold)" }}
        >
          Enter an Invitation
        </Link>
      </div>
    </div>
  );
}

const TIMELINE_DOT = (filled: boolean) => (
  <span
    aria-hidden="true"
    className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
    style={{ background: filled ? "var(--gold)" : "var(--surface-line)" }}
  />
);

const TAB_IDS = ["overview", "timeline", "practices", "reflections", "evidence", "contributions"] as const;

export function MyEchoView({ context, initialTabId }: { context: JourneyContext; initialTabId?: string }) {
  const hasActivity = Boolean(context.witness || context.practiceCompletedAt);

  const tabs: TabDefinition[] = [
    {
      id: "overview",
      label: "Overview",
      content: hasActivity ? (
        <div className="flex flex-col gap-5">
          <p className="max-w-md text-lg leading-8" style={{ color: "var(--paper)" }}>
            My Echo is not a profile or a score — it&apos;s a record of what you&apos;ve practiced, reflected on, and
            begun to carry forward.
          </p>
          <Link
            href={LIVING_ECHO_HREF}
            className="inline-flex w-fit items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: "var(--surface-line)", color: "var(--paper)", outlineColor: "var(--gold)" }}
          >
            View Living Echo <span aria-hidden="true">→</span>
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
        <ol className="flex flex-col gap-6">
          <li className="flex gap-4">
            {TIMELINE_DOT(true)}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
                {formatDate(context.startedAt)}
              </p>
              <p className="mt-1 text-base" style={{ color: "var(--paper)" }}>
                Began the journey.
              </p>
            </div>
          </li>
          {context.witness && (
            <li className="flex gap-4">
              {TIMELINE_DOT(true)}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
                  Practice
                </p>
                <p className="mt-1 text-base" style={{ color: "var(--paper)" }}>
                  Started {WITNESS_LABEL}.
                </p>
              </div>
            </li>
          )}
          {context.practiceCompletedAt && (
            <li className="flex gap-4">
              {TIMELINE_DOT(true)}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
                  {formatDate(context.practiceCompletedAt)}
                </p>
                <p className="mt-1 text-base" style={{ color: "var(--paper)" }}>
                  Completed a practice, verified by {PROMETHEUSK_DISPLAY_NAME}.
                </p>
              </div>
            </li>
          )}
          <li className="flex gap-4">
            {TIMELINE_DOT(false)}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
                What&apos;s next
              </p>
              <p className="mt-1 text-base" style={{ color: "var(--text-dim)" }}>
                Your next chapter is written by returning, not by waiting.
              </p>
            </div>
          </li>
        </ol>
      ) : (
        <EmptyPanel
          title="Your timeline starts the moment you begin."
          body="Nothing recorded yet — the first entry here is whichever practice or story you start next."
        />
      ),
    },
    {
      id: "practices",
      label: "Practices",
      content: context.witness ? (
        <div className="rounded-2xl border p-6" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
          <p className="text-lg font-semibold" style={{ color: "var(--paper)" }}>
            {PRACTICE_LABEL}
          </p>
        </div>
      ) : (
        <EmptyPanel
          title="No practices borrowed yet."
          body="When you borrow a practice from an Echo, it stays here — your own small library of what you've tried."
        />
      ),
    },
    {
      id: "reflections",
      label: "Reflections",
      content: (
        <EmptyPanel
          title="Reflections gather here over time."
          body={`Reflections happen during your practice on ${PROMETHEUSK_DISPLAY_NAME}. A summary will appear here once there's more history to show.`}
        />
      ),
    },
    {
      id: "evidence",
      label: "Evidence",
      content: (
        <EmptyPanel
          title="Evidence builds from what you've done, not what you've said."
          body="No evidence has been contributed yet — it accumulates from completed practices and verified reflections."
        />
      ),
    },
    {
      id: "contributions",
      label: "Contributions",
      content: (
        <EmptyPanel
          title="What you pass forward lives here."
          body="Nothing has been passed forward yet. When something you've learned becomes useful to someone else, it will appear in this tab."
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col">
      <span
        aria-hidden="true"
        className="mb-6 h-14 w-14 rounded-full border-2"
        style={{ borderColor: "var(--gold)", background: "color-mix(in srgb, var(--gold) 12%, transparent)" }}
      />
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
        My Echo
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">This represents you.</h1>
      <p className="mt-2 max-w-md text-lg leading-8" style={{ color: "var(--text-dim)" }}>
        Not a score. A living record of what you&apos;re learning and becoming.
      </p>

      <div className="mt-12">
        <Tabs tabs={tabs} initialTabId={initialTabId} />
      </div>
    </div>
  );
}

export function MyEchoPage() {
  const { context } = useJourneySession();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTabId = requestedTab && (TAB_IDS as readonly string[]).includes(requestedTab) ? requestedTab : undefined;
  return <MyEchoView context={context} initialTabId={initialTabId} />;
}
