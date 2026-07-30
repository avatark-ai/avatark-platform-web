"use client";

import Link from "next/link";
import { useJourneySession } from "@/lib/journey/session";
import { INTENTIONS } from "@/lib/onboarding/intentions";
import { WITNESS_LABEL } from "@/lib/onboarding/witness";
import { COMMUNITY_HREF, LIVING_ECHO_HREF, MY_ECHO_HREF, TODAY_HREF } from "@/lib/echo/links";
import type { JourneyContext } from "@/lib/journey/state";

const STAGES = ["Invitation", "Story", "Practice", "Reflection", "Contribution"] as const;

function reachedStageCount(context: JourneyContext): number {
  if (context.practiceCompletedAt) return 4; // Reflection reached (Contribution is always a deliberate next step, never automatic)
  if (context.witness) return 2; // Story + Practice begun
  if (context.intention) return 1; // Invitation/beginning named
  return 0;
}

// A card, not a border-top divider in a stacked list -- same rounded/
// bordered-surface convention as Community's entry cards and Discover's
// content cards, laid out in a grid instead of a single column so this
// page reads as a set of destinations, not a long scroll of paragraphs.
function JourneySection({
  eyebrow,
  body,
  linkHref,
  linkLabel,
}: {
  eyebrow: string;
  body: string;
  linkHref: string;
  linkLabel: string;
}) {
  return (
    <Link
      href={linkHref}
      className="echo-card-interactive group flex flex-col gap-2.5 rounded-2xl border p-6 hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface)", outlineColor: "var(--gold)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
        {eyebrow}
      </p>
      <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
        {body}
      </p>
      <span
        className="mt-1 flex items-center gap-1.5 text-sm font-semibold transition-transform group-hover:translate-x-0.5"
        style={{ color: "var(--gold)" }}
      >
        {linkLabel} <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

// My Journey is Echo's home -- a hub that fans out into the real,
// already-built destinations that each answer one part of the target IA
// (Living Echo, Practices -- including what you've borrowed, Reflections,
// Evidence, Milestones, Recommendations), rather than duplicating their
// content here. My Echo's own tabs already cover Practices/Reflections/
// Evidence/Timeline (MyEchoView.tsx); Today already covers Recommendations.
// No backend changes and no new data -- only linking out to what already
// exists instead of inlining a second copy of it.
export function MyJourneyView({ context }: { context: JourneyContext }) {
  const intentionLabel = INTENTIONS.find((intention) => intention.id === context.intention)?.label;
  const reached = reachedStageCount(context);

  return (
    <div className="flex flex-col">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
        My Journey
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Your journey is not a score.</h1>
      <p className="mt-2 text-lg leading-8" style={{ color: "var(--text-dim)" }}>
        It is a record of what you are learning and becoming.
      </p>

      {!context.startedAt && (
        <div
          className="mt-10 flex flex-col items-start gap-5 rounded-2xl border p-7"
          style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
        >
          <p className="max-w-md text-lg leading-8" style={{ color: "var(--paper)" }}>
            You haven&apos;t begun your journey yet.
          </p>
          <Link
            href="/start"
            className="rounded-full px-8 py-3 text-center text-base font-semibold echo-cta-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
          >
            Begin with an Echo
          </Link>
        </div>
      )}

      {/* Milestones -- an at-a-glance stage stepper; the same events in
          full (with dates) live on My Echo's own Echo Timeline tab, not
          repeated here a second time. */}
      <div className="mt-10 flex flex-col gap-4 rounded-2xl border p-7" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          Milestones
        </p>
        <ol className="flex flex-wrap items-center gap-x-3 gap-y-3 text-sm font-medium" style={{ color: "var(--paper)" }}>
          {STAGES.map((stage, index) => (
            <li key={stage} className="flex items-center gap-3">
              <span
                className="rounded-full border px-4 py-1.5"
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
        <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
          {intentionLabel ? `Named what mattered: "${intentionLabel}."` : "This grows as you return to practice and reflection — never a count to chase."}
        </p>
        <Link
          href={`${MY_ECHO_HREF}?tab=timeline`}
          className="w-fit text-sm font-semibold link-underline-draw focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
        >
          Echo Timeline →
        </Link>
      </div>

      <div className="mt-2 grid gap-5 sm:grid-cols-2">
        <JourneySection
          eyebrow="Living Echo"
          body="The living record of what you've practiced, learned, and carried forward — not a profile, something that keeps growing."
          linkHref={LIVING_ECHO_HREF}
          linkLabel="View Living Echo"
        />

        <JourneySection
          eyebrow="Practices"
          body={
            context.witness
              ? `The practice you've borrowed and begun: ${WITNESS_LABEL}.`
              : "Practices you've borrowed from an Echo gather here — your own small library of what you've tried."
          }
          linkHref={`${MY_ECHO_HREF}?tab=practices`}
          linkLabel="View Practices"
        />

        <JourneySection
          eyebrow="Reflections"
          body="What a practice left you thinking about, kept private unless you choose to share it."
          linkHref={`${MY_ECHO_HREF}?tab=reflections`}
          linkLabel="View Reflections"
        />

        <JourneySection
          eyebrow="Evidence"
          body="Builds from what you've done, not what you've said — it accumulates from completed practices and verified reflections."
          linkHref={`${MY_ECHO_HREF}?tab=evidence`}
          linkLabel="View Evidence"
        />

        <JourneySection
          eyebrow="Communities"
          body="Challenges, groups, cohorts and recognition — practiced together, powered by ArenaK."
          linkHref={COMMUNITY_HREF}
          linkLabel="Explore Community"
        />

        <JourneySection
          eyebrow="Recommendations"
          body="Today already knows what's next for you, computed from where your journey actually is."
          linkHref={TODAY_HREF}
          linkLabel="See today's recommendation"
        />
      </div>
    </div>
  );
}

export function MyJourneyPage() {
  const { context } = useJourneySession();
  return <MyJourneyView context={context} />;
}
