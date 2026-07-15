import { notFound } from "next/navigation";
import OrbReveal from "@/components/OrbReveal";

// RC1 ships exactly one witness experience -- an AvatarK archetype, not
// a real practitioner (no consent/status has been verified for one).
const WITNESS_SLUG = "the-promise-to-myself";

export default async function WitnessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  if (slug !== WITNESS_SLUG) notFound();

  const search = await searchParams;
  const intention = typeof search.intention === "string" ? search.intention : null;
  const invitation = typeof search.invitation === "string" ? search.invitation : null;
  const cohort = typeof search.cohort === "string" ? search.cohort : null;

  // RC5 -- routes through /api/onboarding/begin (a Route Handler, not a
  // direct PrometheusK link) so the onboarding state/nonce can be
  // generated and cookied server-side before the redirect. See
  // docs/RC5_HANDOFF_CONTRACT.md.
  const beginUrl = new URL("/api/onboarding/begin", "https://placeholder.invalid");
  beginUrl.searchParams.set("witness", WITNESS_SLUG);
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
          AvatarK archetype — a demonstration experience
        </p>

        <h1 className="text-2xl font-semibold sm:text-3xl">The promise to myself</h1>

        <p className="text-base leading-7" style={{ color: "var(--text-dim)" }}>
          Someone decides, out loud or just to themselves, that something is
          going to change. For a few days it holds. Then the ordinary week
          comes back — meetings, errands, everything urgent — and the
          decision quietly slips out of view. Nothing dramatic breaks it.
          It just stops being remembered.
        </p>

        <div
          className="flex flex-col gap-2 rounded-md border p-4"
          style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--paper)" }}>
            The practice: a two-minute check-in
          </p>
          <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
            A short, daily return to the decision — not a review, not a
            progress report. Just enough contact to keep it real.
          </p>
        </div>

        <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
          <span className="font-semibold" style={{ color: "var(--paper)" }}>
            Why it mattered:
          </span>{" "}
          good decisions rarely fail all at once — they fade from disuse.
          A tiny, repeated point of contact is often the only thing standing
          between a decision and forgetting it happened.
        </p>

        <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
          <span className="font-semibold" style={{ color: "var(--paper)" }}>
            Estimated time:
          </span>{" "}
          a few quiet minutes — short enough to do before the day pulls you
          elsewhere.
        </p>

        <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
          <span className="font-semibold" style={{ color: "var(--paper)" }}>
            What you may notice:
          </span>{" "}
          how easily something important can go quiet, and how little it
          takes to keep it alive without turning it into one more thing to
          manage.
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
