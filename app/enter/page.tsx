"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// RC6A -- fixes the homepage "Enter an Invitation" CTA, which linked to
// bare /enter with no page. Does not duplicate /enter/[token]'s
// redirect logic: this form collects the code, then hands off to that
// already-approved route (docs/INVITATION_MIGRATION.md) for the actual
// routing decision. No validation against any database here or there --
// any non-empty code is accepted and carried forward purely as
// attribution, same honesty standard as /enter/[token].
function EnterInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intention = searchParams.get("intention");

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter the code from your invitation to continue.");
      return;
    }
    const url = new URL(`/enter/${encodeURIComponent(trimmed)}`, "https://placeholder.invalid");
    if (intention) url.searchParams.set("intention", intention);
    router.push(`${url.pathname}${url.search}`);
  }

  return (
    <main
      className="flex flex-1 flex-col items-center px-6 py-16"
      style={{ background: "var(--midnight)", color: "var(--paper)" }}
    >
      <div className="flex w-full max-w-md flex-col gap-6">
        <p
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--gold)" }}
        >
          ECHO
        </p>

        <h1 className="text-2xl font-semibold sm:text-3xl">Enter an invitation</h1>

        <p className="text-base leading-7" style={{ color: "var(--text-dim)" }}>
          An invitation connects you to an Echo, practice, cohort, event or
          story — someone passed this along, meant for you specifically.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label htmlFor="invitation-code" className="text-sm font-semibold">
            Invitation code
          </label>
          <input
            id="invitation-code"
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Paste or type your code"
            className="w-full rounded-md border px-4 py-3 text-base"
            style={{
              borderColor: "var(--surface-line)",
              background: "var(--surface)",
              color: "var(--paper)",
            }}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? "invitation-code-error" : undefined}
          />
          {error && (
            <p id="invitation-code-error" className="text-sm" style={{ color: "var(--gold)" }} role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="mt-2 rounded-md px-8 py-3 text-center text-base font-semibold transition-opacity hover:opacity-90"
            style={{ background: "var(--gold)", color: "var(--midnight)" }}
          >
            Continue
          </button>
        </form>

        <p className="text-sm leading-6" style={{ color: "var(--text-dim)" }}>
          Don&apos;t have a code?{" "}
          <a href="/start" className="underline underline-offset-4 hover:no-underline">
            Begin with an Echo
          </a>{" "}
          instead.
        </p>
      </div>
    </main>
  );
}

export default function EnterInvitationPage() {
  return (
    <Suspense fallback={null}>
      <EnterInvitationForm />
    </Suspense>
  );
}
