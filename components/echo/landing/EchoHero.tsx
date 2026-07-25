import Link from "next/link";
import { ENTER_INVITATION_HREF, SIGN_IN_HREF, START_HERE_HREF } from "@/lib/echo/links";

export function EchoHero({ eyebrow, headline, paragraphs }: { eyebrow: string; headline: string; paragraphs: string[] }) {
  return (
    <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--surface-line)" }}>
      {/* A quiet radial glow behind the ring, not a hard-edged shape — the
          kind of restrained warmth a premium consumer hero uses instead of
          a stock illustration. Purely decorative, no motion. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-60"
        style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--gold) 14%, transparent) 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center sm:py-32">
        <span className="relative mb-10 flex h-24 w-24 items-center justify-center" aria-hidden="true">
          <span
            className="absolute inset-0 rounded-full border"
            style={{ borderColor: "color-mix(in srgb, var(--gold) 35%, transparent)" }}
          />
          <span
            className="h-14 w-14 rounded-full border-2"
            style={{ borderColor: "var(--gold)", background: "color-mix(in srgb, var(--gold) 12%, transparent)" }}
          />
        </span>

        <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--gold)" }}>
          {eyebrow}
        </p>

        <h1
          className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl"
          style={{ color: "var(--paper)", lineHeight: 1.08 }}
        >
          {headline}
        </h1>

        <div className="mt-7 flex max-w-md flex-col gap-1.5 text-lg leading-8" style={{ color: "var(--text-dim)" }}>
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-5 sm:flex-row">
          <Link
            href={START_HERE_HREF}
            className="rounded-full px-9 py-3.5 text-center text-base font-semibold shadow-[0_1px_0_0_rgba(0,0,0,0.05)] transition-transform hover:scale-[1.02] hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.99]"
            style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
          >
            Begin My Echo
          </Link>
          <Link
            href={ENTER_INVITATION_HREF}
            className="rounded-full px-6 py-3.5 text-center text-base font-medium underline-offset-4 transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: "var(--paper)", outlineColor: "var(--gold)" }}
          >
            Enter Invitation
          </Link>
        </div>

        <Link
          href={SIGN_IN_HREF}
          className="mt-8 text-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: "var(--text-dim)", outlineColor: "var(--gold)" }}
        >
          Already a member? Sign In
        </Link>
      </div>
    </section>
  );
}
