import Link from "next/link";
import type { ActivityCard as ActivityCardData } from "@/lib/activities/registry";

// One of the four primary intent cards on the AvatarK home. Order of
// information is deliberate: the human intent leads, the destination
// product is secondary, and availability is always honest -- never
// fabricated.
export function ActivityCard({ card }: { card: ActivityCardData }) {
  const isExternal = card.href?.startsWith("http") ?? false;
  const disabled = card.availability === "coming_soon";

  return (
    <div
      id={card.id}
      className="flex flex-col gap-4 rounded-lg border p-6"
      style={{ borderColor: "var(--surface-line)", background: "color-mix(in srgb, var(--paper) 4%, transparent)" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: "var(--paper)" }}>
          {card.label}
        </h2>
        {card.availability === "beta" && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--gold)", border: "1px solid var(--gold)" }}
          >
            Beta
          </span>
        )}
        {disabled && (
          <span className="text-xs font-medium" style={{ color: "var(--text-dim)" }}>
            Coming soon
          </span>
        )}
      </div>

      <p className="text-base" style={{ color: "var(--paper)" }}>
        {card.intent}
      </p>
      <p className="text-sm" style={{ color: "var(--text-dim)" }}>
        {card.value}
      </p>

      {disabled ? (
        <span
          aria-disabled="true"
          className="mt-auto self-start rounded-md px-4 py-2 text-sm font-semibold"
          style={{ border: "1px solid var(--surface-line)", color: "var(--text-dim)" }}
        >
          Not available yet
        </span>
      ) : isExternal ? (
        <a
          href={card.href!}
          className="mt-auto self-start rounded-full px-4 py-2 text-sm font-semibold echo-cta-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
        >
          {card.ctaLabel}
        </a>
      ) : (
        <Link
          href={card.href!}
          className="mt-auto self-start rounded-full px-4 py-2 text-sm font-semibold echo-cta-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
        >
          {card.ctaLabel}
        </Link>
      )}
    </div>
  );
}
