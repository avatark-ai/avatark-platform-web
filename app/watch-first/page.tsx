import Link from "next/link";
import type { Metadata } from "next";
import { listPractices, listStories } from "@/lib/content/echo";
import { practiceDetailHref } from "@/lib/echo/links";
import { EchoPageShell, ECHO_READING_WIDTH_CLASS } from "@/components/echo/shell/EchoPageShell";

export const metadata: Metadata = {
  title: "Watch First — Echo",
  description: "A short framing story before the practice, when one exists.",
};

export default function WatchFirstPage() {
  const featured = listStories()[0] ?? null;
  const practice = listPractices()[0] ?? null;

  return (
    <EchoPageShell layout="plain">
      <div className={`flex flex-col gap-6 ${ECHO_READING_WIDTH_CLASS.narrow}`}>
        <h1 className="text-2xl font-semibold sm:text-3xl">{featured ? featured.title : "Watch First"}</h1>

        <div
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl border"
          style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
        >
          {featured?.mediaUrl ? (
            <a
              href={featured.mediaUrl}
              className="text-sm font-semibold underline underline-offset-4 hover:no-underline"
              style={{ color: "var(--gold)" }}
            >
              Watch
            </a>
          ) : (
            <p className="px-6 text-sm" style={{ color: "var(--text-dim)" }}>
              {featured
                ? "Preview — no playable source is live for this story yet."
                : "Preview — no story is live here yet. The practice underneath it already works."}
            </p>
          )}
        </div>

        {featured && (
          <>
            {featured.duration && (
              <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
                {featured.duration}
              </p>
            )}
            <p className="text-base leading-7" style={{ color: "var(--text-dim)" }}>
              {featured.description}
            </p>
          </>
        )}

        {practice && (
          <Link
            href={practiceDetailHref(practice.slug)}
            className="mt-2 self-start rounded-full px-8 py-3 text-center text-base font-semibold echo-cta-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
          >
            Borrow the Practice
          </Link>
        )}

        <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Powered by StreamK and CinemaK
        </p>
      </div>
    </EchoPageShell>
  );
}
