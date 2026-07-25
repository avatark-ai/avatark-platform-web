"use client";

import { useState } from "react";
import { useJourneySession } from "@/lib/journey/session";
import { PRACTICE_LABEL } from "@/lib/onboarding/witness";
import { PROMETHEUSK_DISPLAY_NAME } from "@/lib/onboarding/prometheusk";
import type { JourneyContext } from "@/lib/journey/state";

type Filter = "all" | "practices" | "stories" | "decisions" | "contributions";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "practices", label: "Practices" },
  { id: "stories", label: "Stories" },
  { id: "decisions", label: "Decisions" },
  { id: "contributions", label: "Contributions" },
];

interface JournalEntry {
  id: string;
  category: Exclude<Filter, "all">;
  date: string;
  body: string;
}

function buildEntries(context: JourneyContext): JournalEntry[] {
  const entries: JournalEntry[] = [];
  if (context.practiceCompletedAt) {
    entries.push({
      id: "practice-completed",
      category: "practices",
      date: context.practiceCompletedAt,
      body: `Completed ${PRACTICE_LABEL}, verified by ${PROMETHEUSK_DISPLAY_NAME}.`,
    });
  }
  return entries;
}

export function JournalView({ context }: { context: JourneyContext }) {
  const [filter, setFilter] = useState<Filter>("all");
  const entries = buildEntries(context);
  const visible = filter === "all" ? entries : entries.filter((entry) => entry.category === filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
          Journal
        </p>
        <h1 className="text-2xl font-semibold sm:text-3xl">Your journal</h1>
        <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
          Written reflections happen during your practice on {PROMETHEUSK_DISPLAY_NAME}. This page collects what this
          repo can confirm actually happened.
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter journal entries">
        {FILTERS.map((option) => {
          const active = option.id === filter;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              aria-pressed={active}
              className="shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                borderColor: active ? "var(--gold)" : "var(--surface-line)",
                background: active ? "var(--gold)" : "transparent",
                color: active ? "var(--midnight)" : "var(--paper)",
                outlineColor: "var(--gold)",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {visible.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {visible.map((entry) => (
            <li key={entry.id} className="rounded-md border p-4 text-sm" style={{ borderColor: "var(--surface-line)", background: "var(--surface)", color: "var(--paper)" }}>
              <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>
                {new Date(entry.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
              <p className="mt-1">{entry.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Nothing here yet.
        </p>
      )}
    </div>
  );
}

export function JournalPage() {
  const { context } = useJourneySession();
  return <JournalView context={context} />;
}
