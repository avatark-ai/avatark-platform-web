import Link from "next/link";
import { COMMUNITY_HREF } from "@/lib/echo/links";

const EXAMPLES = ["A challenge to try a practice for a week", "A cohort moving through the same threshold", "A community witnessing each other's practice"];

export function CommunityBridgeSection({ headline }: { headline: string }) {
  return (
    <section className="border-b" style={{ borderColor: "var(--surface-line)" }}>
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--paper)" }}>
          {headline}
        </h2>

        <ul className="mt-8 flex flex-col gap-2 text-base leading-7" style={{ color: "var(--text-dim)" }}>
          {EXAMPLES.map((example) => (
            <li key={example}>{example}</li>
          ))}
        </ul>

        <Link
          href={COMMUNITY_HREF}
          className="mt-8 rounded-md px-8 py-3 text-center text-base font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
        >
          Explore Community
        </Link>

        <p className="mt-4 text-xs uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Powered by ArenaK
        </p>
      </div>
    </section>
  );
}
