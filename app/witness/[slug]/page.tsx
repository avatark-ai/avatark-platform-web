import { notFound } from "next/navigation";
import OrbReveal from "@/components/OrbReveal";
import { getEchoBySlug, getPracticeBySlug } from "@/lib/content/echo";
import { echoCategoryEyebrow } from "@/lib/onboarding/guide";

export default async function WitnessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const practice = getPracticeBySlug(slug);
  if (!practice) notFound();
  const sourceEcho = getEchoBySlug(practice.sourceEcho);

  const search = await searchParams;
  const intention = typeof search.intention === "string" ? search.intention : null;
  const invitation = typeof search.invitation === "string" ? search.invitation : null;
  const cohort = typeof search.cohort === "string" ? search.cohort : null;

  // RC5 -- routes through /api/onboarding/begin (a Route Handler, not a
  // direct PrometheusK link) so the onboarding state/nonce can be
  // generated and cookied server-side before the redirect. See
  // docs/RC5_HANDOFF_CONTRACT.md.
  const beginUrl = new URL("/api/onboarding/begin", "https://placeholder.invalid");
  beginUrl.searchParams.set("witness", practice.slug);
  if (intention) beginUrl.searchParams.set("intention", intention);
  if (invitation) beginUrl.searchParams.set("invitation", invitation);
  if (cohort) beginUrl.searchParams.set("cohort", cohort);
  const borrowUrl = `${beginUrl.pathname}${beginUrl.search}`;

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
          {echoCategoryEyebrow(sourceEcho?.category ?? "archetype")}
        </p>

        <h1 className="text-2xl font-semibold sm:text-3xl">{practice.witnessLabel}</h1>

        <p className="text-base leading-7" style={{ color: "var(--text-dim)" }}>
          {practice.narrative}
        </p>

        <div
          className="flex flex-col gap-2 rounded-md border p-4"
          style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--paper)" }}>
            The practice: {practice.title}
          </p>
          <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
            {practice.purpose}
          </p>
        </div>

        <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
          <span className="font-semibold" style={{ color: "var(--paper)" }}>
            Why it mattered:
          </span>{" "}
          {practice.whyItMattered}
        </p>

        <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
          <span className="font-semibold" style={{ color: "var(--paper)" }}>
            Estimated time:
          </span>{" "}
          {practice.duration}
        </p>

        <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
          <span className="font-semibold" style={{ color: "var(--paper)" }}>
            What you may notice:
          </span>{" "}
          {practice.whatYouMayNotice}
        </p>

        <OrbReveal>
          <a
            href={borrowUrl}
            className="mt-2 rounded-md px-8 py-3 text-center text-base font-semibold transition-opacity hover:opacity-90"
            style={{ background: "var(--gold)", color: "var(--midnight)" }}
          >
            Borrow This Practice
          </a>
        </OrbReveal>
      </div>
    </main>
  );
}
