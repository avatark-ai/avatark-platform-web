"use client";

// Echo's second-level nav: a compact, route-driven bar showing the active
// primary category's contextual destinations. Distinct from the old
// dropdown panels this replaces -- it occupies normal document flow (never
// overlays page content), is visible purely as a function of the current
// route (never opened/closed by hover), and is visually subordinate to the
// primary header (smaller type, a differentiated surface).
//
// Hidden entirely below the lg breakpoint -- mobile gets its destinations
// through EchoHeader's accordion drawer instead, per spec ("do not render
// the desktop second bar on narrow mobile widths").
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getActiveCategory, isContextLinkActive } from "@/lib/echo/nav";

const LINK_CLASS =
  "whitespace-nowrap rounded-sm px-1 py-1 text-xs font-medium tracking-tight transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const FOCUS_STYLE = { outlineColor: "var(--gold)" } as const;

export function EchoContextNav() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    function syncHash() {
      setHash(window.location.hash);
    }
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
    // Re-sync on every route change too, since navigating to a new hash on
    // the same page (e.g. Discover's anchors) doesn't always fire hashchange.
  }, [pathname]);

  const category = getActiveCategory(pathname);
  if (!category) return null;

  return (
    <div
      aria-label={`${category.label} navigation`}
      className="hidden border-b lg:block"
      style={{ borderColor: "var(--surface-line)", background: "color-mix(in srgb, var(--midnight) 92%, var(--surface))" }}
    >
      <nav
        aria-label={`${category.label} sections`}
        className="mx-auto flex max-w-6xl items-center gap-5 overflow-x-auto px-6 py-2.5"
      >
        {category.context.map((link) => {
          const active = isContextLinkActive(link, pathname, hash);
          return (
            <Link
              key={link.label}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={LINK_CLASS}
              style={{ color: active ? "var(--gold)" : "var(--text-dim)", ...FOCUS_STYLE }}
            >
              {link.label}
            </Link>
          );
        })}
        {category.attribution && (
          <span className="ml-auto whitespace-nowrap text-xs" style={{ color: "var(--text-dim)" }}>
            {category.attribution}
          </span>
        )}
      </nav>
    </div>
  );
}
