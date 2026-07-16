"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INTENTIONS, type IntentionId } from "@/lib/onboarding/intentions";

const WITNESS_SLUG = "the-promise-to-myself";

// RC6A.1 -- a brief on-page transition so choosing an option feels
// connected to what comes next, without touching the witness flow or
// its routing contract: the destination and query params are
// unchanged, only this page pauses a moment on its own copy before
// navigating.
const TRANSITION_DELAY_MS = 700;

export default function StartPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<IntentionId | null>(null);

  function choose(id: IntentionId) {
    setSelected(id);
    setTimeout(() => {
      router.push(`/witness/${WITNESS_SLUG}?intention=${id}`);
    }, TRANSITION_DELAY_MS);
  }

  if (selected) {
    const chosen = INTENTIONS.find((intention) => intention.id === selected);
    return (
      <main
        className="flex flex-1 flex-col items-center justify-center px-6 py-20"
        style={{ background: "var(--midnight)", color: "var(--paper)" }}
      >
        <div className="flex w-full max-w-md flex-col items-center gap-4 text-center" aria-live="polite">
          <p className="text-lg leading-7">
            Based on what you selected — &ldquo;{chosen?.label}&rdquo; — here&apos;s where to begin.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex flex-1 flex-col items-center justify-center px-6 py-20"
      style={{ background: "var(--midnight)", color: "var(--paper)" }}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>
            Every Echo begins with where you are today.
          </p>
          <h1 className="text-2xl font-semibold sm:text-3xl">Which feels most true today?</h1>
        </div>

        <ul className="flex w-full flex-col gap-3">
          {INTENTIONS.map((intention) => (
            <li key={intention.id}>
              <button
                type="button"
                onClick={() => choose(intention.id)}
                className="w-full rounded-md border px-6 py-3 text-left text-base transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
    </main>
  );
}
