import type { Metadata } from "next";
import { arenakHref } from "@/lib/echo/links";

export const metadata: Metadata = {
  title: "Community — Echo",
  description: "Practice with others without turning reflection into performance.",
};

const SECTIONS = [
  { id: "challenges", title: "Open Challenges" },
  { id: "groups", title: "Your Communities" },
  { id: "events", title: "Events" },
  { id: "cohorts", title: "Active Cohorts" },
  { id: "recognition", title: "Recognition" },
] as const;

export default function CommunityPage() {
  const arenak = arenakHref();

  return (
    <main className="flex flex-1 flex-col px-6 py-16" style={{ background: "var(--midnight)", color: "var(--paper)" }}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
            ECHO
          </p>
          <h1 className="text-2xl font-semibold sm:text-3xl">
            Practice with others without turning reflection into performance.
          </h1>
        </div>

        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              Nothing here yet — {section.title.toLowerCase()} will appear once they exist.
            </p>
          </section>
        ))}

        <div className="border-t pt-6" style={{ borderColor: "var(--surface-line)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            Powered by ArenaK
          </p>
          {arenak && (
            <a href={arenak} className="mt-2 inline-block text-sm font-semibold underline underline-offset-4 hover:no-underline" style={{ color: "var(--gold)" }}>
              Explore ArenaK
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
