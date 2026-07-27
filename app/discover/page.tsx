import type { Metadata } from "next";
import Link from "next/link";
import { listCollections, listEchoes, listPractices, listStories } from "@/lib/content/echo";
import { COMMUNITY_HREF, STORIES_HREF, TODAY_HREF } from "@/lib/echo/links";
import { EchoCard } from "@/components/echo/discover/EchoCard";
import { PracticeCard } from "@/components/echo/discover/PracticeCard";
import { StoryCard } from "@/components/echo/discover/StoryCard";
import { CollectionCard } from "@/components/echo/discover/CollectionCard";
import { ThemeFilter } from "@/components/echo/discover/ThemeFilter";
import { EchoPageShell } from "@/components/echo/shell/EchoPageShell";

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

const CONTINUE_EXPLORING = [
  { label: "Watch a story", body: "Meet a life before you meet its practice.", href: STORIES_HREF },
  { label: "Practice with others", body: "Private practice, shared when it's ready.", href: COMMUNITY_HREF },
  { label: "See what's next for you", body: "Your own recommendation, waiting on Today.", href: TODAY_HREF },
] as const;

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

  const [featuredEcho, ...restEchoes] = echoes;
  const [featuredPractice, ...restPractices] = practices;
  const hasMoreToExplore = restEchoes.length > 0 || restPractices.length > 0 || stories.length > 0;

  return (
    <EchoPageShell width="wide">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
            ECHO
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Discover</h1>
          <p className="max-w-xl text-lg leading-8" style={{ color: "var(--text-dim)" }}>
            Something learned by another life, and the practice that carries it forward.
          </p>
        </div>

        <section id="themes" className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-semibold" style={{ color: "var(--paper)" }}>
              Explore by what you&apos;re navigating
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-dim)" }}>
              A light way in — not a filter wall.
            </p>
          </div>
          <ThemeFilter themes={allThemes()} active={theme} />
        </section>

        <section className="flex flex-col gap-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            Featured
          </h2>

          <div id="echoes">
            {featuredEcho ? (
              <EchoCard echo={featuredEcho} />
            ) : (
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>
                No Echoes match this topic yet — try another, or{" "}
                <Link
                  href="/discover"
                  className="underline underline-offset-4 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
                >
                  see everything
                </Link>
                .
              </p>
            )}
          </div>

          <div id="practices">
            {featuredPractice ? (
              <PracticeCard practice={featuredPractice} />
            ) : (
              <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
                No practices match this topic yet — practices are how an Echo&apos;s experience becomes something
                you can try yourself.
              </p>
            )}
          </div>
        </section>

        <section id="collections" className="flex flex-col gap-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            Collections
          </h2>
          {collections.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {collections.map((collection) => (
                <CollectionCard key={collection.slug} collection={collection} />
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
              Collections group Echoes and practices around a shared thread. None exist for this topic yet — as more
              Echoes join, the ones that belong together will gather here.
            </p>
          )}
        </section>

        <section id="stories" className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
              Recently Added
            </h2>
            <Link
              href={STORIES_HREF}
              className="text-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
            >
              See all stories
            </Link>
          </div>

          {hasMoreToExplore ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {restEchoes.map((echo) => (
                <EchoCard key={echo.slug} echo={echo} />
              ))}
              {restPractices.map((practice) => (
                <PracticeCard key={practice.slug} practice={practice} />
              ))}
              {stories.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border p-6" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
              <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
                You&apos;ve seen everything Echo has today — that&apos;s by design at this stage, not a gap. New
                Echoes, practices and stories arrive here the moment they&apos;re ready, without you needing to look
                anywhere else.
              </p>
            </div>
          )}
        </section>

        <section className="flex flex-col gap-6 border-t pt-14" style={{ borderColor: "var(--surface-line)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
            Continue Exploring
          </h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {CONTINUE_EXPLORING.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col gap-2 rounded-2xl border p-5 transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ borderColor: "var(--surface-line)", outlineColor: "var(--gold)" }}
              >
                <p className="text-base font-semibold" style={{ color: "var(--paper)" }}>
                  {item.label}
                </p>
                <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
                  {item.body}
                </p>
              </Link>
            ))}
          </div>
        </section>
    </EchoPageShell>
  );
}
