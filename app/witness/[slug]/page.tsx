import { notFound } from "next/navigation";
import Link from "next/link";
import OrbReveal from "@/components/OrbReveal";
import { getEchoBySlug, getPracticeBySlug } from "@/lib/content/echo";
import { echoCategoryEyebrow } from "@/lib/onboarding/guide";
import { isPracticeHandoffAvailable } from "@/lib/onboarding/practiceHandoff";
import { createJourneyManifest } from "@/lib/journey/manifest";
import { recoverJourney } from "@/lib/journey/recovery";
import { DISCOVER_HREF } from "@/lib/echo/links";
import { EchoPageShell, ECHO_READING_WIDTH_CLASS } from "@/components/echo/shell/EchoPageShell";
import { GuestJourneyTracker } from "@/components/echo/onboarding/GuestJourneyTracker";

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
  const available = isPracticeHandoffAvailable(practice.slug);

  // recoverJourney's "missing_practice" reason fires exactly when a
  // manifest names a practice (always true here -- notFound() already
  // ran above) that isn't handoff-available -- i.e. recovery is non-null
  // here iff `!available`. Reads that decision instead of the raw
  // boolean below, per lib/journey/recovery.ts.
  const journeyManifest = createJourneyManifest({
    journeyId: invitation ?? practice.slug,
    source: invitation ? "invitation" : "direct",
    entryPoint: "witness",
    invitationId: invitation,
    practiceId: practice.slug,
    cohortId: cohort,
  });
  const recovery = recoverJourney({
    invitationStatus: null,
    manifest: journeyManifest,
    practiceAvailable: available,
    watchFirstAvailable: true,
  });

  return (
    <EchoPageShell layout="plain">
      <GuestJourneyTracker step="practice_intro" intendedPracticeId={practice.slug} />
      <div className={`flex flex-col gap-6 ${ECHO_READING_WIDTH_CLASS.narrow}`}>
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
          className="flex flex-col gap-2 rounded-2xl border p-4"
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

        {!recovery ? (
          <OrbReveal>
            <a
              href={borrowUrl}
              className="mt-2 rounded-full px-8 py-3 text-center text-base font-semibold echo-cta-primary"
              style={{ background: "var(--gold)", color: "var(--midnight)" }}
            >
              Borrow This Practice
            </a>
          </OrbReveal>
        ) : (
          <div className="mt-2 flex flex-col gap-3 rounded-2xl border p-4" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
            <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
              This practice isn&apos;t available to begin on PrometheusK yet — we won&apos;t hand you off to a
              different practice than the one you chose.
            </p>
            <Link
              href={`${DISCOVER_HREF}?view=practices`}
              className="self-start rounded-full px-6 py-2.5 text-center text-sm font-semibold echo-cta-primary"
              style={{ background: "var(--gold)", color: "var(--midnight)" }}
            >
              Explore Practices
            </Link>
          </div>
        )}
      </div>
    </EchoPageShell>
  );
}
