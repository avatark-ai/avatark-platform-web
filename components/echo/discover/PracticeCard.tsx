import Link from "next/link";
import type { PracticeRecord } from "@/lib/content/echo";
import { practiceDetailHref } from "@/lib/echo/links";

export function PracticeCard({ practice }: { practice: PracticeRecord }) {
  return (
    <Link
      href={practiceDetailHref(practice.slug)}
      className="group flex flex-col gap-3 rounded-2xl border p-6 transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ borderColor: "var(--surface-line)", background: "var(--surface)", outlineColor: "var(--gold)" }}
    >
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--gold)" }}>
        {practice.duration}
        {practice.modality ? ` · ${practice.modality}` : ""}
      </p>
      <p className="text-lg font-semibold" style={{ color: "var(--paper)" }}>
        {practice.title}
      </p>
      <p className="line-clamp-2 text-sm leading-6" style={{ color: "var(--text-dim)" }}>
        {practice.purpose}
      </p>
      <p
        className="mt-1 flex items-center gap-1.5 text-sm font-semibold transition-transform group-hover:translate-x-0.5"
        style={{ color: "var(--gold)" }}
      >
        Begin this practice
        <span aria-hidden="true">→</span>
      </p>
    </Link>
  );
}
