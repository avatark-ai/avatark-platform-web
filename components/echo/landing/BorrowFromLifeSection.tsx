import Link from "next/link";
import { listPractices } from "@/lib/content/echo";
import { DISCOVER_HREF, practiceDetailHref } from "@/lib/echo/links";

export function BorrowFromLifeSection({ headline }: { headline: string }) {
  const practices = listPractices();

  return (
    <section>
      <div className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: "var(--paper)" }}>
          {headline}
        </h2>

        {practices.length > 0 ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {practices.map((practice) => (
              <div
                key={practice.slug}
                className="flex flex-col gap-4 rounded-2xl border p-6 transition-colors hover:border-[var(--gold)]"
                style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
              >
                <div className="flex flex-col gap-2">
                  <p className="text-lg font-semibold" style={{ color: "var(--paper)" }}>
                    {practice.title}
                  </p>
                  <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
                    {practice.purpose}
                  </p>
                </div>
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--gold)" }}>
                  {practice.duration} · {practice.modality}
                </p>
                <Link
                  href={practiceDetailHref(practice.slug)}
                  className="mt-1 self-start rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
                >
                  Borrow Practice
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-10 text-center text-sm" style={{ color: "var(--text-dim)" }}>
            New practices are being added. Check back soon.
          </p>
        )}

        <div className="mt-12 text-center">
          <Link
            href={DISCOVER_HREF}
            className="text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
          >
            Discover More
          </Link>
        </div>
      </div>
    </section>
  );
}
