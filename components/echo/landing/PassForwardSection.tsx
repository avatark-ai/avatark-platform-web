import Link from "next/link";
import { CREATE_MY_ECHO_HREF } from "@/lib/echo/links";

const PROGRESSION = ["Your Experience", "Your Practice", "Your Reflection", "Something Worth Sharing", "Another Life Begins"];

export function PassForwardSection({ headline }: { headline: string }) {
  return (
    <section className="border-b" style={{ borderColor: "var(--surface-line)" }}>
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-16 text-center sm:py-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: "var(--paper)" }}>
          {headline}
        </h2>

        <ol className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-medium" style={{ color: "var(--paper)" }}>
          {PROGRESSION.map((stage, index) => (
            <li key={stage} className="flex items-center gap-3">
              <span className="rounded-full border px-3 py-1" style={{ borderColor: "var(--surface-line)" }}>
                {stage}
              </span>
              {index < PROGRESSION.length - 1 && (
                <span aria-hidden="true" style={{ color: "var(--gold)" }}>
                  →
                </span>
              )}
            </li>
          ))}
        </ol>

        <Link
          href={CREATE_MY_ECHO_HREF}
          className="mt-8 rounded-md px-8 py-3 text-center text-base font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
        >
          Contribute to My Echo
        </Link>
      </div>
    </section>
  );
}
