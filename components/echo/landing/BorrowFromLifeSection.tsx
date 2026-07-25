import Link from "next/link";
import { listPractices } from "@/lib/content/echo";
import { DISCOVER_HREF, practiceDetailHref } from "@/lib/echo/links";

export function BorrowFromLifeSection({ headline }: { headline: string }) {
  const practices = listPractices();

  return (
    <section className="border-b" style={{ borderColor: "var(--surface-line)" }}>
      <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--paper)" }}>
          {headline}
        </h2>

        {practices.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {practices.map((practice) => (
              <div
                key={practice.slug}
                className="flex flex-col gap-3 rounded-md border p-5"
                style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
              >
                <p className="text-base font-semibold" style={{ color: "var(--paper)" }}>
                  {practice.title}
                </p>
                <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
                  {practice.purpose}
                </p>
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--gold)" }}>
                  {practice.duration} · {practice.modality}
                </p>
                <Link
                  href={practiceDetailHref(practice.slug)}
                  className="mt-2 self-start rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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

        <div className="mt-10 text-center">
          <Link
            href={DISCOVER_HREF}
            className="text-sm font-semibold underline underline-offset-4 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
          >
            Discover More
          </Link>
        </div>
      </div>
    </section>
  );
}
