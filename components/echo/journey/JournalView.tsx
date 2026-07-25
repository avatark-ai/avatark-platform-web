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

const EMPTY_COPY: Record<Filter, { title: string; body: string }> = {
  all: {
    title: "Your journal starts with a single line.",
    body: "As you practice, watch, and decide what to carry forward, each of those moments gathers here — a record, never a report card.",
  },
  practices: {
    title: "Practice reflections appear after you complete one.",
    body: `What you noticed during a practice, verified by ${PROMETHEUSK_DISPLAY_NAME}, shows up here.`,
  },
  stories: {
    title: "Story reflections appear after you watch one.",
    body: "What a story left you thinking about will collect here once you've watched one.",
  },
  decisions: {
    title: "Decision notes are yours to keep.",
    body: "A place for the small calls that came out of a practice — nothing here is shared unless you choose to.",
  },
  contributions: {
    title: "What you pass forward shows up here.",
    body: "When something you've learned becomes useful enough to share, it appears in this filter too.",
  },
};

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
    <div className="flex flex-col">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
        Journal
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Your journal</h1>
      <p className="mt-2 max-w-md text-lg leading-8" style={{ color: "var(--text-dim)" }}>
        Written reflections happen during your practice on {PROMETHEUSK_DISPLAY_NAME}. This page collects what
        actually happened.
      </p>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter journal entries">
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

      <div className="mt-8">
        {visible.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {visible.map((entry) => (
              <li key={entry.id} className="rounded-2xl border p-5" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--gold)" }}>
                  {new Date(entry.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
                <p className="mt-1.5 text-base leading-7" style={{ color: "var(--paper)" }}>
                  {entry.body}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border p-6" style={{ borderColor: "var(--surface-line)", background: "var(--surface)" }}>
            <p className="text-base font-semibold" style={{ color: "var(--paper)" }}>
              {EMPTY_COPY[filter].title}
            </p>
            <p className="mt-1.5 text-sm leading-6" style={{ color: "var(--text-dim)" }}>
              {EMPTY_COPY[filter].body}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function JournalPage() {
  const { context } = useJourneySession();
  return <JournalView context={context} />;
}
