"use client";

// Echo's primary nav -- desktop dropdown menus + a mobile accordion menu,
// evolved from the previous components/SiteHeader.tsx (same self-exclusion
// pattern on /admin and on institutional-only paths, same principal
// resolution) but generalized to Echo's full nav structure. Rendered from
// EchoShell, which has already decided this path/host combination should
// show it at all.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { resolveClientPrincipal, type ClientPrincipalResult } from "@/lib/auth/resolveClientPrincipal";
import { ACCOUNT_HREF, SIGN_IN_HREF, START_HERE_HREF } from "@/lib/echo/links";
import { BEGIN_SECTION, ECHO_NAV_SECTIONS, TODAY_SECTION, type EchoNavSection } from "@/lib/echo/nav";
import { useEchoMobileMenu } from "./EchoShellState";

const ACCOUNT_MOUNT_ENABLED = process.env.NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED === "true";

const LINK_CLASS =
  "rounded-sm text-sm font-medium tracking-tight transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const FOCUS_STYLE = { outlineColor: "var(--gold)" } as const;

function visibleLinks(section: EchoNavSection): EchoNavSection["links"] {
  return section.links.filter((link) => !link.requiresAccountMount || ACCOUNT_MOUNT_ENABLED);
}

function DesktopDropdown({
  section,
  open,
  onToggle,
  onNavigate,
}: {
  section: EchoNavSection;
  open: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const links = visibleLinks(section);
  const panelId = `echo-nav-panel-${section.id}`;

  if (links.length === 0) {
    return (
      <Link href={section.href} className={LINK_CLASS} style={{ color: "var(--paper)", ...FOCUS_STYLE }}>
        {section.label}
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        className={`${LINK_CLASS} flex items-center gap-1`}
        style={{ color: "var(--paper)", ...FOCUS_STYLE }}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        {section.label}
        <span aria-hidden="true" className="text-xs">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          role="menu"
          aria-label={section.label}
          className="absolute left-0 top-full z-20 mt-2 flex min-w-[14rem] flex-col gap-1 rounded-md border p-3"
          style={{ borderColor: "var(--surface-line)", background: "var(--midnight)" }}
        >
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              role="menuitem"
              onClick={onNavigate}
              className="rounded-sm px-2 py-1.5 text-sm transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: "var(--paper)", ...FOCUS_STYLE }}
            >
              {link.label}
            </Link>
          ))}
          {section.attribution && (
            <p className="mt-1 border-t px-2 pt-2 text-xs" style={{ borderColor: "var(--surface-line)", color: "var(--text-dim)" }}>
              {section.attribution}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MobileAccordion({ section }: { section: EchoNavSection }) {
  const [open, setOpen] = useState(false);
  const links = visibleLinks(section);
  const panelId = `echo-mobile-panel-${section.id}`;

  if (links.length === 0) {
    return (
      <Link href={section.href} className={`py-2 ${LINK_CLASS}`} style={{ color: "var(--paper)", ...FOCUS_STYLE }}>
        {section.label}
      </Link>
    );
  }

  return (
    <div className="border-b py-1" style={{ borderColor: "var(--surface-line)" }}>
      <button
        type="button"
        className="flex w-full items-center justify-between py-2 text-left text-sm font-medium"
        style={{ color: "var(--paper)", ...FOCUS_STYLE }}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {section.label}
        <span aria-hidden="true" className="text-xs">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div id={panelId} className="flex flex-col gap-1 pb-2 pl-3">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-sm py-1.5 text-sm transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ color: "var(--text-dim)", ...FOCUS_STYLE }}
            >
              {link.label}
            </Link>
          ))}
          {section.attribution && (
            <p className="pt-1 text-xs" style={{ color: "var(--text-dim)" }}>
              {section.attribution}
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
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const { open: mobileOpen, setOpen: setMobileOpen } = useEchoMobileMenu();
  const navRef = useRef<HTMLDivElement>(null);

  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
    setOpenSectionId(null);
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
      setOpenSectionId(null);
      setMobileOpen(false);
    }
    function onClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpenSectionId(null);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [setMobileOpen]);

  const signedIn = principal.status === "signed_in";
  const firstSection = signedIn ? TODAY_SECTION : BEGIN_SECTION;
  const sections = [firstSection, ...ECHO_NAV_SECTIONS];
  const closeMobile = () => setMobileOpen(false);
  const closeAll = () => {
    setMobileOpen(false);
    setOpenSectionId(null);
  };

  return (
    <header style={{ borderBottom: "1px solid var(--surface-line)", background: "var(--midnight)" }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4" ref={navRef}>
        <Link
          href={signedIn ? "/today" : "/"}
          className="rounded-sm text-base font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: "var(--paper)", ...FOCUS_STYLE }}
          onClick={closeAll}
        >
          Echo
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {sections.map((section) => (
            <DesktopDropdown
              key={section.id}
              section={section}
              open={openSectionId === section.id}
              onToggle={() => setOpenSectionId((current) => (current === section.id ? null : section.id))}
              onNavigate={closeAll}
            />
          ))}
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
              <Link href={SIGN_IN_HREF} className={LINK_CLASS} style={{ color: "var(--paper)", ...FOCUS_STYLE }}>
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
          {sections.map((section) => (
            <MobileAccordion key={section.id} section={section} />
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
                <Link href={SIGN_IN_HREF} onClick={closeMobile} className={`py-2 ${LINK_CLASS}`} style={{ color: "var(--gold)", ...FOCUS_STYLE }}>
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
