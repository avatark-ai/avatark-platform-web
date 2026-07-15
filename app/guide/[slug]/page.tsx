import { notFound } from "next/navigation";
import Link from "next/link";
import { GUIDE, GUIDE_SLUG } from "@/lib/onboarding/guide";
import { WITNESS_SLUG } from "@/lib/onboarding/witness";

export default async function GuidePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  if (slug !== GUIDE_SLUG) notFound();

  const search = await searchParams;
  const intention = typeof search.intention === "string" ? search.intention : null;
  const invitation = typeof search.invitation === "string" ? search.invitation : null;

  const thresholdUrl = new URL(`/witness/${WITNESS_SLUG}`, "https://placeholder.invalid");
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
          AvatarK archetype — a demonstration experience
        </p>

        <h1 className="text-2xl font-semibold sm:text-3xl">Meet your guide</h1>

        <div
          className="flex flex-col gap-2 rounded-md border p-4"
          style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--paper)" }}>
            {GUIDE.archetype}
          </p>
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            {GUIDE.role}
          </p>
        </div>

        <p className="text-base leading-7" style={{ color: "var(--text-dim)" }}>
          {GUIDE.mission}
        </p>

        <p className="text-sm italic leading-6" style={{ color: "var(--text-dim)" }}>
          &ldquo;{GUIDE.giftMessage}&rdquo;
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
