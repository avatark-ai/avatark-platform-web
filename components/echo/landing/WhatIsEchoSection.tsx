import Link from "next/link";

const PROGRESSION = ["Experience", "Practice", "Reflection", "Evidence", "Lineage"];

export function WhatIsEchoSection({ headline, paragraphs }: { headline: string; paragraphs: string[] }) {
  return (
    <section id="what-is-an-echo" className="border-b" style={{ borderColor: "var(--surface-line)" }}>
      <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--paper)" }}>
          {headline}
        </h2>
        <div className="mx-auto mt-6 flex max-w-xl flex-col gap-3 text-base leading-7" style={{ color: "var(--text-dim)" }}>
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <ol className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-medium" style={{ color: "var(--paper)" }}>
          {PROGRESSION.map((stage, index) => (
            <li key={stage} className="flex items-center gap-3">
              <span className="rounded-full border px-3 py-1" style={{ borderColor: "var(--surface-line)" }}>
                {stage}
              </span>
              {index < PROGRESSION.length - 1 && (
                <span aria-hidden="true" style={{ color: "var(--gold)" }}>
                  →
                </span>
              )}
            </li>
          ))}
        </ol>

        <Link
          href="/discover"
          className="mt-8 inline-block text-sm font-semibold underline underline-offset-4 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
        >
          See How an Echo Works
        </Link>
      </div>
    </section>
  );
}
