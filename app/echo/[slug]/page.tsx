import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getEchoBySlug,
  listCollectionsForEcho,
  listEchoes,
  listPracticesByEcho,
  listStoriesByEcho,
} from "@/lib/content/echo";
import { echoCategoryEyebrow } from "@/lib/onboarding/guide";
import { practiceDetailHref } from "@/lib/echo/links";
import { Tabs, type TabDefinition } from "@/components/echo/shared/Tabs";

export function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return params.then(({ slug }) => {
    const echo = getEchoBySlug(slug);
    return { title: echo ? `${echo.name} — Echo` : "Echo" };
  });
}

export default async function EchoDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const echo = getEchoBySlug(slug);
  if (!echo) notFound();

  const practices = listPracticesByEcho(slug);
  const stories = listStoriesByEcho(slug);
  const collections = listCollectionsForEcho(slug);

  const tabs: TabDefinition[] = [
    {
      id: "overview",
      label: "Overview",
      content: (
        <p className="max-w-2xl text-lg leading-8" style={{ color: "var(--text-dim)" }}>
          {echo.mission}
        </p>
      ),
    },
    {
      id: "practices",
      label: "Practices",
      content:
        practices.length > 0 ? (
          <ul className="flex flex-col gap-5">
            {practices.map((practice) => (
              <li key={practice.slug} className="rounded-2xl border p-6" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
                <p className="text-lg font-semibold" style={{ color: "var(--paper)" }}>
                  {practice.title}
                </p>
                <p className="mt-2 text-base leading-7" style={{ color: "var(--text-dim)" }}>
                  {practice.purpose}
                </p>
                <Link
                  href={practiceDetailHref(practice.slug)}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
                >
                  Borrow a Practice <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
            No practices from this Echo yet — practices are how its mission becomes something you can actually try.
          </p>
        ),
    },
    {
      id: "stories",
      label: "Stories",
      content:
        stories.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {stories.map((story) => (
              <li key={story.slug} className="text-sm" style={{ color: "var(--text-dim)" }}>
                {story.title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
            No stories from this Echo yet — this is where a narrative telling of its experience would appear.
          </p>
        ),
    },
    {
      id: "evidence",
      label: "Evidence",
      content: (
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Evidence builds from real completed practices and reflections. None have been contributed from this Echo
          yet.
        </p>
      ),
    },
    {
      id: "lineage",
      label: "Lineage",
      content:
        collections.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {collections.map((collection) => (
              <li key={collection.slug} className="text-sm" style={{ color: "var(--text-dim)" }}>
                Part of <span style={{ color: "var(--paper)" }}>{collection.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            No lineage recorded yet — this is where practices borrowed forward from this Echo would appear.
          </p>
        ),
    },
  ];

  return (
    <main className="flex flex-1 flex-col px-6 py-20 sm:py-24" style={{ background: "var(--midnight)", color: "var(--paper)" }}>
      <div className="mx-auto flex w-full max-w-2xl flex-col">
        <span
          aria-hidden="true"
          className="mb-6 h-14 w-14 rounded-full border-2"
          style={{ borderColor: "var(--gold)", background: "color-mix(in srgb, var(--gold) 12%, transparent)" }}
        />
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          {echoCategoryEyebrow(echo.category)}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{echo.name}</h1>
        <p className="mt-2 text-lg" style={{ color: "var(--text-dim)" }}>
          {echo.role}
        </p>

        <blockquote
          className="relative mt-10 rounded-2xl border py-8 pl-8 pr-6 text-xl font-medium italic leading-9 sm:text-2xl"
          style={{ borderColor: "var(--surface-line)", background: "var(--surface)", color: "var(--paper)" }}
        >
          <span
            aria-hidden="true"
            className="absolute left-4 top-3 select-none text-5xl"
            style={{ color: "color-mix(in srgb, var(--gold) 55%, transparent)" }}
          >
            &ldquo;
          </span>
          {echo.giftMessage}
        </blockquote>

        <div className="mt-14">
          <Tabs tabs={tabs} />
        </div>
      </div>
    </main>
  );
}

export function generateStaticParams() {
  return listEchoes().map((echo) => ({ slug: echo.slug }));
}
