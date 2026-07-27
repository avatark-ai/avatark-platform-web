"use client";

import { useState } from "react";
import Link from "next/link";
import { COMMUNITY_HREF, WATCH_FIRST_HREF, practiceDetailHref } from "@/lib/echo/links";

const THEMES = ["Change", "Leadership", "Work", "Family", "Health", "Creation"] as const;
type Theme = (typeof THEMES)[number];

const BEGINNINGS = [
  { id: "practice", label: "A short guided practice" },
  { id: "story", label: "A story from another life" },
  { id: "question", label: "A question to reflect on" },
  { id: "challenge", label: "A community challenge" },
] as const;
type Beginning = (typeof BEGINNINGS)[number]["id"];

function resolvePath(beginning: Beginning, practiceSlug: string): { label: string; action: string; href: string } {
  switch (beginning) {
    case "story":
      return { label: "Watch", action: "Watch First", href: WATCH_FIRST_HREF };
    case "challenge":
      return { label: "Community", action: "Explore Community", href: COMMUNITY_HREF };
    case "question":
      return { label: "Reflect", action: "Begin the Practice", href: practiceDetailHref(practiceSlug) };
    case "practice":
    default:
      return { label: "Practice", action: "Begin the Practice", href: practiceDetailHref(practiceSlug) };
  }
}

export function EchoCreationFlow({ themePracticeMap }: { themePracticeMap: Record<Theme, string> }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [note, setNote] = useState("");
  const [beginning, setBeginning] = useState<Beginning | null>(null);

  if (step === 1) {
    return (
      <div className="flex w-full max-w-xl flex-col items-start gap-7">
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Step 1 of 3
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">What are you navigating now?</h1>

        <ul className="flex w-full flex-wrap gap-3">
          {THEMES.map((option) => (
            <li key={option}>
              <button
                type="button"
                onClick={() => setTheme(option)}
                aria-pressed={theme === option}
                className="rounded-full border px-5 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  borderColor: theme === option ? "var(--gold)" : "var(--surface-line)",
                  background: theme === option ? "var(--gold)" : "transparent",
                  color: theme === option ? "var(--midnight)" : "var(--paper)",
                  outlineColor: "var(--gold)",
                }}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex w-full flex-col gap-2 text-left">
          <label htmlFor="echo-create-note" className="text-sm" style={{ color: "var(--text-dim)" }}>
            Say more, if you&apos;d like. This stays with you — nothing here is saved yet.
          </label>
          <textarea
            id="echo-create-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="w-full rounded-xl border px-4 py-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: "var(--surface-line)", background: "var(--surface)", color: "var(--paper)", outlineColor: "var(--gold)" }}
          />
        </div>

        <button
          type="button"
          disabled={!theme}
          onClick={() => setStep(2)}
          className="self-start rounded-full px-8 py-3 text-center text-base font-semibold transition-transform hover:scale-[1.02] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
        >
          Continue
        </button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="flex w-full max-w-xl flex-col items-start gap-7">
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Step 2 of 3
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">What kind of beginning would help?</h1>

        <ul className="flex w-full flex-col gap-3">
          {BEGINNINGS.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => {
                  setBeginning(option.id);
                  setStep(3);
                }}
                className="w-full rounded-2xl border px-6 py-4 text-left text-base transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ borderColor: "var(--surface-line)", background: "var(--surface)", color: "var(--paper)", outlineColor: "var(--gold)" }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const practiceSlug = theme ? themePracticeMap[theme] : Object.values(themePracticeMap)[0];
  const path = resolvePath(beginning ?? "practice", practiceSlug);

  return (
    <div className="flex w-full max-w-xl flex-col items-start gap-7">
      <p className="text-sm" style={{ color: "var(--text-dim)" }}>
        Step 3 of 3
      </p>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Here&apos;s where to begin.</h1>
      <p className="text-lg leading-8" style={{ color: "var(--text-dim)" }}>
        Based on what you named, we suggest starting with: <span style={{ color: "var(--paper)" }}>{path.label}</span>
      </p>
      <Link
        href={path.href}
        className="rounded-full px-9 py-3.5 text-center text-base font-semibold transition-transform hover:scale-[1.02] hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
      >
        Begin My Journey
      </Link>
    </div>
  );
}
