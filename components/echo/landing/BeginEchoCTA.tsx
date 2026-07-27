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
    <section className="relative overflow-hidden border-t" style={{ borderColor: "var(--surface-line)" }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50"
        style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--gold) 12%, transparent) 0%, transparent 70%)" }}
      />
      <div className="relative mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center sm:py-28">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: "var(--paper)" }}>
          {headline}
        </h2>
        <p className="mt-3 text-xl font-medium" style={{ color: "var(--gold)" }}>
          {subheading}
        </p>
        <div className="mt-6 flex flex-col gap-1 text-lg leading-8" style={{ color: "var(--text-dim)" }}>
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-11 flex flex-col items-center gap-5 sm:flex-row">
          <Link
            href={START_HERE_HREF}
            className="rounded-full px-9 py-3.5 text-center text-base font-semibold echo-cta-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
          >
            Begin My Echo
          </Link>
          <Link
            href={ENTER_INVITATION_HREF}
            className="rounded-full px-6 py-3.5 text-center text-base font-medium link-underline-draw focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: "var(--paper)", outlineColor: "var(--gold)" }}
          >
            Enter an Invitation
          </Link>
        </div>
      </div>
    </section>
  );
}
