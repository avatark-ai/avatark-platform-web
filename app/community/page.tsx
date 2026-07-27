import type { Metadata } from "next";
import { arenakHref } from "@/lib/echo/links";
import { EchoPageShell } from "@/components/echo/shell/EchoPageShell";

export const metadata: Metadata = {
  title: "Community — Echo",
  description: "Practice with others without turning reflection into performance.",
};

const SECTIONS = [
  {
    id: "challenges",
    title: "Open Challenges",
    body: "A challenge invites you to try one practice for a set stretch of time, alongside others doing the same — not a leaderboard, just shared momentum. None are open yet; when one begins, you'll see it here and on Today.",
  },
  {
    id: "groups",
    title: "Your Communities",
    body: "Groups gather around a shared practice or thread. You haven't joined one yet — Discover often surfaces a community around a practice once one exists.",
  },
  {
    id: "events",
    title: "Events",
    body: "A live, guided moment — a session, a conversation, a shared window of practice. None are scheduled yet.",
  },
  {
    id: "cohorts",
    title: "Active Cohorts",
    body: "A cohort moves through the same threshold together, on the same timeline, witnessing each other's practice. None are running yet.",
  },
  {
    id: "recognition",
    title: "Recognition",
    body: "Not a score or a leaderboard — a quiet acknowledgment when something you practiced or contributed genuinely helped someone else. Nothing to recognize yet, because nothing's been contributed yet.",
  },
] as const;

export default function CommunityPage() {
  const arenak = arenakHref();

  return (
    <EchoPageShell width="editorial" layout="plain" contentClassName="flex flex-col">
        <span
          aria-hidden="true"
          className="mb-6 h-14 w-14 rounded-full border-2"
          style={{ borderColor: "var(--gold)", background: "color-mix(in srgb, var(--gold) 12%, transparent)" }}
        />
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          ECHO
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Practice with others without turning reflection into performance.
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-8" style={{ color: "var(--text-dim)" }}>
          Community here means witnessing, not performing — a place to practice alongside others when you want to,
          never a feed to keep up with.
        </p>

        {/* One consolidated card rather than five separate bordered
            sections -- every category here is honestly empty today, so
            this reads as one deliberate "not yet, here's why it matters"
            preview instead of several thin placeholders down the page.
            id targets are preserved so the context-nav's Challenges/
            Groups/Events/Cohorts/Recognition links still land correctly. */}
        <div className="mt-10 rounded-2xl border p-2" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
          {SECTIONS.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className={`px-5 py-4 ${index > 0 ? "border-t" : ""}`}
              style={{ borderColor: "var(--surface-line)" }}
            >
              <h2 className="text-sm font-semibold" style={{ color: "var(--paper)" }}>
                {section.title}
              </h2>
              <p className="mt-1 text-sm leading-6" style={{ color: "var(--text-dim)" }}>
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start gap-3 border-t pt-8" style={{ borderColor: "var(--surface-line)" }}>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            Powered by ArenaK
          </p>
          {arenak && (
            <a
              href={arenak}
              className="inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
            >
              Explore ArenaK <span aria-hidden="true">→</span>
            </a>
          )}
        </div>
    </EchoPageShell>
  );
}
