import Link from "next/link";
import { listPractices } from "@/lib/content/echo";
import { WATCH_FIRST_HREF, practiceDetailHref } from "@/lib/echo/links";

export function StoryBridgeSection({ headline }: { headline: string }) {
  const practice = listPractices()[0];

  return (
    <section>
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center sm:py-24">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: "var(--paper)" }}>
          {headline}
        </h2>

        <div
          className="mt-10 flex aspect-video w-full max-w-md flex-col items-center justify-center gap-2 rounded-2xl border"
          style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            Preview — no story is live here yet
          </p>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href={WATCH_FIRST_HREF}
            className="rounded-full px-7 py-3 text-center text-sm font-semibold transition-transform hover:scale-[1.02] hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
          >
            Watch First
          </Link>
          {practice && (
            <Link
              href={practiceDetailHref(practice.slug)}
              className="rounded-full px-7 py-3 text-center text-sm font-medium underline-offset-4 transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: "var(--paper)", outlineColor: "var(--gold)" }}
            >
              Borrow the Practice
            </Link>
          )}
        </div>

        <p className="mt-5 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Powered by StreamK and CinemaK
        </p>
      </div>
    </section>
  );
}
