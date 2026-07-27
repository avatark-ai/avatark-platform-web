import type { Metadata } from "next";
import Link from "next/link";
import { listPractices, listStories } from "@/lib/content/echo";
import { cinemakHref, DISCOVER_HREF, practiceDetailHref, streamkHref, WATCH_FIRST_HREF } from "@/lib/echo/links";
import { StoryCard } from "@/components/echo/discover/StoryCard";
import { ECHO_CONTENT_WIDTH_CLASS } from "@/components/echo/shell/EchoPageShell";

export const metadata: Metadata = {
  title: "Stories — Echo",
  description: "Watch, episodes, live programming and films from the Echo ecosystem.",
};

export default function StoriesPage() {
  const stories = listStories();
  const episodes = stories.filter((story) => story.kind === "episode");
  const live = stories.filter((story) => story.kind === "live");
  const films = stories.filter((story) => story.kind === "film");
  const creators = Array.from(new Set(stories.map((story) => story.creator).filter((creator): creator is string => Boolean(creator))));
  const streamk = streamkHref();
  const cinemak = cinemakHref();
  const practice = listPractices()[0];

  return (
    <main className="flex flex-1 flex-col" style={{ background: "var(--midnight)", color: "var(--paper)" }}>
      {/* Large editorial hero, streaming-platform in spirit -- Watch First
          is the one real, working story experience today, so it carries
          the primary emphasis rather than a fabricated featured episode. */}
      <section className="relative overflow-hidden border-b" style={{ borderColor: "var(--surface-line)" }}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-50"
          style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--gold) 12%, transparent) 0%, transparent 70%)" }}
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--gold)" }}>
            ECHO STORIES
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Stories</h1>
          <p className="mt-5 max-w-xl text-lg leading-8" style={{ color: "var(--text-dim)" }}>
            Some lessons are encountered as stories before they become practices.
          </p>
          <Link
            href={WATCH_FIRST_HREF}
            className="mt-8 rounded-full px-9 py-3.5 text-center text-base font-semibold transition-transform hover:scale-[1.02] hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
          >
            Watch First
          </Link>
        </div>
      </section>

      <div className={`mx-auto flex w-full flex-col gap-10 px-6 pb-12 pt-10 sm:gap-12 sm:pb-16 sm:pt-14 ${ECHO_CONTENT_WIDTH_CLASS.wide}`}>
        {stories.length > 0 ? (
          <>
            <section id="watch" className="flex flex-col gap-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
                Featured
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {stories.map((story) => (
                  <StoryCard key={story.slug} story={story} />
                ))}
              </div>
            </section>

            <section id="episodes" className="flex flex-col gap-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
                Episodes
              </h2>
              {episodes.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  {episodes.map((story) => (
                    <StoryCard key={story.slug} story={story} />
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
                  Episodic stories will appear here as they&apos;re added.
                </p>
              )}
            </section>

            <section id="live" className="flex flex-col gap-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
                Live
              </h2>
              {live.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  {live.map((story) => (
                    <StoryCard key={story.slug} story={story} />
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
                  Nothing live right now — live programming will appear here when it&apos;s scheduled.
                </p>
              )}
            </section>

            <section id="films" className="flex flex-col gap-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
                Films
              </h2>
              {films.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  {films.map((story) => (
                    <StoryCard key={story.slug} story={story} />
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
                  No films yet.
                </p>
              )}
            </section>

            {creators.length > 0 && (
              <section id="creators" className="flex flex-col gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
                  Creators
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {creators.map((creator) => (
                    <li key={creator} className="rounded-full border px-4 py-1.5 text-sm" style={{ borderColor: "var(--surface-line)", color: "var(--paper)" }}>
                      {creator}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          // No real story content exists yet in any category (watch,
          // episodes, live, films, creators) -- one compact, deliberate
          // preview instead of five separate thin placeholder sections.
          // id targets every context-nav anchor (#watch #episodes #live
          // #films) so none of those links land on a dead spot.
          <section id="watch" className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
            <span id="episodes" />
            <span id="live" />
            <span id="films" />
            <p className="text-lg leading-8" style={{ color: "var(--paper)" }}>
              Stories are being prepared.
            </p>
            <p className="mt-2 text-base leading-7" style={{ color: "var(--text-dim)" }}>
              Begin with Watch First, where every story leads to a practice you can carry forward.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={WATCH_FIRST_HREF}
                className="rounded-full px-7 py-3 text-center text-sm font-semibold transition-transform hover:scale-[1.02] hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
              >
                Watch First
              </Link>
              <Link
                href={`${DISCOVER_HREF}#practices`}
                className="rounded-full border px-7 py-3 text-center text-sm font-semibold transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ borderColor: "var(--surface-line)", color: "var(--paper)", outlineColor: "var(--gold)" }}
              >
                Explore Practices
              </Link>
            </div>
          </section>
        )}

        {/* Strong transition into Practice, mirroring the landing page's
            own story-to-practice bridge. */}
        {practice && stories.length > 0 && (
          <section className="rounded-2xl border p-8 text-center" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
            <p className="text-lg leading-8" style={{ color: "var(--paper)" }}>
              A story is where you meet a life. A practice is where you carry it.
            </p>
            <Link
              href={practiceDetailHref(practice.slug)}
              className="mt-6 inline-block rounded-full px-8 py-3 text-center text-base font-semibold transition-transform hover:scale-[1.02] hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
            >
              Borrow the Practice
            </Link>
          </section>
        )}

        <div className="flex flex-col items-start gap-3 border-t pt-8" style={{ borderColor: "var(--surface-line)" }}>
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            Powered by StreamK and CinemaK
          </p>
          <div className="flex gap-5">
            {streamk && (
              <a
                href={streamk}
                className="text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
              >
                Explore StreamK
              </a>
            )}
            {cinemak && (
              <a
                href={cinemak}
                className="text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
              >
                Explore CinemaK
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
