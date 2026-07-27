import Link from "next/link";
import { COMMUNITY_HREF } from "@/lib/echo/links";

const EXAMPLES = ["A challenge to try a practice for a week", "A cohort moving through the same threshold", "A community witnessing each other's practice"];

export function CommunityBridgeSection({ headline }: { headline: string }) {
  return (
    <section>
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center sm:py-24">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: "var(--paper)" }}>
          {headline}
        </h2>

        <ul className="mt-8 flex flex-col gap-2.5 text-lg leading-8" style={{ color: "var(--text-dim)" }}>
          {EXAMPLES.map((example) => (
            <li key={example}>{example}</li>
          ))}
        </ul>

        <Link
          href={COMMUNITY_HREF}
          className="mt-10 rounded-full px-8 py-3.5 text-center text-base font-semibold echo-cta-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
        >
          Explore Community
        </Link>

        <p className="mt-5 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
          Powered by ArenaK
        </p>
      </div>
    </section>
  );
}
