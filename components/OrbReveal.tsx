"use client";

import { useState, type ReactNode } from "react";

// The Orb -- a small ritual gesture between reading the Threshold
// practice and committing to Borrow it. Native to Platform; no
// relation to legacy avatark-web's EchoReceiveGate, which gates a
// different (historical) product -- see docs/INVITATION_MIGRATION.md.
export default function OrbReveal({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) return <>{children}</>;

  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      className="mt-2 flex flex-col items-center gap-3 self-start text-sm"
      style={{ color: "var(--text-dim)" }}
    >
      <span
        className="h-12 w-12 rounded-full border transition-transform hover:scale-105"
        style={{ borderColor: "var(--gold)", background: "color-mix(in srgb, var(--gold) 12%, transparent)" }}
        aria-hidden
      />
      Ready to carry this forward?
    </button>
  );
}
