import type { ReactNode } from "react";
import Link from "next/link";
import { arenakHref } from "@/lib/echo/links";
import { EchoPageShell, ECHO_READING_WIDTH_CLASS } from "@/components/echo/shell/EchoPageShell";

// Shared shell for the six Community routes (/community and its five
// child pages) -- one title/purpose/content/attribution structure so
// each route reads as a distinct destination with the same rhythm,
// rather than six independently laid-out pages. Attribution stays a
// single restrained line, never a second Community-branded header.
export function CommunitySectionShell({
  eyebrow = "COMMUNITY",
  title,
  purpose,
  children,
}: {
  eyebrow?: string;
  title: string;
  purpose: string;
  children: ReactNode;
}) {
  const arenak = arenakHref();

  return (
    <EchoPageShell layout="plain">
      <div className={`flex flex-col gap-8 ${ECHO_READING_WIDTH_CLASS.editorial}`}>
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
            {eyebrow}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="text-lg leading-8" style={{ color: "var(--text-dim)" }}>
            {purpose}
          </p>
        </div>

        {children}

        <div className="flex flex-col items-start gap-2 border-t pt-6" style={{ borderColor: "var(--surface-line)" }}>
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
      </div>
    </EchoPageShell>
  );
}

export function CommunityEmptyState({ body, ctaLabel, ctaHref }: { body: string; ctaLabel: string; ctaHref: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border p-6" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
      <p className="text-base leading-7" style={{ color: "var(--text-dim)" }}>
        {body}
      </p>
      <Link
        href={ctaHref}
        className="self-start rounded-full px-6 py-2.5 text-center text-sm font-semibold transition-transform hover:scale-[1.02] hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
