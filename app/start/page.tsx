"use client";

import { useRouter } from "next/navigation";
import { INTENTIONS, type IntentionId } from "@/lib/onboarding/intentions";

const WITNESS_SLUG = "the-promise-to-myself";

export default function StartPage() {
  const router = useRouter();

  function choose(id: IntentionId) {
    router.push(`/witness/${WITNESS_SLUG}?intention=${id}`);
  }

  return (
    <main
      className="flex flex-1 flex-col items-center justify-center px-6 py-20"
      style={{ background: "var(--midnight)", color: "var(--paper)" }}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        <h1 className="text-2xl font-semibold sm:text-3xl">Which feels most true today?</h1>

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
      </div>
    </main>
  );
}
