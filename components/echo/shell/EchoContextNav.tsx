"use client";

// Echo's second-level nav: a compact, route-driven bar showing the active
// primary category's contextual destinations. Distinct from the old
// dropdown panels this replaces -- it occupies normal document flow (never
// overlays page content), is visible purely as a function of the current
// route (never opened/closed by hover), and is visually subordinate to the
// primary header (smaller type, a differentiated surface).
//
// Active state is derived from pathname + query string only (never a
// `#hash` or hover) -- see lib/echo/nav.ts's isContextLinkActive.
//
// Visible at every width as a single horizontally scrollable row (never a
// full-height mega menu): on mobile this IS the contextual nav, distinct
// from EchoHeader's accordion drawer (which covers switching between the
// six PRIMARY categories, not siblings within the current one).
import { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { getActiveCategory, isContextLinkActive } from "@/lib/echo/nav";

const LINK_CLASS =
  "whitespace-nowrap rounded-sm px-1 py-2.5 text-xs font-medium tracking-tight transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const FOCUS_STYLE = { outlineColor: "var(--gold)" } as const;

function EchoContextNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname, search]);

  const category = getActiveCategory(pathname);
  if (!category) return null;

  return (
    <div
      aria-label={`${category.label} navigation`}
      className="border-b"
      style={{ borderColor: "var(--surface-line)", background: "color-mix(in srgb, var(--midnight) 92%, var(--surface))" }}
    >
      <nav
        aria-label={`${category.label} sections`}
        className="mx-auto flex max-w-6xl items-center gap-5 overflow-x-auto px-6"
      >
        {category.context.map((link) => {
          const active = isContextLinkActive(link, pathname, search);
          return (
            <Link
              key={link.label}
              href={link.href}
              ref={active ? activeRef : undefined}
              aria-current={active ? "page" : undefined}
              className={LINK_CLASS}
              style={{ color: active ? "var(--gold)" : "var(--text-dim)", ...FOCUS_STYLE }}
            >
              {link.label}
            </Link>
          );
        })}
        {category.attribution && (
          <span className="ml-auto hidden whitespace-nowrap text-xs sm:inline" style={{ color: "var(--text-dim)" }}>
            {category.attribution}
          </span>
        )}
      </nav>
    </div>
  );
}

// useSearchParams requires a Suspense boundary -- EchoContextNav is
// mounted from EchoShell above every page's own content, so this
// boundary lives here rather than asking every route to provide one.
// Rendering nothing while resolving avoids any layout shift: the bar's
// height is owned by its border/padding, not by its content being ready.
export function EchoContextNav() {
  return (
    <Suspense fallback={null}>
      <EchoContextNavInner />
    </Suspense>
  );
}
