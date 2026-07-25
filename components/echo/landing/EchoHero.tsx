import Link from "next/link";
import { ENTER_INVITATION_HREF, SIGN_IN_HREF, START_HERE_HREF } from "@/lib/echo/links";

export function EchoHero({ eyebrow, headline, paragraphs }: { eyebrow: string; headline: string; paragraphs: string[] }) {
  return (
    <section className="border-b" style={{ borderColor: "var(--surface-line)" }}>
      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center sm:py-28">
        <span
          aria-hidden="true"
          className="mb-8 h-20 w-20 rounded-full border"
          style={{ borderColor: "var(--gold)", background: "color-mix(in srgb, var(--gold) 10%, transparent)" }}
        />
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--gold)" }}>
          {eyebrow}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl" style={{ color: "var(--paper)" }}>
          {headline}
        </h1>
        <div className="mt-6 flex max-w-xl flex-col gap-1 text-base leading-7 sm:text-lg" style={{ color: "var(--text-dim)" }}>
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href={START_HERE_HREF}
            className="rounded-md px-8 py-3 text-center text-base font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
          >
            Begin My Echo
          </Link>
          <Link
            href={ENTER_INVITATION_HREF}
            className="rounded-md border px-8 py-3 text-center text-base font-semibold transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: "var(--surface-line)", color: "var(--paper)", outlineColor: "var(--gold)" }}
          >
            Enter Invitation
          </Link>
        </div>

        <Link
          href={SIGN_IN_HREF}
          className="mt-6 text-sm underline underline-offset-4 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: "var(--text-dim)", outlineColor: "var(--gold)" }}
        >
          Already a member? Sign In
        </Link>
      </div>
    </section>
  );
}
