import { notFound } from "next/navigation";
import Link from "next/link";
import { getEchoBySlug, getPracticeBySlug, listPractices } from "@/lib/content/echo";
import { echoDetailHref } from "@/lib/echo/links";

export function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => {
    const practice = getPracticeBySlug(id);
    return { title: practice ? `${practice.title} — Echo` : "Practice — Echo" };
  });
}

export default async function PracticeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const practice = getPracticeBySlug(id);
  if (!practice) notFound();

  const search = await searchParams;
  const intention = typeof search.intention === "string" ? search.intention : null;
  const invitation = typeof search.invitation === "string" ? search.invitation : null;
  const sourceEcho = getEchoBySlug(practice.sourceEcho);

  // Same canonical PrometheusK handoff every other entry point in this
  // repo uses (see app/witness/[slug]/page.tsx) -- routed through the
  // Route Handler that generates the onboarding state/nonce and sets the
  // verification cookie, not built directly here.
  const beginUrl = new URL("/api/onboarding/begin", "https://placeholder.invalid");
  beginUrl.searchParams.set("witness", practice.slug);
  if (intention) beginUrl.searchParams.set("intention", intention);
  if (invitation) beginUrl.searchParams.set("invitation", invitation);
  const beginHref = `${beginUrl.pathname}${beginUrl.search}`;

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-20 sm:py-24" style={{ background: "var(--midnight)", color: "var(--paper)" }}>
      <div className="flex w-full max-w-xl flex-col">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          {practice.duration}
          {practice.modality ? ` · ${practice.modality}` : ""}
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{practice.title}</h1>

        {sourceEcho && (
          <p className="mt-2 text-base" style={{ color: "var(--text-dim)" }}>
            From{" "}
            <Link
              href={echoDetailHref(sourceEcho.slug)}
              className="underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
            >
              {sourceEcho.name}
            </Link>
          </p>
        )}

        <p className="mt-7 text-lg leading-8" style={{ color: "var(--text-dim)" }}>
          {practice.purpose}
        </p>

        <div className="mt-8 flex flex-col gap-2 rounded-2xl border p-6" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
            What you&apos;ll do
          </p>
          <p className="text-base leading-7" style={{ color: "var(--paper)" }}>
            {practice.narrative}
          </p>
        </div>

        <p className="mt-6 text-base leading-7" style={{ color: "var(--text-dim)" }}>
          <span className="font-semibold" style={{ color: "var(--paper)" }}>
            Why it may help —
          </span>{" "}
          {practice.whyItMattered}
        </p>

        <a
          href={beginHref}
          className="mt-10 self-start rounded-full px-9 py-3.5 text-center text-base font-semibold transition-transform hover:scale-[1.02] hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
        >
          Begin Practice
        </a>
      </div>
    </main>
  );
}

export function generateStaticParams() {
  return listPractices().map((practice) => ({ id: practice.slug }));
}
