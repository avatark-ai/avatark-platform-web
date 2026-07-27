import Link from "next/link";
import { listPractices } from "@/lib/content/echo";
import { practiceDetailHref } from "@/lib/echo/links";
import { PROMETHEUSK_DISPLAY_NAME } from "@/lib/onboarding/prometheusk";

export function PracticeBridgeSection({ headline, paragraphs }: { headline: string; paragraphs: string[] }) {
  const practice = listPractices()[0];

  return (
    <section>
      <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-20 text-center sm:py-24">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: "var(--paper)" }}>
          {headline}
        </h2>
        <div className="mt-5 flex max-w-xl flex-col gap-2 text-lg leading-8" style={{ color: "var(--text-dim)" }}>
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <span
          aria-hidden="true"
          className="mt-10 h-16 w-16 rounded-full border-2"
          style={{ borderColor: "var(--gold)", background: "color-mix(in srgb, var(--gold) 8%, transparent)" }}
        />

        {practice && (
          <Link
            href={practiceDetailHref(practice.slug)}
            className="mt-10 rounded-full px-8 py-3.5 text-center text-base font-semibold echo-cta-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
          >
            Try the Practice
          </Link>
        )}

        <p className="mt-5 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Powered by {PROMETHEUSK_DISPLAY_NAME}
        </p>
      </div>
    </section>
  );
}
