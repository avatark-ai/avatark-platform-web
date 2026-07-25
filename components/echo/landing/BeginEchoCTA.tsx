import Link from "next/link";
import { ENTER_INVITATION_HREF, START_HERE_HREF } from "@/lib/echo/links";

export function BeginEchoCTA({
  headline,
  subheading,
  paragraphs,
}: {
  headline: string;
  subheading: string;
  paragraphs: string[];
}) {
  return (
    <section>
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center sm:py-24">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--paper)" }}>
          {headline}
        </h2>
        <p className="mt-2 text-lg" style={{ color: "var(--gold)" }}>
          {subheading}
        </p>
        <div className="mt-6 flex flex-col gap-1 text-base leading-7" style={{ color: "var(--text-dim)" }}>
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
            Enter an Invitation
          </Link>
        </div>
      </div>
    </section>
  );
}
