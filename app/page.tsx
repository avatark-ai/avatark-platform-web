import Link from "next/link";
import { getProductById } from "@avatark/product-registry";
import { resolveProductUrl } from "@/lib/products/registry";
import { getActivityCards } from "@/lib/activities/registry";
import { ActivityCard } from "@/components/ActivityCard";
import { HomeContinuity } from "@/components/HomeContinuity";

// Migrated off the old hardcoded literal per docs/ARCHITECTURE_INDEX_V1.md's
// P1 item: resolved through the registry so PrometheusK's domain changing
// doesn't require a landing-page edit. This is PrometheusK's own
// low-commitment preview route -- unrelated to the "Watch" Activity card
// below (StreamK), which is why its copy says "sample practice", not
// "Watch".
function watchFirstHref(): string | null {
  const prometheusk = getProductById("prometheusk");
  if (!prometheusk) return null;
  const domain = resolveProductUrl(prometheusk);
  return domain ? `${domain}/watch-first` : null;
}

export default function Home() {
  const activities = getActivityCards();
  const watchFirst = watchFirstHref();

  return (
    <main
      className="flex flex-1 flex-col items-center px-6 py-16"
      style={{ background: "var(--midnight)", color: "var(--paper)" }}
    >
      <div className="flex w-full max-w-4xl flex-col gap-10">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Explore, practice, connect, or watch.
          </h1>
          <p className="max-w-xl text-base leading-7" style={{ color: "var(--text-dim)" }}>
            Pick what fits right now. AvatarK carries your account and progress underneath,
            wherever you go next.
          </p>
        </div>

        <HomeContinuity />

        <div className="grid gap-6 sm:grid-cols-2">
          {activities.map((card) => (
            <ActivityCard key={card.id} card={card} />
          ))}
        </div>

        <div
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm"
          style={{ color: "var(--text-dim)" }}
        >
          {watchFirst && (
            <a href={watchFirst} className="underline-offset-4 hover:underline hover:text-[var(--paper)]">
              Watch a sample practice first
            </a>
          )}
          <Link href="/enter" className="underline-offset-4 hover:underline hover:text-[var(--paper)]">
            Enter an Invitation
          </Link>
        </div>
      </div>
    </main>
  );
}
