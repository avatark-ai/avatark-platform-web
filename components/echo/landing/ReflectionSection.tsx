import Link from "next/link";
import { MY_ECHO_HREF } from "@/lib/echo/links";

export function ReflectionSection({ headline }: { headline: string }) {
  return (
    <section className="border-b" style={{ borderColor: "var(--surface-line)" }}>
      <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--paper)" }}>
          {headline}
        </h2>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-md border p-5" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
              Illustrative preview · Reflection
            </p>
            <p className="text-sm leading-6" style={{ color: "var(--paper)" }}>
              &ldquo;Noticed I keep coming back to the same decision. This time I actually sat with it instead of rushing past.&rdquo;
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-md border p-5" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
              Illustrative preview · Emerging pattern
            </p>
            <p className="text-sm leading-6" style={{ color: "var(--paper)" }}>
              A pattern may be forming: you have returned to this theme a few times this month. This is an observation, not a diagnosis.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href={MY_ECHO_HREF}
            className="text-sm font-semibold underline underline-offset-4 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: "var(--gold)", outlineColor: "var(--gold)" }}
          >
            View My Echo
          </Link>
        </div>
      </div>
    </section>
  );
}
