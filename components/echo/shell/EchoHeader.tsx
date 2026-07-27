"use client";

// Echo's primary nav -- a fixed six-category horizontal bar (no dropdowns,
// no overlay panels) plus a mobile accordion menu. The active category and
// its contextual destinations are rendered by the sibling EchoContextNav,
// not here; this component only owns the primary bar and the mobile
// drawer. Rendered from EchoShell, which has already decided this
// path/host combination should show it at all.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { resolveClientPrincipal, type ClientPrincipalResult } from "@/lib/auth/resolveClientPrincipal";
import { ACCOUNT_HREF, SIGN_IN_HREF, START_HERE_HREF } from "@/lib/echo/links";
import { getActiveCategory, PRIMARY_CATEGORIES, type EchoPrimaryCategory } from "@/lib/echo/nav";
import { useEchoMobileMenu } from "./EchoShellState";

const ACCOUNT_MOUNT_ENABLED = process.env.NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED === "true";

const LINK_CLASS =
  "rounded-sm text-sm font-medium tracking-tight transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const FOCUS_STYLE = { outlineColor: "var(--gold)" } as const;

function signInHref(currentPath: string): string {
  const url = new URL(SIGN_IN_HREF, "https://placeholder.invalid");
  url.searchParams.set("return", currentPath);
  return `${url.pathname}${url.search}`;
}

function MobileCategoryAccordion({
  category,
  open,
  onToggle,
  onNavigate,
  active,
}: {
  category: EchoPrimaryCategory;
  open: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  active: boolean;
}) {
  const panelId = `echo-mobile-panel-${category.id}`;

  return (
    <div className="border-b py-1" style={{ borderColor: "var(--surface-line)" }}>
      <div className="flex items-center justify-between">
        <Link
          href={category.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={`flex-1 py-2 text-left text-sm font-medium ${LINK_CLASS}`}
          style={{ color: active ? "var(--gold)" : "var(--paper)", ...FOCUS_STYLE }}
        >
          {category.label}
        </Link>
        <button
          type="button"
          className="rounded-sm p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: "var(--text-dim)", ...FOCUS_STYLE }}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? `Collapse ${category.label}` : `Expand ${category.label}`}
          onClick={onToggle}
        >
          <span aria-hidden="true" className="text-xs">
            {open ? "▲" : "▼"}
          </span>
        </button>
      </div>
      {open && (
        <div id={panelId} className="flex flex-col gap-1 pb-2 pl-3">
          {category.context.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={onNavigate}
              className="rounded-sm py-1.5 text-sm transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: "var(--text-dim)", ...FOCUS_STYLE }}
            >
              {link.label}
            </Link>
          ))}
          {category.attribution && (
            <p className="pt-1 text-xs" style={{ color: "var(--text-dim)" }}>
              {category.attribution}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function EchoHeader() {
  const pathname = usePathname();
  const [principal, setPrincipal] = useState<ClientPrincipalResult | { status: "loading" }>({ status: "loading" });
  const [openMobileCategoryId, setOpenMobileCategoryId] = useState<string | null>(null);
  const { open: mobileOpen, setOpen: setMobileOpen } = useEchoMobileMenu();

  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
    setOpenMobileCategoryId(null);
  }

  useEffect(() => {
    let cancelled = false;
    resolveClientPrincipal().then((result) => {
      if (!cancelled) setPrincipal(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMobileOpen(false);
      setOpenMobileCategoryId(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [setMobileOpen]);

  const signedIn = principal.status === "signed_in";
  const activeCategory = getActiveCategory(pathname);
  const closeMobile = () => setMobileOpen(false);

  return (
    <header style={{ borderBottom: "1px solid var(--surface-line)", background: "var(--midnight)" }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href={signedIn ? "/today" : "/"}
          className="rounded-sm text-base font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: "var(--paper)", ...FOCUS_STYLE }}
          onClick={closeMobile}
        >
          Echo
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {PRIMARY_CATEGORIES.map((category) => {
            const active = activeCategory?.id === category.id;
            return (
              <Link
                key={category.id}
                href={category.href}
                aria-current={active ? "page" : undefined}
                className={LINK_CLASS}
                style={{ color: active ? "var(--gold)" : "var(--paper)", ...FOCUS_STYLE }}
              >
                {category.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          {signedIn ? (
            ACCOUNT_MOUNT_ENABLED && (
              <Link href={ACCOUNT_HREF} className={LINK_CLASS} style={{ color: "var(--paper)", ...FOCUS_STYLE }}>
                Account
              </Link>
            )
          ) : principal.status !== "loading" ? (
            <>
              <Link href={signInHref(pathname)} className={LINK_CLASS} style={{ color: "var(--paper)", ...FOCUS_STYLE }}>
                Sign In
              </Link>
              <Link
                href={START_HERE_HREF}
                className="rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ background: "var(--gold)", color: "var(--midnight)", ...FOCUS_STYLE }}
              >
                Join Free
              </Link>
            </>
          ) : null}
        </div>

        <button
          type="button"
          className="rounded-sm lg:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-expanded={mobileOpen}
          aria-controls="echo-mobile-nav"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{ color: "var(--paper)", ...FOCUS_STYLE }}
        >
          <span aria-hidden="true">{mobileOpen ? "✕" : "☰"}</span>
        </button>
      </div>

      {mobileOpen && (
        <nav
          id="echo-mobile-nav"
          aria-label="Primary"
          className="flex max-h-[calc(100vh-4rem)] flex-col gap-1 overflow-y-auto border-t px-6 py-4 lg:hidden"
          style={{ borderColor: "var(--surface-line)" }}
        >
          {PRIMARY_CATEGORIES.map((category) => (
            <MobileCategoryAccordion
              key={category.id}
              category={category}
              active={activeCategory?.id === category.id}
              open={openMobileCategoryId === category.id}
              onToggle={() => setOpenMobileCategoryId((current) => (current === category.id ? null : category.id))}
              onNavigate={closeMobile}
            />
          ))}

          <div className="mt-3 flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--surface-line)" }}>
            {signedIn ? (
              ACCOUNT_MOUNT_ENABLED && (
                <Link href={ACCOUNT_HREF} onClick={closeMobile} className={`py-2 ${LINK_CLASS}`} style={{ color: "var(--paper)", ...FOCUS_STYLE }}>
                  Account
                </Link>
              )
            ) : principal.status !== "loading" ? (
              <>
                <Link href={signInHref(pathname)} onClick={closeMobile} className={`py-2 ${LINK_CLASS}`} style={{ color: "var(--gold)", ...FOCUS_STYLE }}>
                  Sign In
                </Link>
                <Link
                  href={START_HERE_HREF}
                  onClick={closeMobile}
                  className="mt-1 rounded-md px-4 py-2 text-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ background: "var(--gold)", color: "var(--midnight)", ...FOCUS_STYLE }}
                >
                  Join Free
                </Link>
              </>
            ) : null}
          </div>
        </nav>
      )}
    </header>
  );
}
