import Link from "next/link";
import {
  ACCOUNT_HREF,
  COMMUNITY_HREF,
  CREATE_MY_ECHO_HREF,
  DISCOVER_HREF,
  ECOSYSTEM_HREF,
  ENTER_INVITATION_HREF,
  FOUNDER_LETTER_HREF,
  MY_JOURNEY_HREF,
  START_HERE_HREF,
  STORIES_HREF,
  TODAY_HREF,
  WHY_AVATARK_HREF,
} from "@/lib/echo/links";

const LINK_CLASS =
  "rounded-sm text-sm transition-colors hover:text-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const FOCUS_STYLE = { outlineColor: "var(--gold)" } as const;

const ACCOUNT_MOUNT_ENABLED = process.env.NEXT_PUBLIC_ACCOUNT_MOUNT_ENABLED === "true";

interface FooterLink {
  label: string;
  href: string | null;
}

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--gold)" }}>
        {title}
      </p>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {links.map((link) => (
          <li key={link.label}>
            {link.href ? (
              <Link href={link.href} className={LINK_CLASS} style={{ color: "var(--paper)", ...FOCUS_STYLE }}>
                {link.label}
              </Link>
            ) : (
              <span className="text-sm" style={{ color: "var(--text-dim)" }}>
                {link.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Secondary navigation, not a second application menu -- this deliberately
// does not repeat every context-navigation destination (see EchoHeader /
// EchoContextNav for the full set). Four compact columns instead of the
// previous seven, roughly halving footer height.
export function EchoFooter() {
  const beginLinks: FooterLink[] = [
    { label: "Start Here", href: START_HERE_HREF },
    { label: "Enter Invitation", href: ENTER_INVITATION_HREF },
    { label: "Create My Echo", href: CREATE_MY_ECHO_HREF },
  ];

  const exploreLinks: FooterLink[] = [
    { label: "Discover", href: DISCOVER_HREF },
    { label: "Practice", href: TODAY_HREF },
    { label: "Stories", href: STORIES_HREF },
    { label: "Community", href: COMMUNITY_HREF },
  ];

  const yourEchoLinks: FooterLink[] = [
    { label: "My Journey", href: MY_JOURNEY_HREF },
    { label: "Account", href: ACCOUNT_MOUNT_ENABLED ? ACCOUNT_HREF : null },
    { label: "Support", href: ACCOUNT_MOUNT_ENABLED ? `${ACCOUNT_HREF}?section=support` : null },
  ];

  const avatarkLinks: FooterLink[] = [
    { label: "Why AvatarK", href: WHY_AVATARK_HREF },
    { label: "Ecosystem", href: ECOSYSTEM_HREF },
    { label: "Founder Letter", href: FOUNDER_LETTER_HREF },
  ];

  return (
    <footer style={{ borderTop: "1px solid var(--surface-line)", background: "var(--midnight)" }}>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 max-w-md">
          <p className="text-base font-semibold tracking-tight" style={{ color: "var(--paper)" }}>
            ECHO
          </p>
          <p className="mt-1.5 text-sm leading-6" style={{ color: "var(--text-dim)" }}>
            Every life leaves something worth carrying forward.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <FooterColumn title="Begin" links={beginLinks} />
          <FooterColumn title="Explore" links={exploreLinks} />
          <FooterColumn title="Your Echo" links={yourEchoLinks} />
          <FooterColumn title="AvatarK" links={avatarkLinks} />
        </div>

        <div
          className="mt-6 flex flex-col gap-3 border-t pt-4 text-xs sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--surface-line)", color: "var(--text-dim)" }}
        >
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href={`${ACCOUNT_MOUNT_ENABLED ? ACCOUNT_HREF : "/account"}?section=privacy`} className={LINK_CLASS} style={{ color: "var(--text-dim)", ...FOCUS_STYLE }}>
              Privacy
            </Link>
            <span>Terms</span>
            <span>Trust</span>
            <span>Accessibility</span>
            <span>© 2026 AvatarK</span>
          </div>
          <Link
            href={START_HERE_HREF}
            className="rounded-sm text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: "var(--gold)", ...FOCUS_STYLE }}
          >
            Begin My Echo →
          </Link>
        </div>
      </div>
    </footer>
  );
}
