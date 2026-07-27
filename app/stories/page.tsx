import type { Metadata } from "next";
import Link from "next/link";
import { listPractices, listStories } from "@/lib/content/echo";
import { cinemakHref, DISCOVER_HREF, practiceDetailHref, streamkHref, WATCH_FIRST_HREF } from "@/lib/echo/links";
import { StoryCard } from "@/components/echo/discover/StoryCard";
import { ECHO_READING_WIDTH_CLASS } from "@/components/echo/shell/EchoPageShell";

export const metadata: Metadata = {
  title: "Stories — Echo",
  description: "Watch, episodes, live programming and films from the Echo ecosystem.",
};

type StoriesView = "watch" | "episodes" | "live" | "films";
const VALID_VIEWS: StoriesView[] = ["watch", "episodes", "live", "films"];

function resolveView(raw: string | string[] | undefined): StoriesView {
  return typeof raw === "string" && (VALID_VIEWS as string[]).includes(raw) ? (raw as StoriesView) : "watch";
}

const VIEW_TABS: { id: StoriesView; label: string }[] = [
  { id: "watch", label: "Watch" },
  { id: "episodes", label: "Episodes" },
  { id: "live", label: "Live" },
  { id: "films", label: "Films" },
];

function viewHref(view: StoriesView): string {
  return `/stories?view=${view}`;
}

// Same stable fixed-container tab pattern as Discover's ViewTabs -- each
// of Watch/Episodes/Live/Films is a real, addressable state with its own
// honest content, not four labels scrolling to one merged block.
function ViewTabs({ active }: { active: StoriesView }) {
  return (
    <div role="tablist" aria-label="Stories sections" className="flex gap-6 overflow-x-auto border-b" style={{ borderColor: "var(--surface-line)" }}>
      {VIEW_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={viewHref(tab.id)}
            role="tab"
            aria-selected={isActive}
            aria-current={isActive ? "page" : undefined}
            className="shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              borderColor: isActive ? "var(--gold)" : "transparent",
              color: isActive ? "var(--paper)" : "var(--text-dim)",
              outlineColor: "var(--gold)",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
      <p className="text-sm font-semibold" style={{ color: "var(--paper)" }}>
        {title}
      </p>
      <p className="mt-1.5 text-sm leading-6" style={{ color: "var(--text-dim)" }}>
        {body}
      </p>
    </div>
  );
}

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const view = resolveView(params.view);

  const stories = listStories();
  const episodes = stories.filter((story) => story.kind === "episode");
  const live = stories.filter((story) => story.kind === "live");
  const films = stories.filter((story) => story.kind === "film");
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
        <div className="relative mx-auto flex max-w-3xl flex-col items-start px-6 py-16 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--gold)" }}>
            ECHO STORIES
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">Stories</h1>
          <p className="mt-5 max-w-xl text-lg leading-8" style={{ color: "var(--text-dim)" }}>
            Some lessons are encountered as stories before they become practices.
          </p>
          <Link
            href={WATCH_FIRST_HREF}
            className="mt-8 rounded-full px-9 py-3.5 text-center text-base font-semibold echo-cta-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
          >
            Watch First
          </Link>
        </div>
      </section>

      <div className={`mx-auto flex w-full flex-col gap-10 px-6 pb-12 pt-10 sm:gap-12 sm:pb-16 sm:pt-14 max-w-6xl`}>
        <ViewTabs active={view} />

        {view === "watch" &&
          (stories.length > 0 ? (
            <section className="grid gap-6 sm:grid-cols-2">
              {stories.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </section>
          ) : (
            <EmptyPanel
              title="No stories are live yet"
              body="Watch First already works, and every story that arrives here will lead somewhere real: a practice you can begin the same way."
            />
          ))}

        {view === "episodes" &&
          (episodes.length > 0 ? (
            <section className="grid gap-6 sm:grid-cols-2">
              {episodes.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </section>
          ) : (
            <EmptyPanel
              title="Episodes are still being gathered"
              body="Each one will open with a life, not a lesson — the practice underneath comes after."
            />
          ))}

        {view === "live" &&
          (live.length > 0 ? (
            <section className="grid gap-6 sm:grid-cols-2">
              {live.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </section>
          ) : (
            <EmptyPanel
              title="Nothing live right now"
              body="When a live moment is worth gathering for, you'll see it here first."
            />
          ))}

        {view === "films" &&
          (films.length > 0 ? (
            <section className="grid gap-6 sm:grid-cols-2">
              {films.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </section>
          ) : (
            <EmptyPanel
              title="No films yet"
              body="A longer telling takes longer to earn. The first one will be worth the wait."
            />
          ))}

        {stories.length === 0 && (
          <div className={`flex flex-col gap-3 ${ECHO_READING_WIDTH_CLASS.editorial}`}>
            <Link
              href={`${DISCOVER_HREF}?view=practices`}
              className="echo-cta-secondary self-start rounded-full border px-6 py-2.5 text-center text-sm font-semibold hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ borderColor: "var(--surface-line)", color: "var(--paper)", outlineColor: "var(--gold)" }}
            >
              Explore Practices
            </Link>
          </div>
        )}

        {/* Strong transition into Practice, mirroring the landing page's
            own story-to-practice bridge. */}
        {practice && stories.length > 0 && (
          <section className="rounded-2xl border p-8" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
            <p className="text-lg leading-8" style={{ color: "var(--paper)" }}>
              A story is where you meet a life. A practice is where you carry it.
            </p>
            <Link
              href={practiceDetailHref(practice.slug)}
              className="mt-6 inline-block rounded-full px-8 py-3 text-center text-base font-semibold echo-cta-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
                className="text-sm font-semibold link-underline-draw focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
              >
                Explore StreamK
              </a>
            )}
            {cinemak && (
              <a
                href={cinemak}
                className="text-sm font-semibold link-underline-draw focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
