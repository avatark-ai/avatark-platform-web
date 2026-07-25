"use client";

// Restrained four-item bottom nav for signed-in mobile visitors. Hidden
// while the mobile menu is open (shared state via EchoShellState), and
// EchoShell already keeps it off institutional/admin paths entirely.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { resolveClientPrincipal, type ClientPrincipalResult } from "@/lib/auth/resolveClientPrincipal";
import { DISCOVER_HREF, MY_ECHO_HREF, TODAY_HREF } from "@/lib/echo/links";
import { useEchoMobileMenu } from "./EchoShellState";

const ITEMS = [
  { label: "Today", href: TODAY_HREF },
  { label: "Discover", href: DISCOVER_HREF },
  { label: "Practice", href: `${DISCOVER_HREF}#practices` },
  { label: "Echo", href: MY_ECHO_HREF },
] as const;

// The public landing page is the one Echo route this nav must never
// appear on even for a signed-in visitor revisiting it.
const HIDDEN_PATHS = new Set(["/"]);

export function EchoBottomNav() {
  const pathname = usePathname();
  const { open: mobileMenuOpen } = useEchoMobileMenu();
  const [principal, setPrincipal] = useState<ClientPrincipalResult | { status: "loading" }>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    resolveClientPrincipal().then((result) => {
      if (!cancelled) setPrincipal(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (principal.status !== "signed_in") return null;
  if (mobileMenuOpen) return null;
  if (HIDDEN_PATHS.has(pathname)) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-10 flex items-stretch justify-around border-t lg:hidden"
      style={{ borderColor: "var(--surface-line)", background: "var(--midnight)" }}
    >
      {ITEMS.map((item) => {
        const basePath = item.href.split("#")[0];
        const active = pathname === basePath || pathname.startsWith(`${basePath}/`);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="flex flex-1 flex-col items-center gap-1 px-2 py-2.5 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
            style={{ color: active ? "var(--gold)" : "var(--text-dim)", outlineColor: "var(--gold)" }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
