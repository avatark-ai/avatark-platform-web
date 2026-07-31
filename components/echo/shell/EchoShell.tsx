"use client";

// The one place that decides whether a given path/host combination gets
// the Echo shell (header, footer, bottom nav) at all. Institutional pages
// (/, when the resolved site is institutional; /founder and its sub-routes;
// /foundation; /canon; /ecosystem; /roadmap), the admin surface
// (/admin/*, which renders its own AdminNav), the unlinked developer
// tooling under /dev/* (Integration Sprint RC1's dashboard/simulator --
// a developer tool, not a participant-facing Echo page), and the
// Integration Dashboard under /integration/* (an ecosystem-status view,
// same "not a participant journey page" reasoning as /dev) render only
// their own children, exactly like the old components/SiteHeader.tsx's
// self-exclusion -- generalized here to be host-aware for `/`, since that
// path alone can be either experience depending on the resolved site.
import { usePathname } from "next/navigation";
import type { SiteId } from "@/lib/sites/registry";
import { PageEnter } from "@avatark/motion";
import { EchoHeader } from "./EchoHeader";
import { EchoContextNav } from "./EchoContextNav";
import { EchoFooter } from "./EchoFooter";
import { EchoBottomNav } from "./EchoBottomNav";
import { EchoMobileMenuProvider } from "./EchoShellState";

function isInstitutionalOnlyPath(pathname: string): boolean {
  return (
    pathname === "/founder" ||
    pathname.startsWith("/founder/") ||
    pathname === "/foundation" ||
    pathname === "/canon" ||
    pathname.startsWith("/canon/") ||
    pathname === "/ecosystem" ||
    pathname === "/roadmap"
  );
}

export function EchoShell({ site, children }: { site: SiteId; children: React.ReactNode }) {
  const pathname = usePathname();

  const isEchoRoute =
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/dev") &&
    !pathname.startsWith("/integration") &&
    !isInstitutionalOnlyPath(pathname) &&
    !(pathname === "/" && site === "institutional");

  if (!isEchoRoute) return <>{children}</>;

  return (
    <EchoMobileMenuProvider>
      <a
        href="#echo-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-semibold"
        style={{ background: "var(--gold)", color: "var(--midnight)" }}
      >
        Skip to content
      </a>
      <EchoHeader />
      <EchoContextNav />
      <div
        id="echo-main-content"
        className="flex flex-1 flex-col pb-16 lg:pb-0"
        style={{ background: "var(--midnight)" }}
      >
        {/* Subtle page-entry settle -- the same EMERGE primitive/component
            institutional pages use, re-keyed per pathname so it also
            doubles as a small transition between sibling Echo routes.
            This wrapper (unlike its {children}) never unmounts between
            Echo routes, so its own midnight background -- not just each
            page's own <main> -- covers any gap during that swap. */}
        <PageEnter>{children}</PageEnter>
      </div>
      <EchoFooter />
      <EchoBottomNav />
    </EchoMobileMenuProvider>
  );
}
