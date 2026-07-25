import Link from "next/link";
import { listPractices } from "@/lib/content/echo";
import { practiceDetailHref } from "@/lib/echo/links";
import { PROMETHEUSK_DISPLAY_NAME } from "@/lib/onboarding/prometheusk";

export function PracticeBridgeSection({ headline, paragraphs }: { headline: string; paragraphs: string[] }) {
  const practice = listPractices()[0];

  return (
    <section className="border-b" style={{ borderColor: "var(--surface-line)" }}>
      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-16 text-center sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--paper)" }}>
          {headline}
        </h2>
        <div className="mt-4 flex max-w-xl flex-col gap-2 text-base leading-7" style={{ color: "var(--text-dim)" }}>
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <span
          aria-hidden="true"
          className="mt-8 h-16 w-16 rounded-full border"
          style={{ borderColor: "var(--gold)", background: "color-mix(in srgb, var(--gold) 8%, transparent)" }}
        />

        {practice && (
          <Link
            href={practiceDetailHref(practice.slug)}
            className="mt-8 rounded-md px-8 py-3 text-center text-base font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
          >
            Try the Practice
          </Link>
        )}

        <p className="mt-4 text-xs uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Powered by {PROMETHEUSK_DISPLAY_NAME}
        </p>
      </div>
    </section>
  );
}
