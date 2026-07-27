import Link from "next/link";
import { MY_ECHO_HREF } from "@/lib/echo/links";

export function ReflectionSection({ headline }: { headline: string }) {
  return (
    <section>
      <div className="mx-auto max-w-4xl px-6 py-20 sm:py-24">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: "var(--paper)" }}>
          {headline}
        </h2>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-2xl border p-6" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
              Illustrative preview · Reflection
            </p>
            <p className="text-base leading-7" style={{ color: "var(--paper)" }}>
              &ldquo;Noticed I keep coming back to the same decision. This time I actually sat with it instead of rushing past.&rdquo;
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border p-6" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
              Illustrative preview · Emerging pattern
            </p>
            <p className="text-base leading-7" style={{ color: "var(--paper)" }}>
              A pattern may be forming: you have returned to this theme a few times this month. This is an observation, not a diagnosis.
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            href={MY_ECHO_HREF}
            className="text-sm font-semibold link-underline-draw focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
          >
            View My Echo
          </Link>
        </div>
      </div>
    </section>
  );
}
