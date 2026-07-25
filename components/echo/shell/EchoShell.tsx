"use client";

// The one place that decides whether a given path/host combination gets
// the Echo shell (header, footer, bottom nav) at all. Institutional pages
// (/, when the resolved site is institutional; /founder; /roadmap) and the
// admin surface (/admin/*, which renders its own AdminNav) render only
// their own children, exactly like the old components/SiteHeader.tsx's
// self-exclusion -- generalized here to be host-aware for `/`, since that
// path alone can be either experience depending on the resolved site.
import { usePathname } from "next/navigation";
import type { SiteId } from "@/lib/sites/registry";
import { EchoHeader } from "./EchoHeader";
import { EchoFooter } from "./EchoFooter";
import { EchoBottomNav } from "./EchoBottomNav";
import { EchoMobileMenuProvider } from "./EchoShellState";

function isInstitutionalOnlyPath(pathname: string): boolean {
  return pathname === "/founder" || pathname === "/roadmap";
}

export function EchoShell({ site, children }: { site: SiteId; children: React.ReactNode }) {
  const pathname = usePathname();

  const isEchoRoute =
    !pathname.startsWith("/admin") && !isInstitutionalOnlyPath(pathname) && !(pathname === "/" && site === "institutional");

  if (!isEchoRoute) return <>{children}</>;

  return (
    <EchoMobileMenuProvider>
      <EchoHeader />
      <div className="flex flex-1 flex-col pb-16 lg:pb-0">{children}</div>
      <EchoFooter />
      <EchoBottomNav />
    </EchoMobileMenuProvider>
  );
}
