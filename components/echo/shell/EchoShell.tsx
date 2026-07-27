"use client";

// The one place that decides whether a given path/host combination gets
// the Echo shell (header, footer, bottom nav) at all. Institutional pages
// (/, when the resolved site is institutional; /founder and its sub-routes;
// /foundation; /canon; /ecosystem; /roadmap) and the admin surface
// (/admin/*, which renders its own AdminNav) render only their own
// children, exactly like the old components/SiteHeader.tsx's
// self-exclusion -- generalized here to be host-aware for `/`, since that
// path alone can be either experience depending on the resolved site.
import { usePathname } from "next/navigation";
import type { SiteId } from "@/lib/sites/registry";
import { PageEnter } from "@/components/motion/PageEnter";
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
    !pathname.startsWith("/admin") && !isInstitutionalOnlyPath(pathname) && !(pathname === "/" && site === "institutional");

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
      <div id="echo-main-content" className="flex flex-1 flex-col pb-16 lg:pb-0">
        {/* Subtle page-entry settle -- the same EMERGE primitive/component
            institutional pages use, re-keyed per pathname so it also
            doubles as a small transition between sibling Echo routes. */}
        <PageEnter>{children}</PageEnter>
      </div>
      <EchoFooter />
      <EchoBottomNav />
    </EchoMobileMenuProvider>
  );
}
