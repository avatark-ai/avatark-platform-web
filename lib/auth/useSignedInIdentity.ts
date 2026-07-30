"use client";

// Shared client-side "who is signed in, and what do we call them" resolver
// -- used by the Begin page's authenticated state and the header's avatar
// menu so the two never compute a display name differently. Layers a real
// display name (from the profiles table, via the same /api/account/profile
// route the Account page already uses) on top of resolveClientPrincipal's
// bare auth check; falls back to the email's local part, never a
// fabricated name, matching AccountClientGate's own fallback.
import { useEffect, useState } from "react";
import { resolveClientPrincipal } from "./resolveClientPrincipal";

export type SignedInIdentity =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "error"; message: string }
  | { status: "signed_in"; displayName: string; email: string };

export function useSignedInIdentity(): SignedInIdentity {
  const [identity, setIdentity] = useState<SignedInIdentity>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    resolveClientPrincipal().then(async (result) => {
      if (cancelled) return;
      if (result.status === "signed_out") {
        setIdentity({ status: "signed_out" });
        return;
      }
      if (result.status === "error") {
        setIdentity({ status: "error", message: result.message });
        return;
      }

      const fallbackName = result.email.split("@")[0] || "Member";
      try {
        const res = await fetch("/api/account/profile");
        const profile = res.ok ? await res.json() : null;
        if (cancelled) return;
        setIdentity({ status: "signed_in", displayName: profile?.displayName ?? fallbackName, email: result.email });
      } catch {
        if (!cancelled) setIdentity({ status: "signed_in", displayName: fallbackName, email: result.email });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return identity;
}
