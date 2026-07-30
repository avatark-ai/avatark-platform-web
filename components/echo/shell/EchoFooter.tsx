import Link from "next/link";
import { ACCOUNT_HREF, START_HERE_HREF, WHY_AVATARK_HREF } from "@/lib/echo/links";

const LINK_CLASS =
  "rounded-sm text-sm transition-colors duration-200 hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const FOCUS_STYLE = { outlineColor: "var(--gold)" } as const;

const ACCOUNT_MOUNT_ENABLED = process.env.NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED === "true";

// Echo is an application, not a marketing site -- this is a compact
// closing strip, not a second navigation surface. Every real
// destination Echo has already lives in EchoHeader/EchoContextNav;
// this footer never repeats that list.
export function EchoFooter() {
  const accountHref = ACCOUNT_MOUNT_ENABLED ? ACCOUNT_HREF : "/account";

  return (
    <footer style={{ borderTop: "1px solid var(--surface-line)", background: "var(--midnight)" }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-sm">
          <p className="text-base font-semibold tracking-tight" style={{ color: "var(--paper)" }}>
            ECHO
          </p>
          <p className="mt-1 text-sm leading-6" style={{ color: "var(--text-dim)" }}>
            Every life leaves something worth carrying forward.
          </p>
        </div>

        <div className="flex flex-col gap-3 text-xs sm:items-end" style={{ color: "var(--text-dim)" }}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href={WHY_AVATARK_HREF} className={LINK_CLASS} style={{ color: "var(--text-dim)", ...FOCUS_STYLE }}>
              AvatarK
            </Link>
            <Link href={`${accountHref}?section=support`} className={LINK_CLASS} style={{ color: "var(--text-dim)", ...FOCUS_STYLE }}>
              Support
            </Link>
            <Link href={`${accountHref}?section=privacy`} className={LINK_CLASS} style={{ color: "var(--text-dim)", ...FOCUS_STYLE }}>
              Privacy
            </Link>
            <span>Terms</span>
            <span>Trust</span>
            <span>Accessibility</span>
            <span>© AvatarK</span>
          </div>

          <Link
            href={START_HERE_HREF}
            className="group inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-[transform,box-shadow,opacity] duration-200 ease-[var(--motion-ease-settle)] hover:-translate-y-0.5 hover:opacity-95 hover:shadow-[0_8px_20px_-8px_var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: "var(--gold)", color: "var(--midnight)", outlineColor: "var(--gold)" }}
          >
            Begin My Echo
            <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
