import Link from "next/link";
import type { EchoRecord } from "@/lib/content/echo";
import { echoDetailHref } from "@/lib/echo/links";

export function EchoCard({ echo }: { echo: EchoRecord }) {
  return (
    <Link
      href={echoDetailHref(echo.slug)}
      className="flex flex-col gap-2 rounded-md border p-5 transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface)", outlineColor: "var(--gold)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
        {echo.category}
      </p>
      <p className="text-base font-semibold" style={{ color: "var(--paper)" }}>
        {echo.name}
      </p>
      <p className="text-sm" style={{ color: "var(--text-dim)" }}>
        {echo.role}
      </p>
      <p className="line-clamp-2 text-sm leading-6" style={{ color: "var(--text-dim)" }}>
        {echo.mission}
      </p>
    </Link>
  );
}
