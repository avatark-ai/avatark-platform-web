import type { Metadata } from "next";
import Link from "next/link";
import { listPractices, listStories } from "@/lib/content/echo";
import { cinemakHref, DISCOVER_HREF, practiceDetailHref, streamkHref, WATCH_FIRST_HREF } from "@/lib/echo/links";
import { StoryCard } from "@/components/echo/discover/StoryCard";
import { EchoPageShell, ECHO_READING_WIDTH_CLASS } from "@/components/echo/shell/EchoPageShell";

export const metadata: Metadata = {
  title: "Stories — Echo",
  description: "Watch, episodes, live programming and films from the Echo ecosystem.",
};

type StoriesView = "watch" | "episodes" | "live" | "films";
const VALID_VIEWS: StoriesView[] = ["watch", "episodes", "live", "films"];

function resolveView(raw: string | string[] | undefined): StoriesView {
  return typeof raw === "string" && (VALID_VIEWS as string[]).includes(raw) ? (raw as StoriesView) : "watch";
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
    <EchoPageShell>
      {/* Same hero pattern as every other Echo page (heading size, subhead
          width/weight, no bare "ECHO" eyebrow) -- previously this page
          built its own larger, differently-styled hero with a radial-
          gradient background, which is why it read as a different product
          from the rest of Echo. */}
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Stories</h1>
        <p className="max-w-xl text-lg leading-8" style={{ color: "var(--text-dim)" }}>
          Some lessons are encountered as stories before they become practices.
        </p>
        <Link
          href={WATCH_FIRST_HREF}
          className="mt-2 w-fit rounded-full px-9 py-3.5 text-center text-base font-semibold echo-cta-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
        >
          Watch First
        </Link>
      </div>

      {/* View switching (Watch/Episodes/Live/Films) lives once, in the
          shared EchoContextNav bar above every Stories page -- this page
          no longer duplicates it with a second, page-local tab strip. */}
      <>
        {view === "watch" &&
          (stories.length > 0 ? (
            <section className="grid gap-6 sm:grid-cols-2">
              {stories.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </section>
          ) : (
            <EmptyPanel
              title="No stories are live yet."
              body="Every practice that changes a life eventually becomes a story worth sharing."
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
      </>
    </EchoPageShell>
  );
}
