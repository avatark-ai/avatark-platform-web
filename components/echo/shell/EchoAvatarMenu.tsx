"use client";

// The one place Account lives in the top nav. Replaces the former
// standalone "Account" link in EchoHeader, which duplicated My Journey's
// own Account destination (see lib/echo/nav.ts's my-journey context,
// left untouched) -- Account now belongs inside this avatar/profile
// menu, never as a sibling of Begin/Discover/Practice/Community/Stories/
// My Journey. Independently resolves identity, same convention as
// EchoBottomNav and EchoHeader itself, rather than threading principal
// state through props.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSignedInIdentity } from "@/lib/auth/useSignedInIdentity";
import { avatarKPlatformAdapters } from "@/lib/account/adapters";
import { ACCOUNT_HREF } from "@/lib/echo/links";

const ACCOUNT_MOUNT_ENABLED = process.env.NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED === "true";
const FOCUS_STYLE = { outlineColor: "var(--gold)" } as const;

function initials(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function EchoAvatarMenu() {
  const identity = useSignedInIdentity();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (identity.status !== "signed_in") return null;

  async function handleSignOut() {
    setSigningOut(true);
    await avatarKPlatformAdapters.auth.signOut();
    window.location.href = "/auth/sign-in";
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${identity.displayName}`}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ color: "var(--paper)", ...FOCUS_STYLE }}
      >
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={{ background: "color-mix(in srgb, var(--gold) 22%, transparent)", color: "var(--gold)" }}
        >
          {initials(identity.displayName)}
        </span>
        <span className="hidden max-w-[8rem] truncate xl:inline">{identity.displayName}</span>
        <span aria-hidden="true" className="text-xs" style={{ color: "var(--text-dim)" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 z-20 mt-2 flex w-56 flex-col overflow-hidden rounded-xl border py-1.5 shadow-xl"
          style={{ borderColor: "var(--surface-line)", background: "var(--midnight)" }}
        >
          <p className="truncate px-4 py-2 text-xs" style={{ color: "var(--text-dim)" }}>
            {identity.email}
          </p>
          {ACCOUNT_MOUNT_ENABLED && (
            <Link
              href={ACCOUNT_HREF}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="px-4 py-2.5 text-left text-sm transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2"
              style={{ color: "var(--paper)", ...FOCUS_STYLE }}
            >
              Account
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="px-4 py-2.5 text-left text-sm transition-colors hover:text-[var(--gold)] disabled:opacity-50 focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-2"
            style={{ color: "var(--text-dim)", ...FOCUS_STYLE }}
          >
            {signingOut ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      )}
    </div>
  );
}
