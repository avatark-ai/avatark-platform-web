import Link from "next/link";
import { listPractices } from "@/lib/content/echo";
import { WATCH_FIRST_HREF, practiceDetailHref } from "@/lib/echo/links";

export function StoryBridgeSection({ headline }: { headline: string }) {
  const practice = listPractices()[0];

  return (
    <section className="border-b" style={{ borderColor: "var(--surface-line)" }}>
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--paper)" }}>
          {headline}
        </h2>

        <div
          className="mt-8 flex aspect-video w-full max-w-md flex-col items-center justify-center gap-2 rounded-md border"
          style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            Preview — no story is live here yet
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href={WATCH_FIRST_HREF}
            className="rounded-md px-6 py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
          >
            Watch First
          </Link>
          {practice && (
            <Link
              href={practiceDetailHref(practice.slug)}
              className="rounded-md border px-6 py-3 text-center text-sm font-semibold transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ borderColor: "var(--surface-line)", color: "var(--paper)", outlineColor: "var(--gold)" }}
            >
              Borrow the Practice
            </Link>
          )}
        </div>

        <p className="mt-4 text-xs uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Powered by StreamK and CinemaK
        </p>
      </div>
    </section>
  );
}
