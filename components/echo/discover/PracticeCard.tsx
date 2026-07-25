import Link from "next/link";
import type { PracticeRecord } from "@/lib/content/echo";
import { practiceDetailHref } from "@/lib/echo/links";

export function PracticeCard({ practice }: { practice: PracticeRecord }) {
  return (
    <Link
      href={practiceDetailHref(practice.slug)}
      className="flex flex-col gap-2 rounded-md border p-5 transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface)", outlineColor: "var(--gold)" }}
    >
      <p className="text-base font-semibold" style={{ color: "var(--paper)" }}>
        {practice.title}
      </p>
      <p className="line-clamp-2 text-sm leading-6" style={{ color: "var(--text-dim)" }}>
        {practice.purpose}
      </p>
      <p className="text-xs uppercase tracking-wide" style={{ color: "var(--gold)" }}>
        {practice.duration}
        {practice.modality ? ` · ${practice.modality}` : ""}
      </p>
    </Link>
  );
}
