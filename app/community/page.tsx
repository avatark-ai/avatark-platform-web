import type { Metadata } from "next";
import Link from "next/link";
import { arenakHref } from "@/lib/echo/links";
import { EchoPageShell, ECHO_READING_WIDTH_CLASS } from "@/components/echo/shell/EchoPageShell";
import { EcosystemFlow } from "@/components/echo/shared/EcosystemFlow";

export const metadata: Metadata = {
  title: "Community — Echo",
  description: "Practice together, join a challenge, and be recognized for what you've carried forward.",
};

const ENTRIES = [
  { href: "/community/challenges", title: "Challenges", body: "Shared practices with a defined invitation, time window, and contribution." },
  { href: "/community/groups", title: "Groups", body: "Small communities formed around a practice, transition, institution, or common question." },
  { href: "/community/events", title: "Events", body: "Live or scheduled moments for practice, reflection, conversation, or witness." },
  { href: "/community/cohorts", title: "Cohorts", body: "People moving through the same practice or threshold on a shared timeline." },
  { href: "/community/recognition", title: "Recognition", body: "Quiet acknowledgment of genuine practice, evidence, contribution, or service." },
] as const;

const ARENAK_CREATIONS = ["Events", "Workshops", "Challenges", "Groups", "Cohorts", "Recognition", "Invitations"] as const;

const HOW_COMMUNITIES_BEGIN = [
  { title: "Create an event in ArenaK", body: "An organizer sets up an event, workshop, challenge, group, or cohort." },
  { title: "Generate invitations", body: "ArenaK issues invitations tied to that event." },
  { title: "Invite friends, students, audience or attendees", body: "The organizer passes those invitations along however fits — a link, a QR code, a conference, a class." },
  { title: "Participants arrive in AvatarK", body: "Each invitation lands here, in Echo, where the practice actually begins." },
  { title: "Practice happens in PrometheusK", body: "The real work — completing a practice, reflecting on it — happens on PrometheusK." },
  { title: "Results return to ArenaK", body: "Completion and contribution flow back to the event, challenge, or cohort that started it." },
  { title: "Stories can later be published through StreamK", body: "What was learned can be shared forward as a story, for the next person to discover." },
] as const;

export default function CommunityPage() {
  const arenak = arenakHref();

  return (
    <EchoPageShell>
      <div className={`flex flex-col gap-3 ${ECHO_READING_WIDTH_CLASS.editorial}`}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          COMMUNITY
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Community</h1>
        <p className="text-lg leading-8" style={{ color: "var(--text-dim)" }}>
          Once a practice has changed something, Community is where it can be shared — practiced together, tested
          in a challenge, or simply recognized. The natural next step after practice, not a separate destination.
        </p>
        <p className="text-base leading-7" style={{ color: "var(--text-dim)" }}>
          Community experiences here are powered by <span className="font-semibold" style={{ color: "var(--paper)" }}>ArenaK</span> — the
          engine organizers actually use to build them. ArenaK is where an organizer creates{" "}
          {ARENAK_CREATIONS.map((item, index) => (
            <span key={item}>
              <span className="font-semibold" style={{ color: "var(--paper)" }}>
                {item.toLowerCase()}
              </span>
              {index < ARENAK_CREATIONS.length - 2 ? ", " : index === ARENAK_CREATIONS.length - 2 ? " and " : ""}
            </span>
          ))}
          . Most people arrive here through one of those invitations, not by browsing this page first.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ENTRIES.map((entry) => (
          <Link
            key={entry.href}
            href={entry.href}
            className="echo-card-interactive group flex flex-col gap-2 rounded-2xl border p-6 hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: "var(--surface-line)", background: "var(--surface)", outlineColor: "var(--gold)" }}
          >
            <p className="text-lg font-semibold" style={{ color: "var(--paper)" }}>
              {entry.title}
            </p>
            <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
              {entry.body}
            </p>
            <p
              className="mt-1 flex items-center gap-1.5 text-sm font-semibold transition-transform group-hover:translate-x-0.5"
              style={{ color: "var(--gold)" }}
            >
              Explore <span aria-hidden="true">→</span>
            </p>
          </Link>
        ))}
      </div>

      <div className={`flex flex-col gap-5 border-t pt-8 ${ECHO_READING_WIDTH_CLASS.editorial}`} style={{ borderColor: "var(--surface-line)" }}>
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          How communities begin
        </p>
        <ol className="flex flex-col gap-4">
          {HOW_COMMUNITIES_BEGIN.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
                style={{ borderColor: "var(--surface-line)", color: "var(--gold)" }}
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-semibold" style={{ color: "var(--paper)" }}>
                  {step.title}
                </p>
                <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className={ECHO_READING_WIDTH_CLASS.editorial}>
        <EcosystemFlow />
      </div>

      <div className="flex flex-col items-start gap-2 border-t pt-6" style={{ borderColor: "var(--surface-line)" }}>
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Powered by ArenaK
        </p>
        {arenak && (
          <a
            href={arenak}
            className="inline-flex items-center gap-1.5 text-sm font-semibold link-underline-draw focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
          >
            Explore ArenaK <span aria-hidden="true">→</span>
          </a>
        )}
      </div>
    </EchoPageShell>
  );
}
