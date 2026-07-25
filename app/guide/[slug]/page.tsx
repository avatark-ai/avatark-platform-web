import { notFound } from "next/navigation";
import Link from "next/link";
import { echoCategoryEyebrow, getGuide } from "@/lib/onboarding/guide";
import { listPracticesByEcho, pickPracticeForIntention } from "@/lib/content/echo";

export default async function GuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const search = await searchParams;
  const intention = typeof search.intention === "string" ? search.intention : null;
  const invitation = typeof search.invitation === "string" ? search.invitation : null;

  // Any practice sourced from this Echo, matched on intention where
  // possible -- falls back to any practice at all so a guide with no
  // practice of its own still has somewhere to send the visitor next.
  const echoPractices = listPracticesByEcho(slug);
  const intentionMatch = intention
    ? echoPractices.find((practice) => practice.themes.includes(intention))
    : undefined;
  const nextPractice = intentionMatch ?? echoPractices[0] ?? pickPracticeForIntention(intention);
  const thresholdUrl = new URL(`/witness/${nextPractice?.slug ?? ""}`, "https://placeholder.invalid");
  if (intention) thresholdUrl.searchParams.set("intention", intention);
  if (invitation) thresholdUrl.searchParams.set("invitation", invitation);
  const thresholdHref = `${thresholdUrl.pathname}${thresholdUrl.search}`;

  return (
    <main
      className="flex flex-1 flex-col items-center px-6 py-16"
      style={{ background: "var(--midnight)", color: "var(--paper)" }}
    >
      <div className="flex w-full max-w-lg flex-col gap-6">
        <p
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--gold)" }}
        >
          {echoCategoryEyebrow(guide.category)}
        </p>

        <h1 className="text-2xl font-semibold sm:text-3xl">Meet your guide</h1>

        <div
          className="flex flex-col gap-2 rounded-md border p-4"
          style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--paper)" }}>
            {guide.archetype}
          </p>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            {guide.role}
          </p>
        </div>

        <p className="text-base leading-7" style={{ color: "var(--text-dim)" }}>
          {guide.mission}
        </p>

        <p className="text-sm italic leading-6" style={{ color: "var(--text-dim)" }}>
          &ldquo;{guide.giftMessage}&rdquo;
        </p>

        <Link
          href={thresholdHref}
          className="mt-2 rounded-md px-8 py-3 text-center text-base font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--gold)", color: "var(--midnight)" }}
        >
          Continue to the threshold
        </Link>
      </div>
    </main>
  );
}
