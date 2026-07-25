import type { Metadata } from "next";
import { listStories } from "@/lib/content/echo";
import { cinemakHref, streamkHref } from "@/lib/echo/links";
import { StoryCard } from "@/components/echo/discover/StoryCard";

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

  return (
    <main className="flex flex-1 flex-col px-6 py-16" style={{ background: "var(--midnight)", color: "var(--paper)" }}>
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
            ECHO
          </p>
          <h1 className="text-2xl font-semibold sm:text-3xl">Stories</h1>
          <p className="max-w-xl text-base leading-7" style={{ color: "var(--text-dim)" }}>
            Some lessons are encountered as stories before they become practices.
          </p>
        </div>

        <section id="watch" className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold">Featured</h2>
          {stories.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {stories.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              No stories yet — check back soon. The practice underneath them already works from Discover.
            </p>
          )}
        </section>

        <section id="episodes" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Episodes</h2>
          {episodes.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {episodes.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              No episodes yet.
            </p>
          )}
        </section>

        <section id="live" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Live</h2>
          {live.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {live.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              Nothing live right now.
            </p>
          )}
        </section>

        <section id="films" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Films</h2>
          {films.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {films.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              No films yet.
            </p>
          )}
        </section>

        <section id="creators" className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Creators</h2>
          {creators.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {creators.map((creator) => (
                <li key={creator} className="rounded-full border px-3 py-1 text-sm" style={{ borderColor: "var(--surface-line)", color: "var(--paper)" }}>
                  {creator}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              No creators listed yet.
            </p>
          )}
        </section>

        <div className="border-t pt-6" style={{ borderColor: "var(--surface-line)" }}>
          <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            Powered by StreamK and CinemaK
          </p>
          <div className="mt-2 flex gap-4">
            {streamk && (
              <a href={streamk} className="text-sm font-semibold underline underline-offset-4 hover:no-underline" style={{ color: "var(--gold)" }}>
                Explore StreamK
              </a>
            )}
            {cinemak && (
              <a href={cinemak} className="text-sm font-semibold underline underline-offset-4 hover:no-underline" style={{ color: "var(--gold)" }}>
                Explore CinemaK
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
