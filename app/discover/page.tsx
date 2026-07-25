import type { Metadata } from "next";
import Link from "next/link";
import { listCollections, listEchoes, listPractices, listStories } from "@/lib/content/echo";
import { STORIES_HREF } from "@/lib/echo/links";
import { EchoCard } from "@/components/echo/discover/EchoCard";
import { PracticeCard } from "@/components/echo/discover/PracticeCard";
import { StoryCard } from "@/components/echo/discover/StoryCard";
import { CollectionCard } from "@/components/echo/discover/CollectionCard";
import { ThemeFilter } from "@/components/echo/discover/ThemeFilter";

export const metadata: Metadata = {
  title: "Discover — Echo",
  description: "Featured Echoes, practices, stories and collections.",
};

function allThemes(): string[] {
  const themes = new Set<string>();
  for (const echo of listEchoes()) echo.themes.forEach((theme) => themes.add(theme));
  for (const practice of listPractices()) practice.themes.forEach((theme) => themes.add(theme));
  for (const collection of listCollections()) collection.themes.forEach((theme) => themes.add(theme));
  return Array.from(themes).sort();
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const theme = typeof params.theme === "string" ? params.theme : null;

  const echoes = listEchoes().filter((echo) => !theme || echo.themes.includes(theme));
  const practices = listPractices().filter((practice) => !theme || practice.themes.includes(theme));
  const stories = listStories().filter((story) => !theme || story.themes.includes(theme));
  const collections = listCollections().filter((collection) => !theme || collection.themes.includes(theme));

  return (
    <main className="flex flex-1 flex-col px-6 py-16" style={{ background: "var(--midnight)", color: "var(--paper)" }}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-14">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
            ECHO
          </p>
          <h1 className="text-2xl font-semibold sm:text-3xl">Discover</h1>
          <p className="max-w-xl text-base leading-7" style={{ color: "var(--text-dim)" }}>
            Featured Echoes, practices, stories and collections.
          </p>
        </div>

        <section id="themes" className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            Topics
          </h2>
          <ThemeFilter themes={allThemes()} active={theme} />
        </section>

        <section id="echoes" className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold">Featured Echoes</h2>
          {echoes.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {echoes.map((echo) => (
                <EchoCard key={echo.slug} echo={echo} />
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              No Echoes match this topic yet.
            </p>
          )}
        </section>

        <section id="practices" className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold">Featured Practices</h2>
          {practices.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {practices.map((practice) => (
                <PracticeCard key={practice.slug} practice={practice} />
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              No practices match this topic yet.
            </p>
          )}
        </section>

        <section id="stories" className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Stories</h2>
            <Link href={STORIES_HREF} className="text-sm underline underline-offset-4 hover:no-underline" style={{ color: "var(--gold)" }}>
              See all
            </Link>
          </div>
          {stories.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {stories.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              No stories yet — check back soon.
            </p>
          )}
        </section>

        <section id="collections" className="flex flex-col gap-5">
          <h2 className="text-lg font-semibold">Collections</h2>
          {collections.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {collections.map((collection) => (
                <CollectionCard key={collection.slug} collection={collection} />
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>
              No collections match this topic yet.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
