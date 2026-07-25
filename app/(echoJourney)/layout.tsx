"use client";

// Shared auth gate for /today, /my/echo, /my/echo/living-preview and
// /my/journal -- reuses the same JourneySessionProvider (and its real,
// already-verified session/journey-context fetching) that /journey/* has
// used since RC5, just without that route's own in-page tab strip: Echo's
// primary nav (EchoHeader's "My Journey" menu, EchoBottomNav) already
// covers navigation between these pages.
import { Suspense, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { JourneySessionProvider, useJourneySession } from "@/lib/journey/session";

// A shape-matched skeleton (eyebrow, heading, one card) rather than a bare
// "Loading…" line -- animate-pulse is neutralized under
// prefers-reduced-motion by the global rule in app/globals.css.
function LoadingShell() {
  return (
    <main className="flex flex-1 flex-col px-6 py-20 sm:py-24" role="status" aria-label="Loading your journey">
      <div className="mx-auto flex w-full max-w-lg animate-pulse flex-col gap-6">
        <div className="h-3 w-16 rounded-full" style={{ background: "var(--surface-line)" }} />
        <div className="h-8 w-2/3 rounded-full" style={{ background: "var(--surface-line)" }} />
        <div className="mt-4 h-32 rounded-2xl" style={{ background: "var(--surface)" }} />
      </div>
    </main>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { principal } = useJourneySession();

  useEffect(() => {
    if (principal.status !== "signed_out") return;
    const search = typeof window !== "undefined" ? window.location.search : "";
    router.replace(`/auth/sign-in?return=${encodeURIComponent(pathname + search)}`);
  }, [principal.status, pathname, router]);

  if (principal.status === "loading" || principal.status === "signed_out") return <LoadingShell />;

  if (principal.status === "error") {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-20" style={{ background: "var(--midnight)", color: "var(--paper)" }}>
        <div className="space-y-2 text-center">
          <p className="text-sm" role="alert">
            Couldn&apos;t load your journey: {principal.message}
          </p>
          <button onClick={() => window.location.reload()} className="text-sm underline">
            Try again
          </button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

export default function EchoJourneyLayout({ children }: { children: ReactNode }) {
  return (
    <JourneySessionProvider>
      <Suspense fallback={<LoadingShell />}>
        <AuthGate>{children}</AuthGate>
      </Suspense>
    </JourneySessionProvider>
  );
}
