import Link from "next/link";
import type { EchoRecord } from "@/lib/content/echo";
import { echoDetailHref } from "@/lib/echo/links";

export function EchoCard({ echo }: { echo: EchoRecord }) {
  return (
    <Link
      href={echoDetailHref(echo.slug)}
      className="group flex flex-col gap-3 rounded-2xl border p-6 transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface)", outlineColor: "var(--gold)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
        {echo.category}
      </p>
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold" style={{ color: "var(--paper)" }}>
          {echo.name}
        </p>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          {echo.role}
        </p>
      </div>
      <p className="line-clamp-2 text-sm leading-6" style={{ color: "var(--text-dim)" }}>
        {echo.mission}
      </p>
      <p
        className="mt-1 flex items-center gap-1.5 text-sm font-semibold transition-transform group-hover:translate-x-0.5"
        style={{ color: "var(--gold)" }}
      >
        Meet this Echo
        <span aria-hidden="true">→</span>
      </p>
    </Link>
  );
}
