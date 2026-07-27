"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INTENTIONS, type IntentionId } from "@/lib/onboarding/intentions";
import { EchoPageShell, ECHO_READING_WIDTH_CLASS } from "@/components/echo/shell/EchoPageShell";

// A brief on-page transition so choosing an option feels connected to
// what comes next -- inherited unchanged from the previous /start page.
const TRANSITION_DELAY_MS = 700;

// intentionPracticeMap resolves each intention to a real practice slug
// (via lib/content/echo.ts's pickPracticeForIntention, computed server-side
// since that reader is fs-based) -- computed once by the server page and
// passed down here so adding a second practice narrows these matches
// automatically, without this component needing to change.
export function IntentionPicker({ intentionPracticeMap }: { intentionPracticeMap: Record<IntentionId, string> }) {
  const router = useRouter();
  const [selected, setSelected] = useState<IntentionId | null>(null);

  function choose(id: IntentionId) {
    setSelected(id);
    setTimeout(() => {
      router.push(`/witness/${intentionPracticeMap[id]}?intention=${id}`);
    }, TRANSITION_DELAY_MS);
  }

  if (selected) {
    const chosen = INTENTIONS.find((intention) => intention.id === selected);
    return (
      <EchoPageShell layout="plain">
        <div className={`flex flex-col gap-4 ${ECHO_READING_WIDTH_CLASS.narrow}`} aria-live="polite">
          <p className="text-lg leading-7">
            Based on what you selected — &ldquo;{chosen?.label}&rdquo; — here&apos;s where to begin.
          </p>
        </div>
      </EchoPageShell>
    );
  }

  return (
    <EchoPageShell layout="plain">
      <div className={`flex flex-col gap-6 ${ECHO_READING_WIDTH_CLASS.narrow}`}>
        <div className="flex flex-col gap-2">
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            Every Echo begins with where you are today.
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Which feels most true today?</h1>
        </div>

        <ul className="flex w-full flex-col gap-3">
          {INTENTIONS.map((intention) => (
            <li key={intention.id}>
              <button
                type="button"
                onClick={() => choose(intention.id)}
                className="w-full rounded-2xl border px-6 py-3 text-left text-base transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  borderColor: "var(--surface-line)",
                  background: "var(--surface)",
                  color: "var(--paper)",
                  outlineColor: "var(--gold)",
                }}
              >
                {intention.label}
              </button>
            </li>
          ))}
        </ul>

        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          We&apos;ll recommend a starting practice. You can always change later.
        </p>
      </div>
    </EchoPageShell>
  );
}
