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
        <div className="flex flex-col gap-4 text-base leading-7" style={{ color: "var(--text-dim)" }}>
          <p>{echo.mission}</p>
          <p className="italic" style={{ color: "var(--paper)" }}>
            &ldquo;{echo.giftMessage}&rdquo;
          </p>
        </div>
      ),
    },
    {
      id: "practices",
      label: "Practices",
      content:
        practices.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {practices.map((practice) => (
              <li key={practice.slug} className="rounded-md border p-4" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
                <p className="text-base font-semibold" style={{ color: "var(--paper)" }}>
                  {practice.title}
                </p>
                <p className="mt-1 text-sm leading-6" style={{ color: "var(--text-dim)" }}>
                  {practice.purpose}
                </p>
                <Link
                  href={practiceDetailHref(practice.slug)}
                  className="mt-3 inline-block text-sm font-semibold underline underline-offset-4 hover:no-underline"
                  style={{ color: "var(--gold)" }}
                >
                  Borrow a Practice
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            No practices from this Echo yet.
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
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            No stories from this Echo yet.
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
    <main className="flex flex-1 flex-col px-6 py-16" style={{ background: "var(--midnight)", color: "var(--paper)" }}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          {echoCategoryEyebrow(echo.category)}
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">{echo.name}</h1>
        <p className="text-base" style={{ color: "var(--text-dim)" }}>
          {echo.role}
        </p>

        <Tabs tabs={tabs} />
      </div>
    </main>
  );
}

export function generateStaticParams() {
  return listEchoes().map((echo) => ({ slug: echo.slug }));
}
