import type { Metadata } from "next";
import Link from "next/link";
import { arenakHref } from "@/lib/echo/links";
import { EchoPageShell, ECHO_READING_WIDTH_CLASS } from "@/components/echo/shell/EchoPageShell";

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
